from __future__ import annotations

import math
import pickle
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

import numpy as np
import pandas as pd

from ..config import settings
from .analytics import aggregate_yearly_series
from .data_service import get_dataframe, get_session, set_last_model
from .user_context import forecast_model_path


@dataclass
class ForecastModelResult:
    model_name: str
    metrics: dict[str, float]
    forecast: list[dict[str, Any]]
    historical: list[dict[str, Any]]
    residual_std: float
    artifact: dict[str, Any]


def _metrics(y_true: np.ndarray, y_pred: np.ndarray) -> dict[str, float]:
    errors = y_true - y_pred
    mae = float(np.mean(np.abs(errors)))
    rmse = float(np.sqrt(np.mean(np.square(errors))))
    denom = np.where(np.abs(y_true) < 1e-9, np.nan, np.abs(y_true))
    mape = float(np.nanmean(np.abs(errors / denom)) * 100.0)
    return {
        "mae": round(mae, 4),
        "rmse": round(rmse, 4),
        "mape": round(mape, 4) if not np.isnan(mape) else None,
    }


def _predict_linear(train_years: np.ndarray, train_values: np.ndarray, years: np.ndarray) -> tuple[np.ndarray, dict[str, Any]]:
    slope, intercept = np.polyfit(train_years.astype(float), train_values.astype(float), 1)
    preds = slope * years.astype(float) + intercept
    return preds, {"slope": float(slope), "intercept": float(intercept)}


def _predict_drift(train_years: np.ndarray, train_values: np.ndarray, years: np.ndarray) -> tuple[np.ndarray, dict[str, Any]]:
    diffs = np.diff(train_values.astype(float))
    avg_step = float(np.mean(diffs)) if len(diffs) else 0.0
    start_value = float(train_values[-1])
    steps = years.astype(float) - float(train_years[-1])
    preds = start_value + (steps * avg_step)
    return preds, {"avg_step": avg_step, "last_value": start_value}


def _predict_moving_average(train_years: np.ndarray, train_values: np.ndarray, years: np.ndarray, window: int = 3) -> tuple[np.ndarray, dict[str, Any]]:
    history = train_values.astype(float).tolist()
    preds = []
    for _ in years:
        window_values = history[-window:]
        pred = float(np.mean(window_values)) if window_values else float(history[-1])
        preds.append(pred)
        history.append(pred)
    return np.array(preds, dtype=float), {"window": window}


def _evaluate_candidate(
    name: str,
    train_years: np.ndarray,
    train_values: np.ndarray,
    val_years: np.ndarray,
    val_values: np.ndarray,
) -> dict[str, Any]:
    if name == "linear_trend":
        preds, params = _predict_linear(train_years, train_values, val_years)
    elif name == "drift":
        preds, params = _predict_drift(train_years, train_values, val_years)
    elif name == "moving_average":
        preds, params = _predict_moving_average(train_years, train_values, val_years)
    else:
        raise ValueError(f"Unknown model: {name}")

    return {
        "name": name,
        "params": params,
        "metrics": _metrics(val_values, preds),
        "predictions": preds,
    }


def _select_model(years: np.ndarray, values: np.ndarray) -> dict[str, Any]:
    n = len(values)
    if n < 4:
        if n >= 2:
            preds, params = _predict_drift(years[:-1], values[:-1], years[-1:])
            baseline = np.full(n, float(values[-1]), dtype=float)
            if n >= 3:
                baseline = np.interp(years, years[:-1], values[:-1], left=values[0], right=values[-1])
            residuals = values - baseline
            metrics = _metrics(np.array([values[-1]]), preds)
        else:
            preds = np.array([values[-1]], dtype=float)
            params = {"avg_step": 0.0, "last_value": float(values[-1])}
            residuals = np.array([0.0], dtype=float)
            metrics = {"mae": 0.0, "rmse": 0.0, "mape": None}
        return {
            "name": "baseline_drift",
            "params": params,
            "metrics": metrics,
            "residual_std": float(np.std(residuals)) if residuals.size else 0.0,
        }

    test_size = max(2, int(math.ceil(n * 0.2)))
    test_size = min(test_size, n - 2)
    train_size = n - test_size
    train_years = years[:train_size]
    train_values = values[:train_size]
    val_years = years[train_size:]
    val_values = values[train_size:]

    candidates = [
        _evaluate_candidate("linear_trend", train_years, train_values, val_years, val_values),
        _evaluate_candidate("drift", train_years, train_values, val_years, val_values),
        _evaluate_candidate("moving_average", train_years, train_values, val_years, val_values),
    ]
    ranked = sorted(candidates, key=lambda item: (item["metrics"]["mae"], item["metrics"]["rmse"]))
    best = ranked[0]

    if best["name"] == "linear_trend":
        _, params = _predict_linear(years, values, years)
        full_preds = _predict_linear(years, values, years)[0]
    elif best["name"] == "drift":
        _, params = _predict_drift(years, values, years)
        full_preds = _predict_drift(years, values, years)[0]
    else:
        _, params = _predict_moving_average(years, values, years)
        full_preds = _predict_moving_average(years, values, years)[0]

    residuals = values - full_preds
    residual_std = float(np.std(residuals, ddof=0)) if len(residuals) > 1 else float(np.std(values) * 0.15)
    best_model = {
        "name": best["name"],
        "params": params,
        "metrics": best["metrics"],
        "residual_std": residual_std,
    }
    return best_model


def _load_artifact() -> dict[str, Any] | None:
    model_path = forecast_model_path()
    if not model_path.exists():
        return None
    try:
        with model_path.open("rb") as fh:
            return pickle.load(fh)
    except Exception:
        return None


def _save_artifact(artifact: dict[str, Any]) -> None:
    model_path = forecast_model_path()
    model_path.parent.mkdir(parents=True, exist_ok=True)
    with model_path.open("wb") as fh:
        pickle.dump(artifact, fh)


def train_forecast_model(df: pd.DataFrame | None = None, force: bool = True) -> dict[str, Any]:
    session = get_session()
    if df is None:
        df = session.clean_df
    if df.empty:
        return {
            "status": "insufficient_data",
            "message": "No uploaded dataset is available for forecasting.",
        }

    yearly = aggregate_yearly_series(df).dropna(subset=["production"])
    if len(yearly) < 4:
        artifact = {
            "model_name": "baseline_drift",
            "params": {},
            "metrics": {"mae": None, "rmse": None, "mape": None},
            "residual_std": float(yearly["production"].std(ddof=0)) if len(yearly) > 1 else 0.0,
            "session_id": session.session_id,
            "trained_at": datetime.now(timezone.utc).isoformat(),
            "years": yearly["year"].astype(int).tolist(),
            "values": yearly["production"].astype(float).tolist(),
            "warning": "Insufficient history for model selection. Using a drift baseline.",
        }
        _save_artifact(artifact)
        set_last_model({"model_name": artifact["model_name"], "metrics": artifact["metrics"], "trained_at": artifact["trained_at"]})
        return artifact

    years = yearly["year"].astype(float).to_numpy()
    values = yearly["production"].astype(float).to_numpy()
    best = _select_model(years, values)
    artifact = {
        "model_name": best["name"],
        "params": best["params"],
        "metrics": best["metrics"],
        "residual_std": best["residual_std"],
        "session_id": session.session_id,
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "years": yearly["year"].astype(int).tolist(),
        "values": yearly["production"].astype(float).tolist(),
    }
    _save_artifact(artifact)
    set_last_model({"model_name": artifact["model_name"], "metrics": artifact["metrics"], "trained_at": artifact["trained_at"]})
    return artifact


def _predict_future_from_artifact(artifact: dict[str, Any], future_years: np.ndarray) -> np.ndarray:
    years = np.array(artifact.get("years", []), dtype=float)
    values = np.array(artifact.get("values", []), dtype=float)
    model_name = artifact.get("model_name")

    if model_name == "linear_trend":
        slope = float(artifact["params"]["slope"])
        intercept = float(artifact["params"]["intercept"])
        return slope * future_years.astype(float) + intercept
    if model_name == "drift":
        avg_step = float(artifact["params"]["avg_step"])
        last_value = float(values[-1]) if len(values) else 0.0
        steps = future_years.astype(float) - float(years[-1]) if len(years) else np.arange(1, len(future_years) + 1)
        return last_value + (steps * avg_step)
    if model_name == "moving_average":
        window = int(artifact["params"].get("window", 3))
        history = values.tolist()
        preds = []
        for _ in future_years:
            window_values = history[-window:]
            pred = float(np.mean(window_values)) if window_values else float(history[-1])
            preds.append(pred)
            history.append(pred)
        return np.array(preds, dtype=float)

    if len(values):
        return np.full(len(future_years), float(values[-1]), dtype=float)
    return np.zeros(len(future_years), dtype=float)


def forecast(horizon: int = 3, filters: dict[str, Any] | None = None) -> dict[str, Any]:
    df = get_dataframe(filters)
    if df.empty:
        return {
            "has_data": False,
            "historical": [],
            "forecast": [],
            "model": None,
            "metrics": {},
            "message": "Upload a dataset to generate a forecast.",
        }

    yearly = aggregate_yearly_series(df).dropna(subset=["production"])
    if yearly.empty:
        return {
            "has_data": False,
            "historical": [],
            "forecast": [],
            "model": None,
            "metrics": {},
            "message": "The dataset does not contain enough production history.",
        }

    session = get_session()
    artifact = _load_artifact()
    if not artifact or artifact.get("session_id") != session.session_id:
        artifact = train_forecast_model(df)

    years = yearly["year"].astype(int).to_numpy()
    values = yearly["production"].astype(float).to_numpy()
    historical = [
        {"year": int(year), "production": round(float(value), 2)}
        for year, value in zip(years, values)
    ]

    last_year = int(years[-1])
    future_years = np.arange(last_year + 1, last_year + horizon + 1)
    future_values = _predict_future_from_artifact(artifact, future_years)
    residual_std = float(artifact.get("residual_std") or np.std(values) * 0.12 or 1.0)
    band = max(residual_std * 1.64, 1.0)

    forecast_rows = []
    for year, value in zip(future_years, future_values):
        forecast_rows.append(
            {
                "year": int(year),
                "predicted_production": round(float(value), 2),
                "lower_bound": round(float(value - band), 2),
                "upper_bound": round(float(value + band), 2),
            }
        )

    return {
        "has_data": True,
        "historical": historical,
        "forecast": forecast_rows,
        "model": artifact.get("model_name"),
        "metrics": artifact.get("metrics", {}),
        "trained_at": artifact.get("trained_at"),
        "warning": artifact.get("warning"),
    }
