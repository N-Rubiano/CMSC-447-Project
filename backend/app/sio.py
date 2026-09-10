"""
sio.py — python-socketio AsyncServer (real-time event hub).

Responsibilities
----------------
- Broadcasts punch pin create / update / delete events to all
  connected project members so the canvas stays live.
- Broadcasts comment and photo additions.
- Handles room-based subscriptions (one room per project_id).

Usage
-----
Mount `sio_app` onto the FastAPI app in main.py::

    from app.sio import sio_app
    app.mount("/socket.io", sio_app)

Client-side (JavaScript)::

    import { io } from "socket.io-client";
    const socket = io({ path: "/socket.io" });
    socket.emit("join_project", { project_id: 42 });
    socket.on("pin_updated", (data) => { ... });
"""

import socketio

# AsyncServer compatible with Uvicorn ASGI
sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins="*",   # Tighten in production
    logger=False,
    engineio_logger=False,
)

sio_app = socketio.ASGIApp(sio, socketio_path="")


# ── Connection lifecycle ───────────────────────────────────────────────────────

@sio.event
async def connect(sid, environ, auth):
    """Called when a client establishes a WebSocket connection."""
    print(f"[socket.io] client connected: {sid}")


@sio.event
async def disconnect(sid):
    print(f"[socket.io] client disconnected: {sid}")


# ── Room management ────────────────────────────────────────────────────────────

@sio.on("join_project")
async def join_project(sid, data: dict):
    """Subscribe a client to a project room."""
    project_id = data.get("project_id")
    if project_id:
        await sio.enter_room(sid, f"project_{project_id}")


@sio.on("leave_project")
async def leave_project(sid, data: dict):
    project_id = data.get("project_id")
    if project_id:
        await sio.leave_room(sid, f"project_{project_id}")


# ── Helper broadcast functions (called from routers) ──────────────────────────

async def broadcast_pin_event(event: str, project_id: int, payload: dict):
    """
    Emit a pin-related event to all members of a project room.
    event examples: 'pin_created', 'pin_updated', 'pin_deleted', 'pin_closed'
    """
    await sio.emit(event, payload, room=f"project_{project_id}")


async def broadcast_comment(project_id: int, payload: dict):
    await sio.emit("comment_added", payload, room=f"project_{project_id}")


async def broadcast_photo(project_id: int, payload: dict):
    await sio.emit("photo_added", payload, room=f"project_{project_id}")
