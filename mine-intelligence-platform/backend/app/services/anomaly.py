from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd

from .analytics import aggregate_yearly_series


def _severity_from_score(deviation_pct: float, score: float) -> str:
    abs_dev = abs(deviation_pct)
    if abs_dev >= 35 or score >= 0.9:
        return "CRITICAL"
    if abs_dev >= 22 or score >= 0.75:
        return "HIGH"
    if abs_dev >= 12 or score >= 0.6:
        return "MEDIUM"
    if abs_dev >= 8 or score >= 0.45:
        return "LOW"
    return "LOW"


def _expected_series(years: np.ndarray, production: np.ndarray) -> np.ndarray:
    x = years.astype(float)
    y = production.astype(float)

    if len(y) == 1:
        return np.array([y[0]], dtype=float)

    if len(y) >= 2:
        slope, intercept = np.polyfit(x, y, 1)
        linear = slope * x + intercept
    else:
        linear = np.full_like(y, y.mean(), dtype=float)

    rolling = pd.Series(y).shift(1).rolling(window=min(3, len(y)), min_periods=1).mean().to_numpy()
    if np.isnan(rolling).all():
        rolling = np.full_like(y, y.mean(), dtype=float)
    rolling = np.nan_to_num(rolling, nan=float(np.nanmean(y)))

    return 0.55 * rolling + 0.45 * linear


def detect_anomalies(df: pd.DataFrame, target_available: bool | None = None) -> dict[str, Any]:
    if df.empty or "production" not in df.columns or "year" not in df.columns:
        return {
            "has_data": False,
            "anomalies": [],
            "timeline": [],
            "primary": None,
            "summary": {
                "count": 0,
                "high_count": 0,
                "critical_count": 0,
            },
        }

    yearly = aggregate_yearly_series(df)
    yearly = yearly.dropna(subset=["production"]).copy()
    if yearly.empty:
        return {
            "has_data": False,
            "anomalies": [],
            "timeline": [],
            "primary": None,
            "summary": {
                "count": 0,
                "high_count": 0,
                "critical_count": 0,
            },
        }

    years = yearly["year"].astype(int).to_numpy()
    production = yearly["production"].astype(float).to_numpy()
    expected = _expected_series(years, production)
    residuals = production - expected
    resid_std = float(np.nanstd(residuals, ddof=0)) or 1.0

    timeline: list[dict[str, Any]] = []
    anomalies: list[dict[str, Any]] = []

    for idx, year in enumerate(years):
        actual = float(production[idx])
        exp = float(expected[idx])
        prev_actual = float(production[idx - 1]) if idx > 0 else None
        yoy_change = ((actual - prev_actual) / prev_actual * 100.0) if prev_actual not in (None, 0) else None
        deviation_pct = ((actual - exp) / exp * 100.0) if exp not in (None, 0) else 0.0
        residual_z = abs(residuals[idx]) / resid_std if resid_std else 0.0
        score = max(
            min(abs(deviation_pct) / 40.0, 1.0),
            min(residual_z / 3.0, 1.0),
        )
        severity = _severity_from_score(deviation_pct, score)

        target_deviation = None
        if target_available and "target" in yearly.columns and pd.notna(yearly.iloc[idx].get("target")):
            target_value = float(yearly.iloc[idx]["target"])
            if target_value:
                target_deviation = ((actual - target_value) / target_value) * 100.0

        row = {
            "year": int(year),
            "actual": round(actual, 2),
            "expected": round(exp, 2),
            "anomaly_score": round(score, 3),
            "severity": severity,
            "deviation_pct": round(deviation_pct, 2),
            "previous_year": round(prev_actual, 2) if prev_actual is not None else None,
            "yoy_change_pct": round(yoy_change, 2) if yoy_change is not None else None,
            "target_deviation_pct": round(target_deviation, 2) if target_deviation is not None else None,
        }
        timeline.append(row)

        if severity in {"MEDIUM", "HIGH", "CRITICAL"}:
            reason_bits = [
                f"Production in {int(year)} was {abs(deviation_pct):.1f}% {'below' if deviation_pct < 0 else 'above'} the expected level",
            ]
            if yoy_change is not None:
                reason_bits.append(
                    f"and {abs(yoy_change):.1f}% {'below' if yoy_change < 0 else 'above'} the previous year's production"
                )
            if target_deviation is not None:
                reason_bits.append(
                    f"with a {abs(target_deviation):.1f}% {'shortfall' if target_deviation < 0 else 'surplus'} versus target"
                )

            anomalies.append(
                {
                    **row,
                    "reason": ". ".join(reason_bits) + ".",
                    "context": {
                        "actual": round(actual, 2),
                        "expected": round(exp, 2),
                        "deviation_pct": round(deviation_pct, 2),
                        "previous_year": round(prev_actual, 2) if prev_actual is not None else None,
                        "yoy_change_pct": round(yoy_change, 2) if yoy_change is not None else None,
                        "target_deviation_pct": round(target_deviation, 2) if target_deviation is not None else None,
                    },
                }
            )

    anomalies = sorted(anomalies, key=lambda item: (item["anomaly_score"], abs(item["deviation_pct"])), reverse=True)
    primary = anomalies[0] if anomalies else None
    summary = {
        "count": len(anomalies),
        "high_count": sum(1 for item in anomalies if item["severity"] == "HIGH"),
        "critical_count": sum(1 for item in anomalies if item["severity"] == "CRITICAL"),
        "medium_count": sum(1 for item in anomalies if item["severity"] == "MEDIUM"),
        "low_count": sum(1 for item in anomalies if item["severity"] == "LOW"),
    }

    return {
        "has_data": True,
        "timeline": timeline,
        "anomalies": anomalies,
        "primary": primary,
        "summary": summary,
    }

