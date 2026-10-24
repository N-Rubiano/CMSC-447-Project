"""routers/users.py — GET /api/users"""
from fastapi import APIRouter, Depends
from ..auth import get_current_user
from ..database import execute_query, execute_one

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
