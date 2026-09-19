from __future__ import annotations

import contextvars
import re
from pathlib import Path

from ..config import settings

# Every request sets this to the authenticated user's username (see
# api/auth.py:get_current_user), so that data_service/document_service/forecast
# can each keep the dataset, document library, and forecast model isolated per
# account instead of sharing one process-wide workspace.
_current_username: contextvars.ContextVar[str] = contextvars.ContextVar("current_username", default="")


def set_current_username(username: str) -> None:
    _current_username.set(username)


def get_current_username() -> str:
    username = _current_username.get()
    if not username:
        raise RuntimeError("No authenticated user is set for this request.")
    return username


def user_slug(username: str | None = None) -> str:
    """Filesystem-safe key derived from a username/email, used to namespace
    per-user runtime data (dataset session, documents, forecast models)."""
    username = username if username is not None else get_current_username()
    slug = re.sub(r"[^a-zA-Z0-9]+", "_", username.strip().lower()).strip("_")
    return slug or "user"


def forecast_model_path(username: str | None = None) -> Path:
    return Path(settings.models_dir) / f"production_forecaster_{user_slug(username)}.pkl"
