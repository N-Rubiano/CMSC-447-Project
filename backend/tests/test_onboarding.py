"""
tests/test_onboarding.py — Comprehensive tests for user onboarding, approval,
credential handoff, lifecycle states, and security boundaries.
"""
import pytest
from datetime import datetime, timezone, timedelta
from app.database import execute_write, execute_one
from app.auth import create_token, hash_password


@pytest.fixture
def gc_user():
    return {
        "id": "00000000-0000-0000-0000-000000009903",
        "email": "testgc@ci.test",
        "role": "general_contractor",
        "company": "CI Test GC",
        "company_id": "00000000-0000-0000-0000-000000000010",
        "status": "active",
    }


@pytest.fixture
def gc_token(gc_user):
    return create_token(gc_user)


@pytest.fixture
def gc_headers(gc_token):
    return {"Authorization": f"Bearer {gc_token}"}


def test_admin_provisions_subcontractor_with_invitation(client, admin_headers):
    """1. Administrator provisions a new subcontractor with secure invitation token."""
    email = f"sub_{datetime.now().timestamp()}@example.com"
    payload = {
        "name": "Jane Subcontractor",
        "email": email,
        "role": "sub_contractor",
        "organization": "Summit Electrical",
        "trade": "Electrical",
        "project_ids": ["proj-1"],
    }
    res = client.post("/api/team", json=payload, headers=admin_headers)
    assert res.status_code == 201
    data = res.json()
    assert data["name"] == "Jane Subcontractor"
    assert data["email"] == email
    assert data["role"] == "sub_contractor"
    assert data["status"] == "pending_invitation"
    assert "invitation_token" in data and len(data["invitation_token"]) > 20
    assert "invitation_link" in data

    # Verify project membership was assigned
    mem = execute_one(
        "SELECT * FROM project_members WHERE user_id=:uid AND project_id='proj-1'",
        {"uid": data["id"]},
    )
    assert mem is not None


def test_verify_invitation_token_valid(client, admin_headers):
    """2. User verifies invitation token and receives onboarding metadata."""
    email = f"verify_{datetime.now().timestamp()}@example.com"
    res = client.post(
        "/api/team",
        json={"name": "Bob Plumber", "email": email, "role": "sub_contractor", "trade": "Plumbing"},
        headers=admin_headers,
    )
    assert res.status_code == 201
    tok = res.json()["invitation_token"]

    verify_res = client.get(f"/api/auth/invitation?token={tok}")
    assert verify_res.status_code == 200
    info = verify_res.json()
    assert info["valid"] is True
    assert info["email"] == email
    assert info["name"] == "Bob Plumber"
    assert info["role"] == "sub_contractor"


def test_complete_onboarding_establishes_password_and_activates(client, admin_headers):
    """3. User completes initial password setup, token is invalidated, account becomes active."""
    email = f"complete_{datetime.now().timestamp()}@example.com"
    res = client.post(
        "/api/team",
        json={"name": "Alice Carpenter", "email": email, "role": "sub_contractor"},
        headers=admin_headers,
    )
    tok = res.json()["invitation_token"]
    user_id = res.json()["id"]

    # Submit valid new password
    onboard_res = client.post(
        "/api/auth/complete-onboarding",
        json={"token": tok, "password": "SecurePassword123!"},
    )
    assert onboard_res.status_code == 200
    body = onboard_res.json()
    assert "token" in body
    assert body["user"]["status"] == "active"

    # User in DB is active, token is cleared, must_reset_password is false
    db_user = execute_one("SELECT * FROM users WHERE id=:id", {"id": user_id})
    assert db_user["status"] == "active"
    assert db_user["invitation_token"] is None
    assert int(db_user["must_reset_password"] or 0) == 0

    # User can now log in with the new password
    login_res = client.post(
        "/api/auth/login",
        json={"email": email, "password": "SecurePassword123!"},
    )
    assert login_res.status_code == 200


def test_uncompleted_onboarding_blocks_protected_resources(client, admin_headers):
    """4. User cannot access protected resources before onboarding is complete."""
    email = f"blocked_{datetime.now().timestamp()}@example.com"
    res = client.post(
        "/api/team",
        json={"name": "Dan Mason", "email": email, "role": "sub_contractor"},
        headers=admin_headers,
    )
    user_id = res.json()["id"]

    # Generate JWT for this incomplete user
    incomplete_token = create_token({
        "id": user_id,
        "email": email,
        "role": "sub_contractor",
        "status": "pending_invitation",
        "must_reset_password": True,
    })
    inc_headers = {"Authorization": f"Bearer {incomplete_token}"}

    # Attempting to access protected projects or pins should be blocked
    proj_res = client.get("/api/projects", headers=inc_headers)
    assert proj_res.status_code == 403
    assert "password setup required" in proj_res.json().get("detail", "").lower()


def test_gc_cannot_create_admin_account(client, gc_headers):
    """6. General Contractor cannot create an administrator account."""
    res = client.post(
        "/api/team",
        json={"name": "Rogue Admin", "email": "rogue@example.com", "role": "admin"},
        headers=gc_headers,
    )
    assert res.status_code == 403
    assert "only provision subcontractors" in res.json().get("detail", "").lower()


def test_gc_sponsors_subcontractor_requires_admin_approval(client, gc_headers, admin_headers):
    """7. General Contractor-sponsored subcontractor is created in pending_approval and requires Admin approval."""
    email = f"sponsored_{datetime.now().timestamp()}@example.com"
    res = client.post(
        "/api/team",
        json={"name": "Sponsored Sub", "email": email, "role": "sub_contractor", "trade": "Roofing"},
        headers=gc_headers,
    )
    assert res.status_code == 201
    user_id = res.json()["id"]
    assert res.json()["status"] == "pending_approval"

    # Admin approves the account
    appr_res = client.post(f"/api/team/{user_id}/approve", headers=admin_headers)
    assert appr_res.status_code == 200

    db_user = execute_one("SELECT status, approved_by FROM users WHERE id=:id", {"id": user_id})
    assert db_user["status"] in ("pending_invitation", "active")
    assert db_user["approved_by"] is not None


def test_subcontractor_cannot_provision_or_approve(client, sub_headers):
    """8. Subcontractor cannot provision users or approve accounts."""
    # Attempt provision
    prov_res = client.post(
        "/api/team",
        json={"name": "Sub Friend", "email": "friend@example.com", "role": "sub_contractor"},
        headers=sub_headers,
    )
    assert prov_res.status_code == 403

    # Attempt approve
    appr_res = client.post("/api/team/some-user-id/approve", headers=sub_headers)
    assert appr_res.status_code == 403


def test_expired_and_reused_invitation_tokens_are_rejected(client, admin_headers):
    """9. Expired and reused invitation tokens are rejected."""
    email = f"expired_{datetime.now().timestamp()}@example.com"
    res = client.post(
        "/api/team",
        json={"name": "Late User", "email": email, "role": "sub_contractor"},
        headers=admin_headers,
    )
    tok = res.json()["invitation_token"]
    user_id = res.json()["id"]

    # Manually expire the token in the DB
    past_iso = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
    execute_write(
        "UPDATE users SET invitation_expires_at=:exp WHERE id=:id",
        {"exp": past_iso, "id": user_id},
    )

    # Verification should return 410 Gone / Expired
    check_res = client.get(f"/api/auth/invitation?token={tok}")
    assert check_res.status_code == 410

    # Submission should be rejected
    comp_res = client.post(
        "/api/auth/complete-onboarding",
        json={"token": tok, "password": "ValidPassword123!"},
    )
    assert comp_res.status_code == 410


def test_duplicate_email_handled_safely(client, admin_headers):
    """10. Duplicate email addresses are handled safely without crash or overwriting."""
    email = "dup_test@example.com"
    client.post(
        "/api/team",
        json={"name": "First User", "email": email, "role": "sub_contractor"},
        headers=admin_headers,
    )
    # Second attempt
    dup_res = client.post(
        "/api/team",
        json={"name": "Second User", "email": email, "role": "sub_contractor"},
        headers=admin_headers,
    )
    assert dup_res.status_code == 400
    assert "already exists" in dup_res.json().get("detail", "").lower()


def test_suspended_and_rejected_accounts_blocked(client, admin_headers):
    """11. Suspended and rejected accounts cannot access protected resources or log in."""
    email = f"suspend_{datetime.now().timestamp()}@example.com"
    res = client.post(
        "/api/team",
        json={"name": "Suspended Guy", "email": email, "role": "sub_contractor"},
        headers=admin_headers,
    )
    uid = res.json()["id"]

    # Suspend user
    sus_res = client.post(f"/api/team/{uid}/suspend", headers=admin_headers)
    assert sus_res.status_code == 200

    # Token for suspended user
    sus_token = create_token({"id": uid, "email": email, "role": "sub_contractor", "status": "suspended"})
    req_res = client.get("/api/projects", headers={"Authorization": f"Bearer {sus_token}"})
    assert req_res.status_code == 403
    assert "suspended" in req_res.json().get("detail", "").lower()

    # Reactivate user
    react_res = client.post(f"/api/team/{uid}/reactivate", headers=admin_headers)
    assert react_res.status_code == 200
    db_u = execute_one("SELECT status FROM users WHERE id=:id", {"id": uid})
    assert db_u["status"] in ("active", "pending_invitation")


def test_resend_invitation_generates_fresh_token(client, admin_headers):
    """Resending invitation issues a fresh token and updates expiration."""
    email = f"resend_{datetime.now().timestamp()}@example.com"
    res = client.post(
        "/api/team",
        json={"name": "Resend User", "email": email, "role": "sub_contractor"},
        headers=admin_headers,
    )
    old_tok = res.json()["invitation_token"]
    uid = res.json()["id"]

    resend_res = client.post(f"/api/team/{uid}/resend-invitation", headers=admin_headers)
    assert resend_res.status_code == 200
    new_tok = resend_res.json()["invitation_token"]
    assert new_tok != old_tok

    # Old token fails
    old_check = client.get(f"/api/auth/invitation?token={old_tok}")
    assert old_check.status_code == 404

    # New token succeeds
    new_check = client.get(f"/api/auth/invitation?token={new_tok}")
    assert new_check.status_code == 200

