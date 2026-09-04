from dataclasses import dataclass
import os

from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Load configuration next to the backend code even when uvicorn is started elsewhere.
load_dotenv(os.path.join(BASE_DIR, ".env"))
load_dotenv()


@dataclass
class Settings:
    database_path: str = os.getenv("DATABASE_PATH", os.path.join(BASE_DIR, "data", "app.db"))
    data_dir: str = os.getenv("DATA_DIR", os.path.join(BASE_DIR, "data"))
    upload_dir: str = os.getenv("UPLOAD_DIR", os.path.join(BASE_DIR, "data", "uploads"))
    reports_dir: str = os.getenv("REPORTS_DIR", os.path.join(BASE_DIR, "data", "reports"))
    models_dir: str = os.getenv("MODELS_DIR", os.path.join(BASE_DIR, "models"))

    groq_api_key: str = os.getenv("GROQ_API_KEY", "")
    groq_model: str = os.getenv("GROQ_MODEL", "llama3-8b-8192")
    assistant_history_limit: int = int(os.getenv("ASSISTANT_HISTORY_LIMIT", "12"))

    cors_origins: str = os.getenv("CORS_ORIGINS", "http://localhost:5173")
    max_upload_mb: int = int(os.getenv("MAX_UPLOAD_MB", "15"))


settings = Settings()
