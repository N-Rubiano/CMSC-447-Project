"""
routers/markups.py — Vector annotation endpoints for blueprint sheets.

Routes
------
GET    /api/sheets/{sid}/markups      — List markups for a sheet
POST   /api/sheets/{sid}/markups      — Add a markup annotation
DELETE /api/markups/{id}              — Delete a markup
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.auth import get_current_user
from app.models.markup import Markup

router = APIRouter(tags=["markups"])


class MarkupCreate(BaseModel):
    markup_type: str           # "text" | "arrow" | "rectangle" | "freehand" | "callout"
    geometry:    str           # JSON-encoded geometry dict
    color:       str = "#D97706"
    label:       str | None = None


@router.get("/sheets/{sheet_id}/markups")
def list_markups(
    sheet_id: int,
    db:       Session = Depends(get_db),
    user    = Depends(get_current_user),
):
    return db.query(Markup).filter(Markup.sheet_id == sheet_id).all()


@router.post("/sheets/{sheet_id}/markups", status_code=status.HTTP_201_CREATED)
def create_markup(
    sheet_id: int,
    payload:  MarkupCreate,
    db:       Session = Depends(get_db),
    user    = Depends(get_current_user),
):
    markup = Markup(sheet_id=sheet_id, author_id=user.id, **payload.model_dump())
    db.add(markup)
    db.commit()
    db.refresh(markup)
    return markup


@router.delete("/markups/{markup_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_markup(
    markup_id: int,
    db:        Session = Depends(get_db),
    user     = Depends(get_current_user),
):
    markup = db.get(Markup, markup_id)
    if not markup:
        raise HTTPException(status_code=404, detail="Markup not found.")
    if markup.author_id != user.id and user.role not in ("admin", "general_contractor"):
        raise HTTPException(status_code=403, detail="Cannot delete another user's markup.")
    db.delete(markup)
    db.commit()
