"""
routers/users.py — User management endpoints (admin/GC team allocation).

Routes
------
GET    /api/users              — List all users (admin only)
GET    /api/users/{id}         — Get a user profile
PATCH  /api/users/{id}         — Update user info / role (admin only)
DELETE /api/users/{id}         — Deactivate a user (admin only)
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr

from app.auth import get_current_user, hash_password
from app.database import get_db
from app.permissions import require_capability, ADMIN
from app.models.user import User

router = APIRouter(prefix="/users", tags=["users"])


class UserUpdate(BaseModel):
    full_name:  str | None = None
    role:       str | None = None
    company_id: int | None = None
    is_active:  bool | None = None


@router.get("/")
def list_users(
    db:   Session = Depends(get_db),
    user = Depends(require_capability("team.manage")),
):
    return db.query(User).all()


@router.get("/{user_id}")
def get_user(
    user_id: int,
    db:      Session = Depends(get_db),
    user   = Depends(get_current_user),
):
    target = db.get(User, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found.")
    return target


@router.patch("/{user_id}")
def update_user(
    user_id: int,
    payload: UserUpdate,
    db:      Session = Depends(get_db),
    user   = Depends(require_capability("team.manage")),
):
    target = db.get(User, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found.")
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(target, k, v)
    db.commit()
    db.refresh(target)
    return target


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def deactivate_user(
    user_id: int,
    db:      Session = Depends(get_db),
    user   = Depends(require_capability("team.manage")),
):
    target = db.get(User, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found.")
    target.is_active = False
    db.commit()
