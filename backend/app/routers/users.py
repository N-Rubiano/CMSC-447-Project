"""routers/users.py — GET /api/users"""
from fastapi import APIRouter, Depends
from ..auth import get_current_user
from ..database import execute_query, execute_one

<<<<<<< HEAD
Routes
------
GET    /api/users              — List all users (admin only)
GET    /api/users/{id}         — Get a user profile
PATCH  /api/users/{id}         — Update user info / role (admin only)
DELETE /api/users/{id}         — Deactivate a user (admin only)
"""

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
=======
router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("")
def list_users(current_user: dict = Depends(get_current_user)):
    users = execute_query("SELECT * FROM users ORDER BY name ASC")
    return [{k: v for k, v in u.items() if k != "password_hash"} for u in users]


@router.get("/{user_id}")
def get_user(user_id: str, current_user: dict = Depends(get_current_user)):
    from fastapi import HTTPException
    user = execute_one("SELECT * FROM users WHERE id=:id", {"id": user_id})
    if not user:
        raise HTTPException(404, "User not found")
    return {k: v for k, v in user.items() if k != "password_hash"}
>>>>>>> SdThakur-main
