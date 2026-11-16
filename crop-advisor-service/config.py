"""Central configuration (paths + environment-driven settings)."""
import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

DATA_PATH = BASE_DIR / "data" / "crop_yield.csv"
MODEL_PATH = BASE_DIR / "models" / "yield_model.joblib"
REPORT_DIR = BASE_DIR / "reports"


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-only-change-me")
    API_KEY = os.getenv("API_KEY", "").strip()
    RATE_LIMIT_PER_MIN = int(os.getenv("RATE_LIMIT_PER_MIN", "120"))
    MAX_CONTENT_LENGTH = 64 * 1024          # 64 KB request bodies are plenty
    JSON_SORT_KEYS = False
    HOST = os.getenv("HOST", "127.0.0.1")
    PORT = int(os.getenv("PORT", "5000"))
