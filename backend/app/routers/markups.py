"""routers/markups.py — Vector annotation CRUD for blueprint sheets"""
import uuid
import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from ..auth import get_current_user
from ..database import execute_query, execute_one, execute_write, settings
from ..permissions import can_user_access_project
from ..sio import sio

router = APIRouter(tags=["markups"])


@router.get("/api/sheets/{sheet_id}/markups")
def get_markups(sheet_id: str, current_user: dict = Depends(get_current_user)):
    return execute_query(
        "SELECT * FROM markups WHERE sheet_id=:sid ORDER BY created_at ASC",
        {"sid": sheet_id},
    )


@router.post("/api/sheets/{sheet_id}/markups", status_code=201)
async def create_markup(sheet_id: str, body: dict, current_user: dict = Depends(get_current_user)):
    markup_id = f"mrk-{uuid.uuid4().hex[:8]}"
    now = datetime.now(timezone.utc).isoformat()
    mtype = body.get("type", "freehand")
    data = body.get("data")
    data_str = json.dumps(data) if data is not None else None
    author_id = body.get("author_id", current_user.get("id"))

    execute_write(
        """INSERT INTO markups (id,sheet_id,author_id,type,data,created_at)
           VALUES (:id,:sid,:aid,:type,:data,:now)""",
        dict(id=markup_id, sid=sheet_id, aid=author_id, type=mtype, data=data_str, now=now),
    )

    created = execute_one("SELECT * FROM markups WHERE id=:id", {"id": markup_id})
    sheet = execute_one("SELECT project_id FROM sheets WHERE id=:id", {"id": sheet_id})
    if sheet:
        await sio.emit("markup:added", {"sheetId": sheet_id, "markup": created},
                       room=f"project:{sheet['project_id']}")
    return created


@router.delete("/api/markups/{markup_id}")
async def delete_markup(markup_id: str, current_user: dict = Depends(get_current_user)):
    markup = execute_one("SELECT * FROM markups WHERE id=:id", {"id": markup_id})
    if not markup:
        raise HTTPException(404, "Markup not found")
    execute_write("DELETE FROM markups WHERE id=:id", {"id": markup_id})
    sheet = execute_one("SELECT project_id FROM sheets WHERE id=:id", {"id": markup.get("sheet_id")})
    if sheet:
        await sio.emit("markup:deleted",
                       {"sheetId": markup.get("sheet_id"), "markupId": markup_id},
                       room=f"project:{sheet['project_id']}")
    return {"message": "Markup deleted"}
