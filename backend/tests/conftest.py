import os
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.auth import create_token
from app.database import init_db

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    """Ensure database schema is initialized before running tests."""
    init_db()

@pytest.fixture(scope="session")
def client():
    """TestClient instance for making API requests."""
    with TestClient(app) as test_client:
        yield test_client

# NOTE: IDs 00000000-0000-0000-0000-000000000001 and ...000002 are
#       reserved by seed_temp_admin() for the demo admin accounts.
#       Use IDs in the 000099xx range to avoid collisions.

@pytest.fixture
def admin_user():
    return {
        "id": "00000000-0000-0000-0000-000000009901",
        "email": "testadmin@ci.test",
        "role": "admin",
        "company": "CI Test Admin",
        "company_id": "00000000-0000-0000-0000-000000000010",
    }

@pytest.fixture
def admin_token(admin_user):
    return create_token(admin_user)

@pytest.fixture
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}

@pytest.fixture
def sub_user():
    return {
        "id": "00000000-0000-0000-0000-000000009902",
        "email": "testsub@ci.test",
        "role": "sub_contractor",
        "company": "CI Test Mechanical",
        "company_id": "00000000-0000-0000-0000-000000000020",
    }

@pytest.fixture
def sub_token(sub_user):
    return create_token(sub_user)

@pytest.fixture
def sub_headers(sub_token):
    return {"Authorization": f"Bearer {sub_token}"}
