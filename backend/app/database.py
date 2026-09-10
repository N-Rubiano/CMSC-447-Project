"""
database.py — Dual-engine database setup (PostgreSQL primary / SQLite fallback).

Architecture
------------
- Uses SQLAlchemy 2.0 async-compatible declarative base.
- If `settings.database_url` is populated → connects to PostgreSQL via pg8000.
- Otherwise → falls back to a local SQLite file at `settings.sqlite_path`.
- `init_db()` creates all tables on startup (development convenience).
  Replace with Alembic migrations for production.

Usage
-----
    from app.database import get_db, Base

    # In a FastAPI route:
    async def route(db: Session = Depends(get_db)):
        ...
"""

from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from app.config import settings
import os


# ── Engine selection ──────────────────────────────────────────────────────────

def _build_engine():
    if settings.database_url:
        # PostgreSQL via pg8000 (pure-Python, zero C-deps)
        url = settings.database_url
        if url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+pg8000://", 1)
        return create_engine(url, echo=False)
    else:
        # SQLite fallback
        db_path = os.path.abspath(settings.sqlite_path)
        engine = create_engine(
            f"sqlite:///{db_path}",
            connect_args={"check_same_thread": False},
            echo=False,
        )
        # Enable WAL mode for better concurrent read performance
        @event.listens_for(engine, "connect")
        def set_sqlite_pragma(conn, _):
            conn.execute("PRAGMA journal_mode=WAL")
            conn.execute("PRAGMA foreign_keys=ON")
        return engine


engine = _build_engine()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


# ── Declarative Base ─────────────────────────────────────────────────────────

class Base(DeclarativeBase):
    """Shared base class for all ORM models."""
    pass


# ── FastAPI dependency ────────────────────────────────────────────────────────

def get_db():
    """Yield a database session and ensure it is closed after the request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ── Table initialisation ─────────────────────────────────────────────────────

def init_db():
    """Create all tables defined via ORM models.  Call once at startup."""
    # Import all models here so Base.metadata knows about them
    from app.models import user, project, sheet, pin, comment, photo, task, company  # noqa: F401
    Base.metadata.create_all(bind=engine)
