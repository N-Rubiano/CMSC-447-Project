"""
main.py — FastAPI application factory.

Mounts:
  - FastAPI REST API (all /api/* routes)
  - python-socketio ASGI sub-app (same port, /socket.io/ path)
  - Static file serving for /uploads/* and frontend dist/
"""
import os
import sys
from pathlib import Path

import socketio
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse

from .config import settings
from .database import init_db
from .sio import sio
from .middleware.rate_limiter import RateLimitMiddleware

# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------

app = FastAPI(
    title="PunchList Pro API",
    description="Enterprise Construction Punch List Management — Python/FastAPI backend",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS — allow the Vite dev server and production origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Rate limiting — protects all /api/* routes; stricter on /api/auth/*
app.add_middleware(RateLimitMiddleware)

# Security headers — applied to every response
@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers.setdefault("X-Frame-Options", "SAMEORIGIN")
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-XSS-Protection", "1; mode=block")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
    if os.getenv("FORCE_HTTPS", "false").lower() == "true":
        response.headers.setdefault(
            "Strict-Transport-Security", "max-age=31536000; includeSubDomains"
        )
    return response

<<<<<<< HEAD
# ── Static file uploads ────────────────────────────────────────────────────────
app.mount("/uploads", StaticFiles(directory=settings.upload_dir, check_dir=False), name="uploads")
=======
# ---------------------------------------------------------------------------
# Static files
# ---------------------------------------------------------------------------
>>>>>>> SdThakur-main

UPLOADS_DIR = Path(__file__).parent.parent / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")

# Serve frontend production build if available
FRONTEND_DIST = Path(__file__).parent.parent.parent / "frontend" / "dist"
if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIST / "assets")), name="assets")

# ---------------------------------------------------------------------------
# Register routers
# ---------------------------------------------------------------------------

from .routers import auth, users, companies, projects, sheets, pins, markups, reports, sync, tasks, documents, audit_logs, team

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(companies.router)
app.include_router(projects.router)
app.include_router(sheets.router)
app.include_router(pins.router)
app.include_router(markups.router)
app.include_router(reports.router)
app.include_router(sync.router)
app.include_router(tasks.router)
app.include_router(documents.router)
app.include_router(audit_logs.router)
app.include_router(team.router)

# ---------------------------------------------------------------------------
# SPA catch-all (serve frontend index.html for non-API routes)
# ---------------------------------------------------------------------------

from fastapi.responses import FileResponse, JSONResponse

@app.get("/health")
@app.get("/api/health")
def health():
    return {"status": "ok", "server": "PunchList Pro Python/FastAPI", "version": "2.0.0"}


@app.get("/{full_path:path}")
def spa_fallback(full_path: str):
    # Don't intercept /api or /uploads routes
    if full_path.startswith("api/") or full_path.startswith("uploads/") or full_path.startswith("socket.io"):
        return JSONResponse({"error": "Not found"}, status_code=404)
    index = FRONTEND_DIST / "index.html"
    if index.exists():
        return FileResponse(str(index))
    return JSONResponse({"message": "PunchList Pro Python/FastAPI backend is running."})


# ---------------------------------------------------------------------------
# Startup event — initialise DB schema and seed data
# ---------------------------------------------------------------------------

@app.on_event("startup")
async def on_startup():
    try:
        init_db()
        db_type = "PostgreSQL" if settings.use_postgres else "SQLite"
        print(f"🚀 PunchList Pro API (Python/FastAPI) starting on port {settings.PORT}")
        print(f"📦 Database: {db_type}")
        if settings.use_postgres:
            masked = settings.DATABASE_URL.replace(
                settings.DATABASE_URL.split("@")[0].split(":")[-1], "****"
            ) if "@" in settings.DATABASE_URL else settings.DATABASE_URL
            print(f"   → {masked}")
        print(f"📖 API docs: http://localhost:{settings.PORT}/docs")

        import asyncio
        async def _periodic_cleanup():
            while True:
                try:
                    await asyncio.sleep(300)
                    from .database import cleanup_expired_users
                    cleanup_expired_users()
                except asyncio.CancelledError:
                    break
                except Exception:
                    pass
        asyncio.create_task(_periodic_cleanup())
    except Exception as e:
        print(f"⚠️  Startup warning: {e}", file=sys.stderr)


# ---------------------------------------------------------------------------
# Wrap FastAPI app with Socket.IO ASGI app
# socket_app is the ASGI entry point used by uvicorn
# ---------------------------------------------------------------------------

socket_app = socketio.ASGIApp(
    socketio_server=sio,
    other_asgi_app=app,
    socketio_path="/socket.io",
)
