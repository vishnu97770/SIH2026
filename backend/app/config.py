from dataclasses import dataclass
import os

from dotenv import load_dotenv

load_dotenv()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


@dataclass
class Settings:
    database_path: str = os.getenv("DATABASE_PATH", os.path.join(BASE_DIR, "data", "app.db"))
    data_dir: str = os.getenv("DATA_DIR", os.path.join(BASE_DIR, "data"))
    upload_dir: str = os.getenv("UPLOAD_DIR", os.path.join(BASE_DIR, "data", "uploads"))
    reports_dir: str = os.getenv("REPORTS_DIR", os.path.join(BASE_DIR, "data", "reports"))
    chroma_path: str = os.getenv("CHROMA_PATH", os.path.join(BASE_DIR, "data", "chroma"))

    llm_provider: str = os.getenv("LLM_PROVIDER", "openai")
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    llm_model: str = os.getenv("LLM_MODEL", "gpt-4o-mini")
    embedding_model: str = os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")

    ocr_enabled: bool = os.getenv("OCR_ENABLED", "true").lower() == "true"
    ocr_min_text_per_page: int = int(os.getenv("OCR_MIN_TEXT_PER_PAGE", "20"))

    cors_origins: str = os.getenv("CORS_ORIGINS", "http://localhost:5173")


settings = Settings()
