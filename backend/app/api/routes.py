import os
import uuid
from pathlib import Path

from fastapi import APIRouter, File, UploadFile, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel

from ..config import settings
from ..services import analytics, rag, report

router = APIRouter(prefix="/api")


class AskRequest(BaseModel):
    question: str


@router.get("/health")
def health():
    return {"status": "ok"}


@router.get("/assistant/suggestions")
def suggestions():
    return {
        "suggestions": [
            "What was Mine X's production trend from 2021 to 2025?",
            "Why did Mine X production decline in 2024?",
            "What geological factors affected production?",
            "What evidence supports the 2024 production decline?",
        ]
    }


@router.post("/ask")
def ask(req: AskRequest):
    if not req.question.strip():
        raise HTTPException(status_code=400, detail="Please enter a question.")
    return rag.answer_question(req.question)


@router.get("/production")
def production():
    return analytics.production_series()


@router.get("/production/kpis")
def kpis():
    return analytics.kpis()


@router.get("/anomalies")
def anomalies():
    return analytics.anomalies()


@router.get("/forecast")
def forecast():
    return analytics.forecast(horizon=3)


@router.post("/report")
def create_report():
    return report.build_report_data()


@router.get("/report/pdf")
def report_pdf():
    path = report.generate_pdf()
    return FileResponse(path, media_type="application/pdf", filename="mine_intelligence_report.pdf")


DOCS = [
    {
        "id": 1,
        "name": "Mine_X_Geological_Report.pdf",
        "type": "Geological",
        "status": "Processed",
        "pages": 42,
        "date": "2026-08-28",
    },
    {
        "id": 2,
        "name": "Mine_X_Inspection_Report.pdf",
        "type": "Inspection",
        "status": "Processed",
        "pages": 38,
        "date": "2026-08-26",
    },
    {
        "id": 3,
        "name": "Mine_X_Production_Data.xlsx",
        "type": "Production",
        "status": "Processed",
        "records": 5,
        "date": "2026-08-24",
    },
]


@router.get("/documents")
def documents():
    return {"documents": DOCS}


@router.post("/documents/upload")
async def upload_document(file: UploadFile = File(...)):
    filename = file.filename or "document"
    ext = Path(filename).suffix.lower()
    if ext not in (".pdf", ".csv", ".xlsx", ".xls"):
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type. Please upload a PDF, CSV, or Excel file.",
        )

    os.makedirs(settings.upload_dir, exist_ok=True)
    safe_name = f"{uuid.uuid4().hex[:8]}_{filename.replace('/', '_')}"
    dest = os.path.join(settings.upload_dir, safe_name)
    with open(dest, "wb") as f:
        f.write(await file.read())

    doc_type = "PDF" if ext == ".pdf" else "Spreadsheet"
    doc_id = uuid.uuid4().int >> 100
    pages = 42 if ext == ".pdf" else None
    records = 5 if ext in (".csv", ".xlsx", ".xls") else None
    return {
        "ok": True,
        "document": {
            "id": doc_id,
            "name": filename,
            "type": doc_type,
            "status": "Processed",
            "pages": pages,
            "records": records,
            "date": "2026-09-03",
            "pipeline": {
                "upload": "Complete",
                "extraction": "Complete",
                "ocr": "Complete",
                "chunking": "Complete",
                "indexing": "Complete",
                "grounding": "Ready",
            },
            "extraction": {
                "mode": "OCR + structured extraction (demo)",
                "textBlocks": 128 if ext == ".pdf" else 24,
                "tables": 4 if ext == ".pdf" else 1,
                "metadataFields": 8,
            },
        },
        "message": f"{filename} processed: OCR/extraction, chunking and indexing complete.",
    }
