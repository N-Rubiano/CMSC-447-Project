from app.database import execute_write, execute_one

def test_list_users(client, admin_headers):
    res = client.get("/api/users", headers=admin_headers)
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) > 0


def test_admin_can_delete_user(client, admin_headers):
    import uuid
    from datetime import datetime, timezone
    now_iso = datetime.now(timezone.utc).isoformat()
    test_id = str(uuid.uuid4())

    # Clean up prior if exists
    execute_write("DELETE FROM users WHERE id=:id", {"id": test_id})

    execute_write(
        "INSERT INTO users (id, name, email, role, created_at, updated_at) "
        "VALUES (:id, :name, :email, :role, :now, :now)",
        {"id": test_id, "name": "Temp User", "email": "tempuser@delete.test", "role": "sub_contractor", "now": now_iso}
    )

    # Admin deletes the user
    res = client.delete(f"/api/users/{test_id}", headers=admin_headers)
    assert res.status_code == 200
    assert "deleted successfully" in res.json().get("message", "").lower()

    # Verify user is gone from DB
    deleted = execute_one("SELECT id FROM users WHERE id=:id", {"id": test_id})
    assert deleted is None


def test_subcontractor_cannot_delete_user(client, sub_headers):
    # Non-admin attempting to delete should be blocked with 403
    res = client.delete("/api/users/some-user-id", headers=sub_headers)
    assert res.status_code == 403
