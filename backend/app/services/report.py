from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from ..config import settings
from .analytics import data_quality, kpis, production_series
from .anomaly import detect_anomalies
from .forecast import forecast
from .data_service import get_dataframe

REPORT_PATH = Path(settings.reports_dir) / "mine_intelligence_report.pdf"


def _fmt(value: Any) -> str:
    if value is None:
        return "N/A"
    if isinstance(value, float):
        return f"{value:,.2f}"
    if isinstance(value, int):
        return f"{value:,}"
    return str(value)


def build_report_data(mine: str | None = None, report_type: str | None = None) -> dict[str, Any]:
    df = get_dataframe({"mine": mine} if mine else None)
    if df.empty:
        return {
            "has_data": False,
            "title": "Mining Production Intelligence Report",
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "report_type": report_type or "Mining Production Intelligence Report",
            "dataset_overview": {},
            "kpis": {},
            "production": {"historical": [], "target": []},
            "anomalies": [],
            "forecast": [],
            "major_insights": ["Upload a dataset to generate a live report."],
            "risk_indicators": ["No dataset uploaded."],
            "recommendations": ["Upload a CSV or Excel production dataset to continue."],
            "executive_summary": "No dataset is currently uploaded.",
            "closing_narrative": "No dataset is currently uploaded.",
            "citations": [],
        }

    quality = data_quality({"mine": mine} if mine else None)
    kpi_pack = kpis({"mine": mine} if mine else None)
    production_pack = production_series({"mine": mine} if mine else None)
    anomaly_pack = detect_anomalies(df)
    forecast_pack = forecast(3, {"mine": mine} if mine else None)
    latest = kpi_pack.get("latest_production")
    growth = kpi_pack.get("growth_pct")
    achievement = kpi_pack.get("target_achievement_pct")
    anomalies = anomaly_pack.get("anomalies", [])
    primary = anomaly_pack.get("primary")

    insights = []
    if latest is not None:
        insights.append(f"Latest annual production is {_fmt(latest)} tonnes in {kpi_pack.get('latest_year')}.")
    if growth is not None:
        insights.append(f"Year-over-year growth is {_fmt(growth)}%.")
    if achievement is not None:
        insights.append(f"Target achievement is {_fmt(achievement)}%.")
    if primary:
        insights.append(f"The most significant anomaly is {primary['year']} with a {_fmt(primary['deviation_pct'])}% deviation.")
    if forecast_pack.get("forecast"):
        first = forecast_pack["forecast"][0]
        insights.append(
            f"The next forecast year is {first['year']} at {_fmt(first['predicted_production'])} tonnes."
        )

    risks = []
    if primary:
        risks.append(primary["reason"])
    if quality.get("quality_score", 0) < 90:
        risks.append(f"Data quality score is {_fmt(quality.get('quality_score'))}, which suggests cleaning issues.")
    if kpi_pack.get("growth_pct") is not None and kpi_pack["growth_pct"] < 0:
        risks.append("Recent production growth is negative.")

    ai_summary = " ".join(
        [
            f"The dataset contains {quality.get('rows')} rows and a quality score of {_fmt(quality.get('quality_score'))}.",
            f"Latest production is {_fmt(latest)} tonnes with growth of {_fmt(growth)}%." if growth is not None else "",
            f"Target achievement is {_fmt(achievement)}%." if achievement is not None else "",
            f"The primary anomaly is in {primary['year']}." if primary else "",
        ]
    ).strip()

    recommendations = [
        "Review the years flagged as anomalies and verify operational records.",
        "Compare underperforming years against target achievement and mine-level breakdowns.",
        "Retrain the forecasting model after each new dataset upload to keep the model current.",
    ]

    closing_parts = []
    if forecast_pack.get("forecast"):
        first_forecast = forecast_pack["forecast"][0]
        closing_parts.append(
            f"Looking ahead, {first_forecast['year']} production is projected at "
            f"{_fmt(first_forecast['predicted_production'])} tonnes "
            f"(range {_fmt(first_forecast['lower_bound'])}-{_fmt(first_forecast['upper_bound'])})."
        )
    else:
        closing_parts.append("A forecast could not be generated for this selection yet.")
    if risks:
        closing_parts.append(
            f"{len(risks)} risk indicator(s) were flagged for this period and should be reviewed before the next reporting cycle."
        )
    else:
        closing_parts.append("No risk indicators were flagged for this period.")
    closing_narrative = " ".join(closing_parts).strip()

    return {
        "has_data": True,
        "title": "Mining Production Intelligence Report",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "report_type": report_type or "Mining Production Intelligence Report",
        "dataset_overview": quality,
        "kpis": kpi_pack,
        "production": production_pack,
        "anomalies": anomalies,
        "primary_anomaly": primary,
        "forecast": forecast_pack,
        "major_insights": insights,
        "risk_indicators": risks,
        "recommendations": recommendations,
        "executive_summary": ai_summary,
        "closing_narrative": closing_narrative,
        "citations": [
            {
                "document": "Uploaded Dataset",
                "page": 1,
                "snippet": "The report is grounded in the uploaded dataset and computed analytics.",
            }
        ],
    }


def generate_pdf(mine: str | None = None, report_type: str | None = None) -> str:
    content = build_report_data(mine=mine, report_type=report_type)
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)

    doc = SimpleDocTemplate(
        str(REPORT_PATH),
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
        title=content["title"],
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "ReportTitle",
        parent=styles["Title"],
        fontSize=18,
        leading=22,
        textColor=colors.HexColor("#1f2937"),
        spaceAfter=6,
    )
    heading_style = ParagraphStyle(
        "ReportHeading",
        parent=styles["Heading2"],
        fontSize=12,
        leading=15,
        textColor=colors.HexColor("#b45309"),
        spaceBefore=10,
        spaceAfter=4,
    )
    body_style = styles["BodyText"]

    story = [
        Paragraph("MINING PRODUCTION INTELLIGENCE REPORT", title_style),
        Paragraph(f"Generated at {content['generated_at']}", styles["Italic"]),
        Spacer(1, 4),
    ]

    def section(title: str, lines: list[str]) -> None:
        story.append(Paragraph(escape(title), heading_style))
        for line in lines:
            story.append(Paragraph(escape(str(line)), body_style))
            story.append(Spacer(1, 2))

    section("1. Executive Summary", [content["executive_summary"]])

    quality = content["dataset_overview"]
    section(
        "2. Dataset Overview",
        [
            f"Rows: {_fmt(quality.get('rows'))}, Columns: {_fmt(quality.get('columns'))}, Quality Score: {_fmt(quality.get('quality_score'))}",
            f"Missing Values: {_fmt(quality.get('missing_values'))}, Duplicates: {_fmt(quality.get('duplicates'))}, Invalid Numeric Values: {_fmt(quality.get('invalid_numeric_values'))}",
            f"Year Range: {_fmt((quality.get('year_range') or [None, None])[0])} - {_fmt((quality.get('year_range') or [None, None])[1])}",
        ],
    )

    k = content["kpis"]
    section(
        "3. Key Performance Indicators",
        [
            f"Total Production: {_fmt(k.get('total_production'))}",
            f"Average Production: {_fmt(k.get('average_production'))}",
            f"Latest Production: {_fmt(k.get('latest_production'))}",
            f"Growth: {_fmt(k.get('growth_pct'))}%",
            f"Target Achievement: {_fmt(k.get('target_achievement_pct'))}%",
            f"Highest Production Year: {_fmt(k.get('highest_production_year'))}",
            f"Lowest Production Year: {_fmt(k.get('lowest_production_year'))}",
            f"Anomalies: {_fmt(k.get('anomaly_count'))}",
        ],
    )

    production = content["production"]["historical"]
    table_rows = [["Year", "Production", "Target"]] + [
        [str(row["year"]), _fmt(row["production"]), _fmt(row.get("target"))] for row in production
    ]
    table = Table(table_rows, colWidths=[35 * mm, 50 * mm, 50 * mm])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#b45309")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#d6d3d1")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.whitesmoke, colors.HexColor("#fff7ed")]),
                ("ALIGN", (1, 1), (-1, -1), "RIGHT"),
            ]
        )
    )
    story.append(Paragraph(escape("4. Production Trends"), heading_style))
    story.append(table)

    target_achievement_lines = []
    if content["kpis"].get("target_achievement_pct") is not None:
        target_achievement_lines.append(
            f"Target achievement is {_fmt(content['kpis']['target_achievement_pct'])}% based on the uploaded target values."
        )
    else:
        target_achievement_lines.append(
            "Target achievement could not be calculated because the dataset has no target column for this selection."
        )
    target_achievement_lines.append(
        "Target-specific metrics are only shown when the dataset provides a target field; they are never invented."
    )
    section("5. Target Achievement", target_achievement_lines)

    if content["primary_anomaly"]:
        a = content["primary_anomaly"]
        section(
            "6. Anomaly Detection",
            [
                f"Primary anomaly: {a['year']} with {a['severity']} severity.",
                f"Actual: {_fmt(a['actual'])}, Expected: {_fmt(a['expected'])}, Deviation: {_fmt(a['deviation_pct'])}%",
                a["reason"],
            ],
        )
    else:
        section("6. Anomaly Detection", ["No statistically meaningful anomalies were identified."])

    fc = content["forecast"]["forecast"]
    if fc:
        section(
            "7. Forecast",
            [
                f"{row['year']}: {_fmt(row['predicted_production'])} tonnes "
                f"({_fmt(row['lower_bound'])} - {_fmt(row['upper_bound'])})"
                for row in fc
            ],
        )
    else:
        section("7. Forecast", ["Forecasting could not be generated because the dataset is too small."])

    section("8. Major Insights", content["major_insights"] or ["No additional insights available."])
    section("9. Risk Indicators", content["risk_indicators"] or ["No explicit risk indicators."])
    section("10. Recommendations", content["recommendations"])
    section("11. Outlook & Closing Notes", [content["closing_narrative"]])

    doc.build(story)
    return str(REPORT_PATH)
