import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database.mongo_seed import seed_mongodb
from app.security.jwt import create_access_token


@pytest.fixture(scope="session", autouse=True)
def setup_db():
    seed_mongodb()


@pytest.fixture
def unauthenticated_client():
    return TestClient(app)


@pytest.fixture
def client():
    """Authenticated clinical staff test client with physician role."""
    token_payload = {
        "sub": "dr.sarah",
        "user_id": 1,
        "staff_id": "DOC-00124",
        "role": "physician",
        "session_id": "pytest-session-doc"
    }
    token = create_access_token(token_payload)
    tc = TestClient(app)
    tc.headers.update({"Authorization": f"Bearer {token}"})
    return tc


@pytest.fixture
def admin_client():
    """Authenticated administrator test client."""
    token_payload = {
        "sub": "admin",
        "user_id": 100,
        "staff_id": "ADM-00001",
        "role": "administrator",
        "session_id": "pytest-session-admin"
    }
    token = create_access_token(token_payload)
    tc = TestClient(app)
    tc.headers.update({"Authorization": f"Bearer {token}"})
    return tc
