"""routers/users.py — GET /api/users, GET /api/users/{user_id}, DELETE /api/users/{user_id}"""
from fastapi import APIRouter, Depends, HTTPException
from ..auth import get_current_user
from ..database import execute_query, execute_one, execute_write, add_audit_log

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("")
def list_users(current_user: dict = Depends(get_current_user)):
    users = execute_query("SELECT * FROM users ORDER BY name ASC")
    return [{k: v for k, v in u.items() if k != "password_hash"} for u in users]


@router.get("/{user_id}")
def get_user(user_id: str, current_user: dict = Depends(get_current_user)):
    user = execute_one("SELECT * FROM users WHERE id=:id", {"id": user_id})
    if not user:
        raise HTTPException(404, "User not found")
    return {k: v for k, v in user.items() if k != "password_hash"}


@router.delete("/{user_id}")
def delete_user(user_id: str, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(403, "Only administrators can delete users.")

    target = execute_one("SELECT id, name, email FROM users WHERE id=:id", {"id": user_id})
    if not target:
        raise HTTPException(404, "User not found")

    execute_write("DELETE FROM users WHERE id=:id", {"id": user_id})

    add_audit_log(
        action="USER_DELETED",
        user_id=current_user.get("id"),
        user_name=current_user.get("name"),
        user_role=current_user.get("role", "admin"),
        old_value=target.get("name"),
        details=f"User {target.get('name')} ({target.get('email')}) deleted by admin",
    )

    return {"message": f"User {target.get('name')} deleted successfully.", "id": user_id}
