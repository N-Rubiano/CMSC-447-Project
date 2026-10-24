"""
sio.py — Shared python-socketio AsyncServer instance.

Mounted as an ASGI sub-app in main.py so the React frontend's
socket.io-client connects to the same port as the REST API.
"""
import json
import uuid
from decimal import Decimal
from datetime import date, datetime
import socketio


class SafeJSONEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, Decimal):
            return float(o)
        if isinstance(o, (datetime, date)):
            return o.isoformat()
        if isinstance(o, uuid.UUID):
            return str(o)
        return super().default(o)


class SafeJSON:
    @staticmethod
    def dumps(*args, **kwargs):
        kwargs.setdefault("cls", SafeJSONEncoder)
        return json.dumps(*args, **kwargs)

    @staticmethod
    def loads(*args, **kwargs):
        return json.loads(*args, **kwargs)


# Use the AsyncServer so we can emit from async route handlers
sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins="*",
    logger=False,
    engineio_logger=False,
    json=SafeJSON,
)


@sio.event
async def connect(sid, environ, auth=None):
    pass  # connections are unauthenticated at the socket level (JWT is in REST)


@sio.event
async def disconnect(sid):
    pass


@sio.event
async def join_project(sid, project_id):
    """Client sends 'join:project' to subscribe to project-scoped broadcasts."""
    await sio.enter_room(sid, f"project:{project_id}")


@sio.event
async def leave_project(sid, project_id):
    await sio.leave_room(sid, f"project:{project_id}")


# Map Node.js camelCase event names to their snake_case Python equivalents
# The frontend uses these exact event strings:
#   join:project / leave:project → handled via 'join_project' / 'leave_project' above
#   BUT socket.io-client sends event names with colons — we need to register
#   both the snake_case AND the colon variant.

@sio.on("join:project")
async def _join_project(sid, data):
    await sio.enter_room(sid, f"project:{data}")


@sio.on("leave:project")
async def _leave_project(sid, data):
    await sio.leave_room(sid, f"project:{data}")
