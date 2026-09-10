"""
main.py — FastAPI application entry point.

Startup sequence
----------------
1. Load settings from .env via config.py
2. Create all DB tables via database.init_db()
3. Register all API routers under /api prefix
4. Mount Socket.IO ASGI app at /socket.io
5. Serve static file uploads at /uploads

Interactive docs
----------------
- Swagger UI: http://localhost:4000/docs
- ReDoc:      http://localhost:4000/redoc
"""

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import init_db
from app.sio import sio_app

# ── Routers ────────────────────────────────────────────────────────────────────
from app.routers import (
    auth,
    projects,
    sheets,
    pins,
    markups,
    reports,
    sync,
    tasks,
    users,
    companies,
)


# ── Lifespan (replaces deprecated @app.on_event) ──────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create DB tables and ensure upload directory exists
    init_db()
    os.makedirs(settings.upload_dir, exist_ok=True)
    yield
    # Shutdown: add cleanup logic here if needed


# ── FastAPI app ────────────────────────────────────────────────────────────────

app = FastAPI(
    title="PunchList Pro API",
    description=(
        "Enterprise construction field management & inspection platform. "
        "Tablet-first, offline-capable, real-time synchronized."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS (allow Vite dev server on port 3000) ──────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── API routers ────────────────────────────────────────────────────────────────
PREFIX = "/api"

app.include_router(auth.router,       prefix=PREFIX)
app.include_router(users.router,      prefix=PREFIX)
app.include_router(companies.router,  prefix=PREFIX)
app.include_router(projects.router,   prefix=PREFIX)
app.include_router(sheets.router,     prefix=PREFIX)
app.include_router(pins.router,       prefix=PREFIX)
app.include_router(markups.router,    prefix=PREFIX)
app.include_router(comments_photos := tasks.router, prefix=PREFIX)  # placeholder
app.include_router(reports.router,    prefix=PREFIX)
app.include_router(sync.router,       prefix=PREFIX)
app.include_router(tasks.router,      prefix=PREFIX)

# ── Static file uploads ────────────────────────────────────────────────────────
app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")

# ── Socket.IO ASGI mount ───────────────────────────────────────────────────────
app.mount("/socket.io", sio_app)


# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/health", tags=["health"])
def health():
    return {"status": "ok", "service": "punchlist-pro"}


# ── Dev server entrypoint ─────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=True,
    )
