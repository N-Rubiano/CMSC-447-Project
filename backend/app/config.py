"""
config.py — Application settings loaded from .env via python-dotenv.

All environment variables are read once at startup and exposed as a
single `settings` object imported throughout the app.
"""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # ── Database ──────────────────────────────────────────────
    database_url: str = ""          # PostgreSQL DSN; empty → SQLite fallback
    sqlite_path: str = "./punchlist.db"

    # ── JWT Auth ──────────────────────────────────────────────
    secret_key: str = "change-me"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60

    # ── Server ────────────────────────────────────────────────
    host: str = "0.0.0.0"
    port: int = 4000

    # ── Uploads ───────────────────────────────────────────────
    upload_dir: str = "./uploads"
    max_upload_mb: int = 50

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
