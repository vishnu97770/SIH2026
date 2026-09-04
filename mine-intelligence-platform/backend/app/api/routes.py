from __future__ import annotations

import os
from io import BytesIO
from pathlib import Path
from typing import Any

import pandas as pd
from fastapi import APIRouter, Body, File, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from ..config import settings
from ..services import analytics, rag, report
from ..services.anomaly import detect_anomalies
from ..services.data_service import get_dataframe, get_filter_options, get_session, has_data, remove_dataset, set_session_from_dataframe, upload_dataset
from ..services.forecast import forecast, train_forecast_model

router = APIRouter(prefix="/api")


class AskRequest(BaseModel):
    question: str = Field(min_length=1)


class ReportRequest(BaseModel):
    mine: str | None = None
    report_type: str | None = None


class ForecastRequest(BaseModel):
    horizon: int = Field(default=3, ge=1, le=12)
    year: list[int] | None = None
    mine: list[str] | None = None
    mineral: list[str] | None = None
    state: list[str] | None = None
    district: list[str] | None = None


def _filters_from_query(
    year: list[int] | None = Query(default=None),
    mine: list[str] | None = Query(default=None),
    mineral: list[str] | None = Query(default=None),
    state: list[str] | None = Query(default=None),
    district: list[str] | None = Query(default=None),
) -> dict[str, Any]:
    filters: dict[str, Any] = {}
    if year:
        filters["year"] = year
    if mine:
        filters["mine"] = mine
    if mineral:
        filters["mineral"] = mineral
    if state:
        filters["state"] = state
    if district:
        filters["district"] = district
    return filters


@router.get("/health")
def health():
    session = get_session()
    return {"status": "ok", "has_data": has_data(), "session_id": session.session_id}


@router.get("/session")
def session_state():
    session = get_session()
    return {
        "session": session.as_metadata(),
        "filters": get_filter_options(),
        "quality": session.quality,
    }


@router.get("/assistant/suggestions")
def suggestions():
    return {
        "suggestions": [
            "Summarize this dataset",
            "Why did production fall in the latest year?",
            "Which mine had the highest production?",
            "Show major anomalies",
            "What does the forecast look like?",
            "Generate an executive summary",
        ]
    }


@router.post("/ask")
def ask(req: AskRequest):
    return rag.answer_question(req.question)


@router.post("/upload")
async def upload(file: UploadFile = File(...)):
    filename = file.filename or "dataset"
    suffix = Path(filename).suffix.lower()
    if suffix not in {".csv", ".xlsx", ".xls"}:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type. Please upload a CSV, XLSX, or XLS file.",
        )

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="The uploaded file is empty.")

    size_mb = len(content) / (1024 * 1024)
    if size_mb > settings.max_upload_mb:
        raise HTTPException(
            status_code=413,
            detail=f"File is too large. Maximum allowed size is {settings.max_upload_mb} MB.",
        )

    try:
        safe_name = f"{Path(filename).stem}_{os.getpid()}_{Path(filename).suffix.lstrip('.')}"
        dest = Path(settings.upload_dir) / safe_name
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(content)

        result = upload_dataset(content, filename)
        train_forecast_model()
        return {"ok": True, **result}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/documents/upload")
async def upload_document(file: UploadFile = File(...)):
    return await upload(file)


@router.delete("/dataset")
def delete_dataset():
    return remove_dataset()


@router.post("/demo/load")
def load_demo_dataset():
    demo = pd.DataFrame(
        [
            {"year": 2019, "mine": "Mine A", "mineral": "Iron Ore", "state": "Odisha", "district": "Keonjhar", "production": 720, "target": 780},
            {"year": 2020, "mine": "Mine A", "mineral": "Iron Ore", "state": "Odisha", "district": "Keonjhar", "production": 760, "target": 800},
            {"year": 2021, "mine": "Mine A", "mineral": "Iron Ore", "state": "Odisha", "district": "Keonjhar", "production": 830, "target": 840},
            {"year": 2022, "mine": "Mine A", "mineral": "Iron Ore", "state": "Odisha", "district": "Keonjhar", "production": 905, "target": 880},
            {"year": 2023, "mine": "Mine A", "mineral": "Iron Ore", "state": "Odisha", "district": "Keonjhar", "production": 940, "target": 920},
            {"year": 2024, "mine": "Mine A", "mineral": "Iron Ore", "state": "Odisha", "district": "Keonjhar", "production": 615, "target": 980},
            {"year": 2025, "mine": "Mine A", "mineral": "Iron Ore", "state": "Odisha", "district": "Keonjhar", "production": 860, "target": 1010},
            {"year": 2021, "mine": "Mine B", "mineral": "Manganese", "state": "Jharkhand", "district": "Singhbhum", "production": 220, "target": 240},
            {"year": 2022, "mine": "Mine B", "mineral": "Manganese", "state": "Jharkhand", "district": "Singhbhum", "production": 250, "target": 255},
            {"year": 2023, "mine": "Mine B", "mineral": "Manganese", "state": "Jharkhand", "district": "Singhbhum", "production": 245, "target": 260},
            {"year": 2024, "mine": "Mine B", "mineral": "Manganese", "state": "Jharkhand", "district": "Singhbhum", "production": 270, "target": 270},
            {"year": 2025, "mine": "Mine B", "mineral": "Manganese", "state": "Jharkhand", "district": "Singhbhum", "production": 292, "target": 285},
        ]
    )
    result = set_session_from_dataframe(demo, filename="demo_mining_dataset.csv")
    train_forecast_model()
    return {
        "ok": True,
        "message": "Demo dataset loaded. Replace it with your government dataset when ready.",
        **result,
    }


@router.get("/production")
def production(
    year: list[int] | None = Query(default=None),
    mine: list[str] | None = Query(default=None),
    mineral: list[str] | None = Query(default=None),
    state: list[str] | None = Query(default=None),
    district: list[str] | None = Query(default=None),
):
    return analytics.production_series(
        _filters_from_query(year=year, mine=mine, mineral=mineral, state=state, district=district)
    )


@router.get("/kpis")
@router.get("/production/kpis")
def kpis(
    year: list[int] | None = Query(default=None),
    mine: list[str] | None = Query(default=None),
    mineral: list[str] | None = Query(default=None),
    state: list[str] | None = Query(default=None),
    district: list[str] | None = Query(default=None),
):
    return analytics.kpis(_filters_from_query(year=year, mine=mine, mineral=mineral, state=state, district=district))


@router.get("/quality")
def quality():
    return analytics.data_quality()


@router.get("/filters")
def filters():
    return analytics.filters_meta()


@router.get("/anomalies")
def anomalies(
    year: list[int] | None = Query(default=None),
    mine: list[str] | None = Query(default=None),
    mineral: list[str] | None = Query(default=None),
    state: list[str] | None = Query(default=None),
    district: list[str] | None = Query(default=None),
):
    df = get_dataframe(_filters_from_query(year=year, mine=mine, mineral=mineral, state=state, district=district))
    return detect_anomalies(df)


@router.get("/forecast")
def forecast_get(
    horizon: int = Query(default=3, ge=1, le=12),
    year: list[int] | None = Query(default=None),
    mine: list[str] | None = Query(default=None),
    mineral: list[str] | None = Query(default=None),
    state: list[str] | None = Query(default=None),
    district: list[str] | None = Query(default=None),
):
    return forecast(horizon, _filters_from_query(year=year, mine=mine, mineral=mineral, state=state, district=district))


@router.post("/forecast")
def forecast_post(payload: ForecastRequest):
    filters = {
        "year": payload.year,
        "mine": payload.mine,
        "mineral": payload.mineral,
        "state": payload.state,
        "district": payload.district,
    }
    filters = {k: v for k, v in filters.items() if v}
    return forecast(payload.horizon, filters)


@router.post("/train-models")
def retrain_models():
    artifact = train_forecast_model(force=True)
    if artifact.get("status") == "insufficient_data":
        raise HTTPException(status_code=400, detail=artifact["message"])
    return {"ok": True, "artifact": artifact}


@router.post("/report")
def create_report(payload: ReportRequest | None = Body(default=None)):
    payload = payload or ReportRequest()
    return report.build_report_data(mine=payload.mine, report_type=payload.report_type)


@router.get("/report/pdf")
def report_pdf(
    mine: str | None = Query(default=None),
    report_type: str | None = Query(default=None),
):
    path = report.generate_pdf(mine=mine, report_type=report_type)
    return FileResponse(path, media_type="application/pdf", filename="mine_intelligence_report.pdf")


@router.get("/documents")
def documents():
    session = get_session()
    if not has_data():
        return {"documents": []}

    return {
        "documents": [
            {
                "id": session.session_id[:8],
                "name": session.source_name or "Uploaded dataset",
                "type": "Spreadsheet",
                "status": "Processed",
                "records": session.row_count,
                "date": session.uploaded_at[:10] if session.uploaded_at else None,
                "quality": session.quality,
            }
        ]
    }

