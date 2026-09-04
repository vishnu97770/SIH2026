from __future__ import annotations

import os
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .config import settings
from .api.auth import router as auth_router
from .api.routes import router
from .db import engine
from . import models

# Initialize database tables on startup.
models.Base.metadata.create_all(bind=engine)

BASE_DIR = Path(__file__).resolve().parents[2]
FRONTEND_DIST = BASE_DIR / "frontend" / "dist"
FRONTEND_PUBLIC = BASE_DIR / "frontend" / "public"
INDEX_FILE = FRONTEND_DIST / "index.html"
FAVICON_FILE = FRONTEND_PUBLIC / "favicon.svg"


def create_app() -> FastAPI:
    app = FastAPI(title="Mine Intelligence Platform", version="0.1.0")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(auth_router)
    app.include_router(router)

    for dirname in (settings.upload_dir, settings.reports_dir, settings.models_dir):
        os.makedirs(dirname, exist_ok=True)

    if FRONTEND_DIST.exists():
        assets_dir = FRONTEND_DIST / "assets"
        if assets_dir.exists():
            app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/favicon.ico", include_in_schema=False)
    def favicon() -> FileResponse:
        if FAVICON_FILE.exists():
            return FileResponse(FAVICON_FILE, media_type="image/svg+xml")
        raise HTTPException(status_code=404, detail="Favicon not found")

    @app.get("/{full_path:path}", include_in_schema=False)
    def spa_fallback(full_path: str) -> FileResponse:
        if full_path.startswith("api"):
            raise HTTPException(status_code=404, detail="Not found")
        if full_path in {"docs", "redoc", "openapi.json"}:
            raise HTTPException(status_code=404, detail="Not found")
        if INDEX_FILE.exists():
            return FileResponse(INDEX_FILE)
        raise HTTPException(status_code=404, detail="Frontend build not found")

    return app


app = create_app()
