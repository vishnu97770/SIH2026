from __future__ import annotations

from app.services.data_service import get_session
from app.services.forecast import train_forecast_model


def main() -> None:
    session = get_session()
    print("Training Production Forecast Model...")
    if session.clean_df.empty:
        print("No dataset is currently loaded. Upload a dataset first or load the demo dataset.")
        return

    print(f"Dataset: {len(session.clean_df)} rows")
    artifact = train_forecast_model(session.clean_df, force=True)
    if artifact.get("status") == "insufficient_data":
        print(artifact["message"])
        return

    print("Models evaluated:")
    print("Linear Trend")
    print("Drift")
    print("Moving Average")
    print(f"Best Model: {artifact['model_name']}")
    metrics = artifact.get("metrics", {})
    print(f"MAE: {metrics.get('mae')}")
    print(f"RMSE: {metrics.get('rmse')}")
    if metrics.get("mape") is not None:
        print(f"MAPE: {metrics.get('mape')}")
    print("Saved:")
    print("models/production_forecaster.pkl")


if __name__ == "__main__":
    main()

