from __future__ import annotations

from math import isnan
from typing import Any

import numpy as np
import pandas as pd

from .data_service import get_dataframe, get_session, has_data


def _to_number(value: Any) -> float | None:
    if value is None:
        return None
    try:
        num = float(value)
        if isnan(num):
            return None
        return num
    except Exception:
        return None


def aggregate_yearly_series(df: pd.DataFrame) -> pd.DataFrame:
    if df.empty or "year" not in df.columns:
        return pd.DataFrame(columns=["year", "production", "target"])

    grouped = df.copy()
    grouped["year"] = pd.to_numeric(grouped["year"], errors="coerce")
    grouped = grouped.dropna(subset=["year"])
    grouped["year"] = grouped["year"].astype(int)

    agg_map = {"production": "sum"}
    if "target" in grouped.columns:
        agg_map["target"] = "sum"

    result = (
        grouped.groupby("year", as_index=False)
        .agg(agg_map)
        .sort_values("year")
        .reset_index(drop=True)
    )
    if "target" not in result.columns:
        result["target"] = np.nan
    return result


def _format_year(value: Any) -> int | None:
    try:
        return int(value)
    except Exception:
        return None


def production_series(filters: dict[str, Any] | None = None) -> dict[str, Any]:
    df = get_dataframe(filters)
    if df.empty:
        return {
            "has_data": False,
            "historical": [],
            "trend": [],
            "target": [],
            "production_by_mine": [],
            "production_by_mineral": [],
            "production_by_state": [],
            "production_by_district": [],
        }

    yearly = aggregate_yearly_series(df)
    historical = [
        {
            "year": _format_year(row.year),
            "production": round(float(row.production), 2) if pd.notna(row.production) else None,
            "target": round(float(row.target), 2) if "target" in yearly.columns and pd.notna(row.target) else None,
        }
        for row in yearly.itertuples(index=False)
    ]

    target = [
        {
            "year": item["year"],
            "actual": item["production"],
            "target": item["target"],
            "achievement": round((item["production"] / item["target"]) * 100, 2)
            if item["target"] not in (None, 0)
            else None,
        }
        for item in historical
        if item["target"] is not None
    ]

    def top_series(column: str, limit: int = 8) -> list[dict[str, Any]]:
        if column not in df.columns:
            return []
        series = (
            df.groupby(column, as_index=False)["production"]
            .sum()
            .sort_values("production", ascending=False)
            .head(limit)
        )
        return [
            {
                column: row[column],
                "production": round(float(row["production"]), 2),
            }
            for row in series.to_dict("records")
        ]

    return {
        "has_data": True,
        "historical": historical,
        "trend": [{"year": row["year"], "production": row["production"]} for row in historical],
        "target": target,
        "production_by_mine": top_series("mine"),
        "production_by_mineral": top_series("mineral"),
        "production_by_state": top_series("state"),
        "production_by_district": top_series("district"),
    }


def kpis(filters: dict[str, Any] | None = None) -> dict[str, Any]:
    df = get_dataframe(filters)
    if df.empty or "production" not in df.columns:
        return {
            "has_data": False,
            "total_production": 0,
            "average_production": 0,
            "latest_production": 0,
            "growth_pct": None,
            "target_achievement_pct": None,
            "highest_production_year": None,
            "lowest_production_year": None,
            "mine_count": 0,
            "mineral_count": 0,
            "state_count": 0,
            "district_count": 0,
            "anomaly_count": 0,
            "quality_score": get_session().quality.get("quality_score", 0),
        }

    yearly = aggregate_yearly_series(df)
    yearly = yearly.dropna(subset=["production"])
    total = float(df["production"].sum())
    average = float(df["production"].mean())

    latest_row = yearly.iloc[-1] if not yearly.empty else None
    prev_row = yearly.iloc[-2] if len(yearly) > 1 else None
    latest = float(latest_row["production"]) if latest_row is not None else 0.0
    previous = float(prev_row["production"]) if prev_row is not None else None
    growth_pct = ((latest - previous) / previous * 100.0) if previous not in (None, 0) else None

    target_achievement_pct = None
    if "target" in yearly.columns and yearly["target"].notna().any() and latest_row is not None:
        latest_target = _to_number(latest_row.get("target"))
        if latest_target not in (None, 0):
            target_achievement_pct = round((latest / latest_target) * 100.0, 2)

    highest_year = None
    lowest_year = None
    if not yearly.empty:
        highest_year = int(yearly.loc[yearly["production"].idxmax(), "year"])
        lowest_year = int(yearly.loc[yearly["production"].idxmin(), "year"])

    from .anomaly import detect_anomalies

    anomaly_count = len(detect_anomalies(df)["anomalies"])
    session_quality = get_session().quality.get("quality_score", 0)

    return {
        "has_data": True,
        "total_production": round(total, 2),
        "average_production": round(average, 2),
        "latest_production": round(latest, 2),
        "latest_year": int(latest_row["year"]) if latest_row is not None else None,
        "growth_pct": round(growth_pct, 2) if growth_pct is not None else None,
        "target_achievement_pct": round(target_achievement_pct, 2) if target_achievement_pct is not None else None,
        "highest_production_year": highest_year,
        "lowest_production_year": lowest_year,
        "mine_count": int(df["mine"].nunique(dropna=True)) if "mine" in df.columns else 0,
        "mineral_count": int(df["mineral"].nunique(dropna=True)) if "mineral" in df.columns else 0,
        "state_count": int(df["state"].nunique(dropna=True)) if "state" in df.columns else 0,
        "district_count": int(df["district"].nunique(dropna=True)) if "district" in df.columns else 0,
        "anomaly_count": anomaly_count,
        "quality_score": session_quality,
    }


def data_quality(filters: dict[str, Any] | None = None) -> dict[str, Any]:
    session = get_session()
    base = dict(session.quality)

    if not filters:
        return {"has_data": has_data(), **base}

    # duplicates/invalid_numeric_values/quality_score describe the original
    # upload's cleanliness and can't be meaningfully recomputed on an
    # already-deduplicated filtered slice - keep those as the whole-dataset
    # figures. Everything else genuinely does depend on the filter, so
    # recompute it fresh from the filtered rows.
    import pandas as pd

    from .data_service import get_dataframe

    df = get_dataframe(filters)
    row_count = int(df.shape[0])
    column_count = int(df.shape[1])
    missing_values = int(df.isna().sum().sum()) if row_count else 0
    year_series = pd.to_numeric(df["year"], errors="coerce") if "year" in df.columns else None
    year_min = int(year_series.min()) if year_series is not None and year_series.notna().any() else None
    year_max = int(year_series.max()) if year_series is not None and year_series.notna().any() else None

    return {
        "has_data": has_data(),
        **base,
        "rows": row_count,
        "columns": column_count,
        "missing_values": missing_values,
        "year_range": [year_min, year_max] if year_min is not None and year_max is not None else None,
        "mines": int(df["mine"].nunique(dropna=True)) if "mine" in df.columns else 0,
        "minerals": int(df["mineral"].nunique(dropna=True)) if "mineral" in df.columns else 0,
        "states": int(df["state"].nunique(dropna=True)) if "state" in df.columns else 0,
        "districts": int(df["district"].nunique(dropna=True)) if "district" in df.columns else 0,
    }


def filters_meta() -> dict[str, Any]:
    from .data_service import get_filter_options

    return get_filter_options()
