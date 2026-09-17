from __future__ import annotations

import json
import re
import shutil
import subprocess
import tempfile
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from ..config import settings

RUNTIME_DIR = Path(settings.data_dir) / "runtime"
DOCUMENTS_INDEX_PATH = RUNTIME_DIR / "documents_index.json"
SUPPORTED_SUFFIXES = {".pdf", ".png", ".jpg", ".jpeg"}

_TYPE_KEYWORDS = {
    "Geological": ("geolog", "strata", "seam", "reserve", "ore grade", "overburden"),
    "Inspection": ("inspect", "safety", "compliance", "audit", "downtime"),
    "Production": ("production", "output", "dispatch", "tonnage", "target"),
}


def tesseract_available() -> bool:
    return shutil.which("tesseract") is not None


def _ensure_dirs() -> None:
    Path(settings.documents_dir).mkdir(parents=True, exist_ok=True)
    RUNTIME_DIR.mkdir(parents=True, exist_ok=True)


def _load_index() -> list[dict[str, Any]]:
    _ensure_dirs()
    if not DOCUMENTS_INDEX_PATH.exists():
        return []
    try:
        return json.loads(DOCUMENTS_INDEX_PATH.read_text(encoding="utf-8"))
    except Exception:
        return []


def _save_index(records: list[dict[str, Any]]) -> None:
    _ensure_dirs()
    DOCUMENTS_INDEX_PATH.write_text(json.dumps(records, indent=2), encoding="utf-8")


def _run(cmd: list[str], timeout: int = 60) -> tuple[int, bytes, bytes]:
    try:
        result = subprocess.run(cmd, capture_output=True, timeout=timeout, check=False)
        return result.returncode, result.stdout, result.stderr
    except (OSError, subprocess.TimeoutExpired):
        return 1, b"", b"command failed to run"


def _ocr_image_file(path: Path) -> str:
    if not tesseract_available():
        return ""
    code, out, _ = _run(["tesseract", str(path), "stdout"], timeout=60)
    if code != 0:
        return ""
    return out.decode("utf-8", errors="replace").strip()


def _extract_pdf_pages(pdf_path: Path) -> list[dict[str, Any]]:
    code, out, _ = _run(["pdftotext", "-layout", str(pdf_path), "-"], timeout=90)
    raw_pages = out.decode("utf-8", errors="replace").split("\f") if code == 0 else []
    # pdftotext emits a trailing empty page marker - drop it.
    if raw_pages and not raw_pages[-1].strip():
        raw_pages = raw_pages[:-1]
    if not raw_pages:
        raw_pages = [""]

    pages: list[dict[str, Any]] = []
    with tempfile.TemporaryDirectory() as tmp:
        for index, text in enumerate(raw_pages, start=1):
            text = text.strip()
            ocr_used = False
            ocr_unavailable = False
            # A page with almost no extractable text is very likely a scanned
            # image rather than an empty page - fall back to OCR instead of
            # silently reporting an empty page.
            if len(text) < 20:
                if tesseract_available():
                    prefix = str(Path(tmp) / f"page-{index}")
                    _run(["pdftoppm", "-f", str(index), "-l", str(index), "-r", "200", "-png", str(pdf_path), prefix], timeout=90)
                    rendered = sorted(Path(tmp).glob(f"page-{index}*.png"))
                    if rendered:
                        ocr_text = _ocr_image_file(rendered[0])
                        if ocr_text:
                            text = ocr_text
                            ocr_used = True
                else:
                    ocr_unavailable = True
            pages.append({"page": index, "text": text, "ocr_used": ocr_used, "ocr_unavailable": ocr_unavailable})
    return pages


def _extract_image_page(image_path: Path) -> list[dict[str, Any]]:
    if tesseract_available():
        text = _ocr_image_file(image_path)
        return [{"page": 1, "text": text, "ocr_used": bool(text), "ocr_unavailable": False}]
    return [{"page": 1, "text": "", "ocr_used": False, "ocr_unavailable": True}]


def _extract_docx_pages(docx_path: Path) -> list[dict[str, Any]]:
    try:
        from docx import Document as DocxDocument
    except Exception:
        return [{"page": 1, "text": "", "ocr_used": False, "ocr_unavailable": False}]
    try:
        doc = DocxDocument(str(docx_path))
        text = "\n".join(p.text for p in doc.paragraphs if p.text.strip()).strip()
    except Exception:
        text = ""
    return [{"page": 1, "text": text, "ocr_used": False, "ocr_unavailable": False}]


def _extract_text_pages(text_path: Path) -> list[dict[str, Any]]:
    try:
        text = text_path.read_text(encoding="utf-8", errors="ignore").strip()
    except Exception:
        text = ""
    return [{"page": 1, "text": text, "ocr_used": False, "ocr_unavailable": False}]


def _infer_doc_type(filename: str, pages: list[dict[str, Any]]) -> str:
    haystack = filename.lower() + " " + " ".join(p["text"].lower() for p in pages[:3])
    for label, keywords in _TYPE_KEYWORDS.items():
        if any(kw in haystack for kw in keywords):
            return label
    return "Document"


def _chunk_page_text(text: str, target_chars: int = 500) -> list[str]:
    paragraphs = [p.strip() for p in re.split(r"\n\s*\n+", text) if p.strip()]
    if not paragraphs and text.strip():
        paragraphs = [text.strip()]

    chunks: list[str] = []
    buffer = ""
    for para in paragraphs:
        candidate = f"{buffer} {para}".strip() if buffer else para
        if len(candidate) <= target_chars or not buffer:
            buffer = candidate
        else:
            chunks.append(buffer)
            buffer = para
    if buffer:
        chunks.append(buffer)
    return chunks


def ingest_document(file_bytes: bytes, filename: str) -> dict[str, Any]:
    """Accepts any file type. PDF, PNG/JPG, DOCX, and TXT get real text extraction;
    anything else is still stored so it shows up in the document library, just
    without extracted text."""
    _ensure_dirs()
    suffix = Path(filename).suffix.lower()

    doc_id = uuid.uuid4().hex
    dest = Path(settings.documents_dir) / f"{doc_id}{suffix or '.bin'}"
    dest.write_bytes(file_bytes)

    if suffix == ".pdf":
        pages = _extract_pdf_pages(dest)
    elif suffix in {".png", ".jpg", ".jpeg"}:
        pages = _extract_image_page(dest)
    elif suffix in {".docx", ".doc"}:
        pages = _extract_docx_pages(dest)
    elif suffix == ".txt":
        pages = _extract_text_pages(dest)
    else:
        pages = [{"page": 1, "text": "", "ocr_used": False, "ocr_unavailable": False}]

    doc_type = _infer_doc_type(filename, pages)

    chunks: list[dict[str, Any]] = []
    for page in pages:
        for chunk_text in _chunk_page_text(page["text"]):
            chunks.append({"doc": filename, "page": page["page"], "type": doc_type, "text": chunk_text})

    ocr_used_pages = sum(1 for p in pages if p["ocr_used"])
    ocr_unavailable_pages = sum(1 for p in pages if p["ocr_unavailable"])

    record = {
        "id": doc_id,
        "source_name": filename,
        "stored_as": dest.name,
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
        "type": doc_type,
        "pages": len(pages),
        "chunks": chunks,
        "ocr_used_pages": ocr_used_pages,
        "ocr_unavailable_pages": ocr_unavailable_pages,
    }

    records = _load_index()
    records.append(record)
    _save_index(records)

    return {
        "id": doc_id,
        "source_name": filename,
        "type": doc_type,
        "pages": len(pages),
        "chunk_count": len(chunks),
        "ocr_used_pages": ocr_used_pages,
        "ocr_unavailable_pages": ocr_unavailable_pages,
        "tesseract_available": tesseract_available(),
        "extracted_chars": sum(len(c["text"]) for c in chunks),
    }


def list_documents() -> list[dict[str, Any]]:
    records = _load_index()
    return [
        {
            "id": r["id"],
            "name": r["source_name"],
            "type": r["type"],
            "status": "Processed" if any(c["text"] for c in r["chunks"]) else "Uploaded (no text extracted)",
            "pages": r["pages"],
            "chunks": len(r["chunks"]),
            "date": r["uploaded_at"][:10] if r.get("uploaded_at") else None,
            "ocr_used_pages": r.get("ocr_used_pages", 0),
            "ocr_unavailable_pages": r.get("ocr_unavailable_pages", 0),
        }
        for r in records
    ]


def get_all_chunks() -> list[dict[str, Any]]:
    """Flattened {doc, page, type, text} chunks across every uploaded document -
    this is the real, growing corpus that supplements the static demo
    knowledge base for chat retrieval and topic/word-cloud analysis."""
    chunks: list[dict[str, Any]] = []
    for record in _load_index():
        chunks.extend(record["chunks"])
    return chunks


def remove_document(doc_id: str) -> dict[str, Any]:
    records = _load_index()
    remaining = [r for r in records if r["id"] != doc_id]
    if len(remaining) == len(records):
        raise ValueError("Document not found.")

    removed = next(r for r in records if r["id"] == doc_id)
    stored_path = Path(settings.documents_dir) / removed["stored_as"]
    if stored_path.exists():
        stored_path.unlink()

    _save_index(remaining)
    return {"ok": True, "message": f"{removed['source_name']} removed."}
