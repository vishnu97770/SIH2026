"""
Automated Mine Intelligence Report generation.

Assembles structured report data (summary, overview, production performance,
anomalies, forecast, AI insights, evidence) and renders it to a PDF using
ReportLab. Returns the structured data for preview plus a `download` flag.
"""

import os

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)

from . import analytics
from . import rag
from ..config import settings

REPORT_STYLE_ACCENT = colors.HexColor("#3b82f6")
REPORT_STYLE_NEUTRAL = colors.HexColor("#334155")


def _assemble_content():
    production = analytics.production_series()
    anom = analytics.anomalies()
    forecast = analytics.forecast(horizon=3)
    ai_summary, _, citations = _ai_insights()

    section = (
        "2024 production declined to 87,000 tonnes (-26.9% vs 2023) due to operational "
        "constraints, then recovered to 121,000 tonnes in 2025. Two anomalies were flagged. "
        "The prototype forecast anticipates stable-to-moderate growth through 2028."
    )

    return {
        "title": "Mine Intelligence Report \u2014 Mine X",
        "generatedAt": "2026 demo",
        "reportType": "Mine Intelligence Report",
        "mine": "Mine X",
        "executive_summary": section,
        "mine_overview": {
            "mine": "Mine X",
            "type": "Opencast / underground coal",
            "reserves": "1.42M tonnes (demo)",
            "currentProduction": production["current"],
        },
        "production": {
            "years": production["years"],
            "actual": production["actual"],
            "target": production["target"],
            "current": production["current"],
            "changePct": None,
        },
        "anomalies": [a for a in anom["anomalies"] if a["severity"] in ("High", "Medium")],
        "primary_anomaly": anom["primary"],
        "forecast": forecast,
        "ai_insights": ai_summary,
        "citations": citations,
    }


def _ai_insights():
    """Ask the demo RAG service a capstone question for the report."""
    result = rag.answer_question(
        "What caused the production decline in 2024 for Mine X?"
    )
    return result["answer"], result["citations"], result["citations"]


def build_report_data():
    """Return structured report content for the frontend preview."""
    content = _assemble_content()
    # Render an inline text preview of the PDF body (no binary payload).
    content["download"] = True
    return content


def generate_pdf():
    """Generate and persist a PDF report, returning its file path."""
    content = _assemble_content()
    os.makedirs(settings.reports_dir, exist_ok=True)
    path = os.path.join(settings.reports_dir, "mine_intelligence_report.pdf")

    doc = SimpleDocTemplate(
        path,
        pagesize=A4,
        leftMargin=20 * mm,
        rightMargin=20 * mm,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
        title="Mine Intelligence Report",
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "TitleX", parent=styles["Title"], fontSize=20, textColor=REPORT_STYLE_NEUTRAL, spaceAfter=2
    )
    h2 = ParagraphStyle(
        "H2X", parent=styles["Heading2"], fontSize=13, textColor=REPORT_STYLE_ACCENT, spaceBefore=12, spaceAfter=4
    )
    body = styles["BodyText"]

    story = []
    story.append(Paragraph(content["title"], title_style))
    story.append(Paragraph("Demo prototype \u2014 sample data (not official government data)", styles["Italic"]))
    story.append(Spacer(1, 6))

    story.append(Paragraph("1. Executive Summary", h2))
    story.append(Paragraph(content["executive_summary"], body))

    story.append(Paragraph("2. Mine Overview", h2))
    ov = content["mine_overview"]
    story.append(Paragraph(
        f"{ov['mine']} \u2014 {ov['type']}. Estimated reserves: {ov['reserves']}. "
        f"Current production: {ov['currentProduction']:,} tonnes.",
        body,
    ))

    story.append(Paragraph("3. Production Performance", h2))
    prod = content["production"]
    table_data = [["Year", "Target (t)", "Actual (t)"]]
    for i, yr in enumerate(prod["years"]):
        table_data.append([str(yr), f"{prod['target'][i]:,}", f"{prod['actual'][i]:,}"])
    table = Table(table_data, colWidths=[40 * mm, 55 * mm, 55 * mm])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), REPORT_STYLE_ACCENT),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f1f5f9")]),
        ("ALIGN", (1, 1), (-1, -1), "RIGHT"),
    ]))
    story.append(table)

    story.append(Paragraph("4. Detected Anomalies", h2))
    pa = content["primary_anomaly"]
    story.append(Paragraph(
        f"<b>{pa['title']}</b> (severity: {pa['severity']}) in {pa['year']}: {pa['change']} change. "
        f"{pa['explanation']}",
        body,
    ))

    story.append(Paragraph("5. Production Forecast", h2))
    fc = content["forecast"]
    story.append(Paragraph(
        "Prototype forecast (" + ", ".join(str(y) for y in fc["years"]) + "): "
        + ", ".join(f"{y}: {v:,} t" for y, v in zip(fc["years"], fc["values"]))
        + f". {fc['note']}",
        body,
    ))

    story.append(Paragraph("6. AI Insights", h2))
    story.append(Paragraph(content["ai_insights"], body))

    story.append(Paragraph("7. Evidence & References", h2))
    for c in content["citations"]:
        story.append(Paragraph(
            f"\u2022 {c['document']} \u2014 page {c['page']}",
            body,
        ))

    doc.build(story)
    return path
