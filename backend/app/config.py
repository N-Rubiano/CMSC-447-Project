"""
config.py — Application settings loaded from environment variables.
Uses pydantic-settings for type-safe config with .env file support.
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from the backend/ directory (same folder as this package)
_env_path = Path(__file__).parent.parent / ".env"
if _env_path.exists():
    load_dotenv(_env_path)

class Settings:
    PORT: int = int(os.getenv("PORT", "4000"))
    PYTHON_ENV: str = os.getenv("PYTHON_ENV", os.getenv("NODE_ENV", "development"))

    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    PGHOST: str = os.getenv("PGHOST", "localhost")
    PGPORT: int = int(os.getenv("PGPORT", "5432"))
    PGDATABASE: str = os.getenv("PGDATABASE", "PunchList")
    PGUSER: str = os.getenv("PGUSER", "postgres")
    PGPASSWORD: str = os.getenv("PGPASSWORD", "")
    PGSSL: bool = os.getenv("PGSSL", "false").lower() == "true"
    SQLITE_PATH: str = os.getenv("SQLITE_PATH", "./data/punchlist.db")

    # Auth
    JWT_SECRET: str = os.getenv("JWT_SECRET", "punchlist-pro-secret-key-2026")
    JWT_EXPIRES_DAYS: int = 7

    # CORS
    CORS_ORIGIN: str = os.getenv(
        "CORS_ORIGIN",
        "http://localhost:5173,http://localhost:3000,http://localhost:3001"
    )

    # Uploads
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "./uploads")
    MAX_FILE_SIZE_MB: int = int(os.getenv("MAX_FILE_SIZE_MB", "150"))

    # Supabase Authentication
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")


    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGIN.split(",") if o.strip()]

    @property
    def use_postgres(self) -> bool:
        return bool(self.DATABASE_URL)

    @property
    def effective_database_url(self) -> str:
        """Return the full database URL for SQLAlchemy (sync, pg8000 or SQLite)."""
        if self.DATABASE_URL:
            url = self.DATABASE_URL
            # Replace any dialect prefix with pg8000 (pure Python driver)
            if url.startswith("postgresql+"):
                # already has a driver prefix — swap it
                url = "postgresql+pg8000://" + url.split("://", 1)[1]
            elif url.startswith("postgresql://"):
                url = url.replace("postgresql://", "postgresql+pg8000://", 1)
            elif url.startswith("postgres://"):
                url = url.replace("postgres://", "postgresql+pg8000://", 1)
            return url
        # SQLite fallback
        db_path = Path(self.SQLITE_PATH)
        db_path.parent.mkdir(parents=True, exist_ok=True)
        return f"sqlite:///{db_path.resolve()}"

settings = Settings()
