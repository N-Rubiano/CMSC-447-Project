"""routers/users.py — GET /api/users"""
from fastapi import APIRouter, Depends
from ..auth import get_current_user
from ..database import execute_query, execute_one

router = APIRouter(prefix="/api/users", tags=["users"])

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, ConfigDict

from app.auth import get_current_user
from app.database import get_db
from app.permissions import require_capability, ADMIN
from app.models.user import User

router = APIRouter(prefix="/users", tags=["users"])


class UserUpdate(BaseModel):
    full_name:  str | None = None
    role:       str | None = None
    company_id: int | None = None
    is_active:  bool | None = None


class UserResponse(BaseModel):
    """Only public profile fields may leave the user endpoints."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    full_name: str
    role: str
    company_id: int | None
    is_active: bool


@router.get("/", response_model=list[UserResponse])
def list_users(
    db:   Session = Depends(get_db),
    user = Depends(require_capability("team.manage")),
):
    return db.query(User).all()


@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: int,
    db:      Session = Depends(get_db),
    user   = Depends(get_current_user),
):
    target = db.get(User, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found.")
    return target


@router.patch("/{user_id}", response_model=UserResponse)
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
