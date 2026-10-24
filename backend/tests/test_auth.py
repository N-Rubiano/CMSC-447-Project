def test_login_missing_fields(client):
    res = client.post("/api/auth/login", json={"email": "", "password": ""})
    assert res.status_code == 400

def test_login_nonexistent_user(client):
    res = client.post(
        "/api/auth/login",
        json={"email": "nonexistent_user_999@example.com", "password": "WrongPassword123!"},
    )
    assert res.status_code == 401

def test_me_authorized(client, admin_headers):
    res = client.get("/api/auth/me", headers=admin_headers)
    assert res.status_code == 200
    data = res.json()
    assert "email" in data or "role" in data

def test_me_subcontractor(client, sub_headers):
    res = client.get("/api/auth/me", headers=sub_headers)
    assert res.status_code == 200
    data = res.json()
    assert data.get("role") == "sub_contractor"
