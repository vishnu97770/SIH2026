from __future__ import annotations

import json
import os
from typing import Any

import pandas as pd

try:
    from groq import Groq
except Exception:  # pragma: no cover - optional dependency guard
    Groq = None

from ..config import settings
from .analytics import aggregate_yearly_series, kpis, production_series
from .anomaly import detect_anomalies
from .data_service import get_dataframe, get_filter_options, get_session, has_data, save_chat_turn
from .forecast import forecast


def _safe_json(data: Any) -> str:
    return json.dumps(data, indent=2, ensure_ascii=False, default=str)


def _top_context_rows(df: pd.DataFrame, limit: int = 8) -> list[dict[str, Any]]:
    if df.empty:
        return []
    cols = [c for c in ["year", "mine", "mineral", "state", "district", "production", "target"] if c in df.columns]
    return df[cols].head(limit).to_dict("records")


def _build_context(question: str, df: pd.DataFrame) -> dict[str, Any]:
    lower = question.lower()
    production = production_series()
    indicators = kpis()
    anomaly_pack = detect_anomalies(df)
    forecast_pack = forecast(horizon=3)
    yearly = aggregate_yearly_series(df)

    context: dict[str, Any] = {
        "question": question,
        "dataset_summary": {
            "rows": int(df.shape[0]),
            "columns": list(df.columns),
            "year_range": [int(yearly["year"].min()), int(yearly["year"].max())] if not yearly.empty else None,
            "mines": int(df["mine"].nunique(dropna=True)) if "mine" in df.columns else 0,
            "minerals": int(df["mineral"].nunique(dropna=True)) if "mineral" in df.columns else 0,
            "states": int(df["state"].nunique(dropna=True)) if "state" in df.columns else 0,
        },
        "kpis": indicators,
        "production_trend": production.get("historical", []),
        "anomalies": anomaly_pack,
        "forecast": forecast_pack,
        "filter_options": get_filter_options(),
        "recent_rows": _top_context_rows(df),
    }

    # Provide direct answer hooks for common analytical intents.
    if "highest" in lower or "top" in lower:
        if "mine" in lower and "mine" in df.columns:
            top_mine = (
                df.groupby("mine", as_index=False)["production"].sum().sort_values("production", ascending=False).head(1)
            )
            context["direct_answer"] = (
                f"Highest-production mine: {top_mine.iloc[0]['mine']} with {float(top_mine.iloc[0]['production']):.2f}."
                if not top_mine.empty
                else None
            )
    elif "forecast" in lower or "predict" in lower:
        context["direct_answer"] = _safe_json(forecast_pack.get("forecast", []))
    elif ("why" in lower or "latest" in lower) and ("anomal" in lower or "decrease" in lower or "drop" in lower or "fall" in lower or "decline" in lower):
        latest = indicators.get("latest_production")
        latest_year = indicators.get("latest_year")
        growth = indicators.get("growth_pct")
        previous = None
        if latest is not None and growth is not None and growth != -100:
            previous = latest / (1 + (growth / 100))
        if growth is not None and growth >= 0:
            context["direct_answer"] = (
                f"Production did not fall in {latest_year}. It increased by {growth}% "
                f"from approximately {previous:,.0f} in {latest_year - 1} to {latest:,.0f} in {latest_year}."
            )
        elif latest is not None and growth is not None:
            context["direct_answer"] = (
                f"Production fell by {abs(growth)}% in {latest_year}, from approximately "
                f"{previous:,.0f} in {latest_year - 1} to {latest:,.0f}. The dataset does not include "
                "operational cause fields, so it cannot identify why the decline occurred."
            )
    elif "anomal" in lower or "decrease" in lower or "drop" in lower or "fall" in lower or "decline" in lower:
        context["direct_answer"] = _safe_json(anomaly_pack.get("primary"))

    return context


def _fallback_answer(question: str, context: dict[str, Any]) -> str:
    direct = context.get("direct_answer")
    if direct:
        return f"Here is the grounded answer based on the uploaded dataset:\n\n{direct}"

    k = context["kpis"]
    forecast_pack = context["forecast"]
    anomaly_pack = context["anomalies"]
    production = context["production_trend"]

    if not context["dataset_summary"]["rows"]:
        return "No dataset is currently uploaded. Please upload a CSV or Excel file first."

    pieces = [
        f"The dataset contains {context['dataset_summary']['rows']} rows across {context['dataset_summary']['columns']} columns.",
        f"Latest production is {k['latest_production']} in {k.get('latest_year')}.",
    ]
    if k.get("growth_pct") is not None:
        pieces.append(f"Year-over-year growth is {k['growth_pct']}%.")
    if k.get("target_achievement_pct") is not None:
        pieces.append(f"Target achievement is {k['target_achievement_pct']}%.")
    if anomaly_pack.get("primary"):
        pieces.append(
            f"The primary anomaly is in {anomaly_pack['primary']['year']} with a {anomaly_pack['primary']['deviation_pct']}% deviation."
        )
    if forecast_pack.get("forecast"):
        first = forecast_pack["forecast"][0]
        pieces.append(
            f"The next forecast year is {first['year']} at {first['predicted_production']} with bounds {first['lower_bound']} to {first['upper_bound']}."
        )
    if production:
        pieces.append(f"Historical trend spans {production[0]['year']} to {production[-1]['year']}.")
    return " ".join(pieces)


def _groq_client() -> Groq | None:
    if Groq is None or not settings.groq_api_key:
        return None
    return Groq(api_key=settings.groq_api_key)


def answer_question(question: str) -> dict[str, Any]:
    question = (question or "").strip()
    if not question:
        return {
            "answer": "Please enter a question.",
            "citations": [],
            "grounding": {"score": 0, "percent": 0, "label": "None", "method": "Validation", "evidenceCount": 0},
        }

    if not has_data():
        return {
            "answer": "No dataset is currently uploaded. Please upload a CSV or Excel file first.",
            "citations": [],
            "grounding": {"score": 0, "percent": 0, "label": "None", "method": "No dataset", "evidenceCount": 0},
        }

    df = get_dataframe()
    context = _build_context(question, df)
    system_prompt = (
        "You are the Mine Intelligence Platform assistant. "
        "Use only the supplied structured context. "
        "Do not invent values, causes, or statistics. "
        "If the context does not support an answer, say that clearly. "
        "Separate calculated facts from interpretation."
    )

    client = _groq_client()
    if not client:
        answer = _fallback_answer(question, context)
        grounding = {"score": 0.72, "percent": 72, "label": "Structured", "method": "Python analytics only", "evidenceCount": 1}
        citations = [
            {
                "document": "Uploaded Dataset",
                "page": 1,
                "snippet": "Grounded analytics context computed from the uploaded dataset.",
                "retrievalScore": 0.99,
            }
        ]
        save_chat_turn("user", question)
        save_chat_turn("assistant", answer)
        return {"answer": answer, "citations": citations, "grounding": grounding, "context": context}

    try:
        history = get_session().chat_history[-settings.assistant_history_limit :]
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "system", "content": f"Structured context:\n{_safe_json(context)}"},
        ]
        for item in history:
            messages.append({"role": item["role"], "content": item["content"]})
        messages.append({"role": "user", "content": question})

        response = client.chat.completions.create(
            model=settings.groq_model,
            messages=messages,
            temperature=0.2,
        )
        answer = response.choices[0].message.content.strip()
        save_chat_turn("user", question)
        save_chat_turn("assistant", answer)
        citations = [
            {
                "document": "Uploaded Dataset",
                "page": 1,
                "snippet": "Structured analytics context from the uploaded dataset.",
                "retrievalScore": 0.99,
            }
        ]
        return {
            "answer": answer,
            "citations": citations,
            "grounding": {
                "score": 0.9,
                "percent": 90,
                "label": "High",
                "method": "Python analytics + Groq",
                "evidenceCount": len(citations),
            },
            "context": context,
        }
    except Exception as exc:
        answer = _fallback_answer(question, context)
        save_chat_turn("user", question)
        save_chat_turn("assistant", answer)
        return {
            "answer": f"{answer}\n\nGroq was unavailable, so this fallback response was generated locally. Details: {exc}",
            "citations": [
                {
                    "document": "Uploaded Dataset",
                    "page": 1,
                    "snippet": "Structured analytics context from the uploaded dataset.",
                    "retrievalScore": 0.99,
                }
            ],
            "grounding": {
                "score": 0.7,
                "percent": 70,
                "label": "Fallback",
                "method": "Python analytics fallback",
                "evidenceCount": 1,
            },
            "context": context,
        }

