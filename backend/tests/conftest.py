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

@pytest.fixture
def admin_user():
    return {
        "id": "00000000-0000-0000-0000-000000000001",
        "email": "admin@punchlistpro.demo",
        "role": "admin",
        "company": "PunchList Pro Admin",
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
        "id": "00000000-0000-0000-0000-000000000002",
        "email": "sub@punchlistpro.demo",
        "role": "sub_contractor",
        "company": "Apex Mechanical",
        "company_id": "00000000-0000-0000-0000-000000000020",
    }

@pytest.fixture
def sub_token(sub_user):
    return create_token(sub_user)

@pytest.fixture
def sub_headers(sub_token):
    return {"Authorization": f"Bearer {sub_token}"}
