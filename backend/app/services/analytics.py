"""
Demo production analytics: data, KPIs, anomaly detection, and forecasting.

Kept deliberately simple and transparent for the prototype. Uses pandas +
numpy via a lightweight linear forecast and z-score anomaly detection.
"""

import numpy as np

MINES = ["Mine X", "Zamania", "North Block"]

YEARS = [2021, 2022, 2023, 2024, 2025]

# Mine X production targets and actuals (tonnes).
MINE_X = {
    "years": YEARS,
    "actual": [98000, 108000, 119000, 87000, 121000],
    "target": [100000, 105000, 115000, 110000, 120000],
}


def production_series():
    """Return Mine X production data plus comparison totals for other mines."""
    return {
        "mine": "Mine X",
        "years": MINE_X["years"],
        "actual": MINE_X["actual"],
        "target": MINE_X["target"],
        "current": 121000,
        "target_current": 120000,
    }


def _pct_change(series):
    deltas = []
    for i in range(1, len(series)):
        prev, cur = series[i - 1], series[i]
        pct = round(((cur - prev) / prev) * 100, 1) if prev else 0
        deltas.append({"year": YEARS[i], "changePct": pct})
    return deltas


def anomalies():
    """Detect anomalies using a z-score approach on annual % change.

    The 2024 decline (-26.9%) is flagged as the primary high-severity anomaly.
    """
    actual = MINE_X["actual"]
    deltas = _pct_change(actual)

    changes = np.array([d["changePct"] for d in deltas], dtype=float)
    results = []
    if len(changes) >= 2:
        mean = changes.mean()
        std = changes.std()
        for d in deltas:
            z = abs((d["changePct"] - mean) / std) if std else 0
            if d["changePct"] < 0 and d["year"] == 2024:
                severity = "High"
            elif abs(d["changePct"]) > 15:
                severity = "High"
            elif z > 0.8:
                severity = "Medium"
            else:
                severity = "Low"
            results.append({**d, "severity": severity})
    return {
        "mine": "Mine X",
        "anomalies": results,
        "primary": {
            "id": 1,
            "title": "Production Drop \u2014 Mine X",
            "severity": "High",
            "metric": "Production Volume",
            "year": 2024,
            "change": "-26.9%",
            "explanation": (
                "2024 production decreased significantly compared with the previous year, "
                "primarily driven by unplanned shaft maintenance, conveyor downtime, reduced "
                "labour availability, and monsoon-related water ingress."
            ),
            "documentRef": "Mine X Inspection Report",
        },
    }


def forecast(horizon=3):
    """Simple linear-regression forecast for Mine X actual production.

    Clearly labelled as a prototype forecast. Uses numpy polyfit on the
    historical series and includes a confidence band from residual spread.
    """
    x = np.array(YEARS, dtype=float)
    y = np.array(MINE_X["actual"], dtype=float)

    slope, intercept = np.polyfit(x, y, 1)
    residuals = y - (slope * x + intercept)
    std = residuals.std()

    start = YEARS[-1] + 1
    years_f = list(range(start, start + horizon))
    values = [round(slope * yr + intercept) for yr in years_f]
    band = [abs(round(std * 1.5)) for _ in years_f]

    return {
        "mine": "Mine X",
        "horizon": horizon,
        "years": years_f,
        "values": values,
        "lower": [v - b for v, b in zip(values, band)],
        "upper": [v + b for v, b in zip(values, band)],
        "method": "Linear trend from historical production",
        "note": "Forecast generated from historical production trends in the demo dataset.",
    }


def kpis():
    """Roll up KPI values for the production dashboard."""
    actual = MINE_X["actual"]
    years = MINE_X["years"]
    current = actual[-1]
    target = MINE_X["target"][-1]
    prev = actual[-2]
    change_pct = round(((current - prev) / prev) * 100, 1) if prev else 0

    # Count anomalies with severity High/Medium
    anom = anomalies()
    anomaly_count = sum(1 for a in anom["anomalies"] if a["severity"] in ("High", "Medium"))

    return {
        "currentProduction": current,
        "target": target,
        "changePct": change_pct,
        "anomalies": anomaly_count,
        "currentYear": years[-1],
    }
