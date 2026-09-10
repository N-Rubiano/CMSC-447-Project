"""
routers/sync.py — Offline sync queue endpoints for Dexie.js background sync.

When the device reconnects, the frontend flushes queued mutations here.

Routes
------
POST /api/sync/push   — Accept a batch of offline operations and apply them
GET  /api/sync/pull   — Return delta of records updated since a client timestamp
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime

from app.auth import get_current_user
from app.database import get_db

router = APIRouter(prefix="/sync", tags=["sync"])


class SyncOperation(BaseModel):
    """A single queued offline mutation."""
    operation:  str        # "create" | "update" | "delete"
    entity:     str        # "pin" | "comment" | "photo" | "markup"
    entity_id:  int | None = None
    payload:    dict


class SyncPushRequest(BaseModel):
    operations: list[SyncOperation]


@router.post("/push")
def push_sync(
    body: SyncPushRequest,
    db:   Session = Depends(get_db),
    user = Depends(get_current_user),
):
    """
    Apply a batch of offline-queued mutations.
    TODO: implement conflict resolution and per-entity dispatch
    to the appropriate service/router handler.
    """
    results = []
    for op in body.operations:
        # Stub: log and acknowledge each operation
        results.append({"entity": op.entity, "operation": op.operation, "status": "queued"})
    return {"applied": len(results), "results": results}


@router.get("/pull")
def pull_sync(
    since:  str = "1970-01-01T00:00:00Z",
    db:     Session = Depends(get_db),
    user  = Depends(get_current_user),
):
    """
    Return all records updated after `since` timestamp for the current user's projects.
    TODO: query Pin, Comment, Photo, Markup tables filtered by updated_at > since
    and scoped to the user's accessible projects.
    """
    return {
        "since":   since,
        "pins":    [],
        "comments": [],
        "photos":  [],
        "markups": [],
    }
