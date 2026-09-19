from __future__ import annotations

import io
import json
import re
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import pandas as pd

from ..config import settings
from .user_context import forecast_model_path, get_current_username, user_slug

RUNTIME_DIR = Path(settings.data_dir) / "runtime"


def _session_paths(username: str) -> tuple[Path, Path]:
    slug = user_slug(username)
    return RUNTIME_DIR / f"analysis_session_{slug}.json", RUNTIME_DIR / f"analysis_session_{slug}.csv"


def _ensure_dirs() -> None:
    Path(settings.data_dir).mkdir(parents=True, exist_ok=True)
    Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)
    Path(settings.reports_dir).mkdir(parents=True, exist_ok=True)
    Path(settings.models_dir).mkdir(parents=True, exist_ok=True)
    RUNTIME_DIR.mkdir(parents=True, exist_ok=True)


def _slug(value: Any) -> str:
    return re.sub(r"[^a-z0-9]+", "", str(value).strip().lower())


def _normalize_text(value: Any) -> str:
    return re.sub(r"[^a-z0-9]+", " ", str(value).strip().lower()).strip()


ALIASES = {
    "year": {"year", "fy", "fiscalyear", "financialyear", "period", "reportyear"},
    "date": {"date", "day", "monthdate", "reportdate", "timestamp"},
    "mine": {"mine", "mine name", "minename", "site", "pit", "minecode", "mineid"},
    "mineral": {"mineral", "commodity", "resource", "ore", "material"},
    "state": {"state", "province", "regionstate"},
    "district": {"district", "region", "area", "block", "zone", "location", "subdivision"},
    "production": {
        "production",
        "actualproduction",
        "actual",
        "output",
        "quantityproduced",
        "qtyproduced",
        "productionquantity",
        "productionvolume",
        "dispatch",
        "despatch",
    },
    "target": {"target", "plannedproduction", "plan", "goal", "projection"},
    "capacity": {"capacity", "installedcapacity", "ratedcapacity"},
    "dispatch": {"dispatch", "despatch", "shipment", "sales"},
}


NUMERIC_CANONICAL = {"production", "target", "capacity", "dispatch"}


@dataclass
class AnalysisSession:
    session_id: str = ""
    source_name: str = ""
    uploaded_at: str = ""
    row_count: int = 0
    clean_df: pd.DataFrame = field(default_factory=pd.DataFrame)
    raw_columns: list[str] = field(default_factory=list)
    column_map: dict[str, str] = field(default_factory=dict)
    quality: dict[str, Any] = field(default_factory=dict)
    chat_history: list[dict[str, str]] = field(default_factory=list)
    last_model: dict[str, Any] = field(default_factory=dict)
    last_topic: dict[str, Any] = field(default_factory=dict)

    def has_data(self) -> bool:
        return not self.clean_df.empty

    def as_metadata(self) -> dict[str, Any]:
        return {
            "session_id": self.session_id,
            "source_name": self.source_name,
            "uploaded_at": self.uploaded_at,
            "row_count": self.row_count,
            "columns": list(self.clean_df.columns),
            "column_map": self.column_map,
            "quality": self.quality,
            "has_data": self.has_data(),
        }


# Sessions live in-process, one per authenticated user, keyed by username.
# This keeps each account's uploaded dataset isolated instead of every user
# sharing a single global workspace.
_SESSIONS: dict[str, AnalysisSession] = {}


def _load_persisted_session(username: str) -> AnalysisSession:
    _ensure_dirs()
    session = AnalysisSession()
    session_path, session_data_path = _session_paths(username)
    if not session_path.exists() or not session_data_path.exists():
        return session

    try:
        meta = json.loads(session_path.read_text(encoding="utf-8"))
        df = pd.read_csv(session_data_path)
    except Exception:
        return session

    session.session_id = meta.get("session_id", "")
    session.source_name = meta.get("source_name", "")
    session.uploaded_at = meta.get("uploaded_at", "")
    session.row_count = int(meta.get("row_count", len(df)))
    session.raw_columns = meta.get("raw_columns", list(df.columns))
    session.column_map = meta.get("column_map", {})
    session.quality = meta.get("quality", {})
    session.chat_history = meta.get("chat_history", [])
    session.last_model = meta.get("last_model", {})
    session.last_topic = meta.get("last_topic", {})
    session.clean_df = df
    return session


def save_session(username: str | None = None) -> None:
    username = username if username is not None else get_current_username()
    session = _SESSIONS.get(username)
    if session is None:
        return

    _ensure_dirs()
    session_path, session_data_path = _session_paths(username)
    if session.clean_df.empty:
        if session_path.exists():
            session_path.unlink()
        if session_data_path.exists():
            session_data_path.unlink()
        return

    payload = {
        **session.as_metadata(),
        "raw_columns": session.raw_columns,
        "chat_history": session.chat_history[-settings.assistant_history_limit :],
        "last_model": session.last_model,
        "last_topic": session.last_topic,
    }
    session_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    session.clean_df.to_csv(session_data_path, index=False)


def clear_session() -> None:
    username = get_current_username()
    _SESSIONS[username] = AnalysisSession()
    save_session(username)


def remove_dataset() -> dict[str, Any]:
    source_name = get_session().source_name
    clear_session()

    if source_name:
        source_stem = Path(source_name).stem
        for path in Path(settings.upload_dir).glob(f"{source_stem}_*"):
            if path.is_file():
                path.unlink()

    model_path = forecast_model_path()
    if model_path.exists():
        model_path.unlink()

    return {"ok": True, "message": "The active dataset and its analysis artifacts were removed."}


def _read_uploaded_file(file_bytes: bytes, filename: str) -> pd.DataFrame:
    suffix = Path(filename).suffix.lower()
    if suffix == ".csv":
        return pd.read_csv(io.BytesIO(file_bytes))
    if suffix in {".xlsx", ".xls"}:
        try:
            workbook = io.BytesIO(file_bytes)
            df = pd.read_excel(workbook)
            required_aliases = ALIASES["year"] | ALIASES["date"] | ALIASES["production"]
            has_known_header = any(
                _slug(column) in required_aliases or any(alias in _slug(column) for alias in required_aliases)
                for column in df.columns
            )
            if has_known_header:
                return df

            # Government workbooks often put a report title or metadata above the table.
            preview = pd.read_excel(io.BytesIO(file_bytes), header=None, nrows=12)
            for row_number, row in preview.iterrows():
                headers = [str(value).strip() for value in row.tolist()]
                if sum(_find_column(headers, aliases) is not None for aliases in ALIASES.values()) >= 2:
                    return pd.read_excel(io.BytesIO(file_bytes), header=int(row_number))
            return df
        except Exception as exc:
            raise ValueError("Unable to read the Excel file on this machine.") from exc
    raise ValueError("Unsupported file type. Please upload a CSV, XLSX, or XLS file.")


def _find_column(columns: list[str], aliases: set[str]) -> str | None:
    normalized = {col: _slug(col) for col in columns}
    for col, slug in normalized.items():
        if slug in aliases:
            return col
    for col, slug in normalized.items():
        if any(alias in slug for alias in aliases):
            return col
    return None


def _coerce_numeric(series: pd.Series) -> tuple[pd.Series, int]:
    original = series.copy()
    converted = pd.to_numeric(series, errors="coerce")
    invalid = int(((original.notna()) & (original.astype(str).str.strip() != "") & converted.isna()).sum())
    return converted, invalid


def _parse_date_column(df: pd.DataFrame, date_col: str | None) -> pd.Series | None:
    if not date_col:
        return None
    parsed = pd.to_datetime(df[date_col], errors="coerce")
    if parsed.notna().sum() == 0:
        return None
    return parsed


def _clean_dataframe(df: pd.DataFrame, filename: str) -> tuple[pd.DataFrame, dict[str, str], dict[str, Any]]:
    if df.empty:
        raise ValueError("The uploaded file is empty.")

    df = df.copy()
    df.columns = [str(col).strip() for col in df.columns]
    raw_columns = list(df.columns)

    column_map: dict[str, str] = {}
    for canonical, aliases in ALIASES.items():
        found = _find_column(raw_columns, aliases)
        if found:
            column_map[found] = canonical

    rename_map = {source: target for source, target in column_map.items()}
    df = df.rename(columns=rename_map)

    date_col = "date" if "date" in df.columns else None
    year_col = "year" if "year" in df.columns else None
    if not year_col and not date_col:
        raise ValueError("Could not identify a year or date column. Add a year/date field to the dataset.")

    parsed_date = _parse_date_column(df, date_col)
    if parsed_date is not None:
        df["date"] = parsed_date
        df["year"] = parsed_date.dt.year.astype("Int64")
    elif year_col:
        year_values = pd.to_numeric(df["year"], errors="coerce")
        if year_values.notna().sum() == 0:
            raise ValueError("The identified year column could not be converted to numbers.")
        df["year"] = year_values.round().astype("Int64")
    else:
        raise ValueError("Could not parse the time column.")

    if "production" not in df.columns:
        raise ValueError("Could not identify the actual production column. Add a production/output field.")

    invalid_numeric_values = 0
    for col in ["production", "target", "capacity", "dispatch"]:
        if col in df.columns:
            df[col], invalid = _coerce_numeric(df[col])
            invalid_numeric_values += invalid

    if "mine" in df.columns:
        df["mine"] = df["mine"].astype(str).replace({"nan": None, "None": None}).str.strip()
    if "mineral" in df.columns:
        df["mineral"] = df["mineral"].astype(str).replace({"nan": None, "None": None}).str.strip()
    if "state" in df.columns:
        df["state"] = df["state"].astype(str).replace({"nan": None, "None": None}).str.strip()
    if "district" in df.columns:
        df["district"] = df["district"].astype(str).replace({"nan": None, "None": None}).str.strip()

    duplicate_rows = int(df.duplicated().sum())
    df = df.drop_duplicates().reset_index(drop=True)

    missing_values = int(df.isna().sum().sum())
    row_count = int(df.shape[0])
    column_count = int(df.shape[1])
    year_min = int(pd.to_numeric(df["year"], errors="coerce").min()) if df["year"].notna().any() else None
    year_max = int(pd.to_numeric(df["year"], errors="coerce").max()) if df["year"].notna().any() else None

    unique_mines = int(df["mine"].nunique(dropna=True)) if "mine" in df.columns else 0
    unique_minerals = int(df["mineral"].nunique(dropna=True)) if "mineral" in df.columns else 0
    unique_states = int(df["state"].nunique(dropna=True)) if "state" in df.columns else 0
    unique_districts = int(df["district"].nunique(dropna=True)) if "district" in df.columns else 0

    quality_score = 100.0
    quality_score -= min(30.0, (missing_values / max(row_count * max(column_count, 1), 1)) * 100 * 3)
    quality_score -= min(15.0, duplicate_rows * 2.5)
    quality_score -= min(20.0, invalid_numeric_values * 1.5)
    quality_score = round(max(0.0, quality_score), 1)

    quality = {
        "rows": row_count,
        "columns": column_count,
        "missing_values": missing_values,
        "duplicates": duplicate_rows,
        "invalid_numeric_values": invalid_numeric_values,
        "year_range": [year_min, year_max] if year_min is not None and year_max is not None else None,
        "mines": unique_mines,
        "minerals": unique_minerals,
        "states": unique_states,
        "districts": unique_districts,
        "quality_score": quality_score,
        "filename": filename,
    }
    return df, rename_map, quality


def upload_dataset(file_bytes: bytes, filename: str) -> dict[str, Any]:
    _ensure_dirs()
    username = get_current_username()
    df = _read_uploaded_file(file_bytes, filename)
    clean_df, rename_map, quality = _clean_dataframe(df, filename)

    session = AnalysisSession()
    session.session_id = uuid.uuid4().hex
    session.source_name = filename
    session.uploaded_at = datetime.now(timezone.utc).isoformat()
    session.row_count = int(clean_df.shape[0])
    session.clean_df = clean_df
    session.raw_columns = list(df.columns)
    session.column_map = rename_map
    session.quality = quality
    session.chat_history = []
    session.last_model = {}
    session.last_topic = {}
    _SESSIONS[username] = session
    save_session(username)

    return {
        "session": session.as_metadata(),
        "quality": quality,
        "message": f"{filename} uploaded and analyzed successfully.",
    }


def set_session_from_dataframe(df: pd.DataFrame, filename: str = "demo_dataset.csv") -> dict[str, Any]:
    csv_bytes = df.to_csv(index=False).encode("utf-8")
    return upload_dataset(csv_bytes, filename)


def get_session() -> AnalysisSession:
    username = get_current_username()
    session = _SESSIONS.get(username)
    if session is not None and not session.clean_df.empty:
        return session
    session = _load_persisted_session(username)
    _SESSIONS[username] = session
    return session


def has_data() -> bool:
    return get_session().has_data()


def get_dataframe(filters: dict[str, Any] | None = None) -> pd.DataFrame:
    session = get_session()
    if session.clean_df.empty:
        return pd.DataFrame()
    df = session.clean_df.copy()
    filters = filters or {}

    if filters.get("year") not in (None, "", []):
        years = filters["year"]
        if isinstance(years, str):
            years = [years]
        normalized_years = []
        for item in years:
            try:
                normalized_years.append(int(str(item)))
            except ValueError:
                continue
        if normalized_years:
            df = df[df["year"].astype("Int64").isin(normalized_years)]

    for field in ("mine", "mineral", "state", "district"):
        if filters.get(field):
            values = filters[field]
            if isinstance(values, str):
                values = [values]
            wanted = {_normalize_text(v) for v in values if str(v).strip()}
            if wanted and field in df.columns:
                df = df[df[field].astype(str).map(_normalize_text).isin(wanted)]

    return df.reset_index(drop=True)


def get_filter_options() -> dict[str, list[str]]:
    df = get_dataframe()
    if df.empty:
        return {"years": [], "mines": [], "minerals": [], "states": [], "districts": []}

    def unique_values(column: str) -> list[str]:
        if column not in df.columns:
            return []
        values = [str(v) for v in df[column].dropna().unique().tolist() if str(v).strip()]
        return sorted(values)

    years = sorted({int(v) for v in pd.to_numeric(df["year"], errors="coerce").dropna().tolist()}) if "year" in df.columns else []

    def group_unique_by_state(target_column: str) -> dict[str, list[str]]:
        result: dict[str, list[str]] = {}
        if "state" not in df.columns or target_column not in df.columns:
            return result
        grouped = df[["state", target_column]].dropna()
        for state_value, group in grouped.groupby("state"):
            state_key = str(state_value).strip()
            if not state_key:
                continue
            result[state_key] = sorted(
                {str(v) for v in group[target_column].tolist() if str(v).strip()}
            )
        return result

    districts_by_state = group_unique_by_state("district")
    mines_by_state = group_unique_by_state("mine")

    return {
        "years": years,
        "mines": unique_values("mine"),
        "minerals": unique_values("mineral"),
        "states": unique_values("state"),
        "districts": unique_values("district"),
        "districts_by_state": districts_by_state,
        "mines_by_state": mines_by_state,
    }


def save_chat_turn(role: str, content: str) -> None:
    session = get_session()
    session.chat_history.append({"role": role, "content": content})
    session.chat_history = session.chat_history[-settings.assistant_history_limit :]
    save_session()


def set_last_model(metadata: dict[str, Any]) -> None:
    session = get_session()
    session.last_model = metadata
    save_session()


def get_last_topic() -> dict[str, Any]:
    """Returns the last structured-data topic (metric/filters/value) the chatbot
    discussed, used to resolve follow-up references like 'it' or 'what about...'."""
    return get_session().last_topic or {}


def set_last_topic(topic: dict[str, Any]) -> None:
    session = get_session()
    session.last_topic = topic
    save_session()
