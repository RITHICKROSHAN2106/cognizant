import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database.mongo_seed import seed_mongodb

@pytest.fixture(scope="session", autouse=True)
def setup_db():
    seed_mongodb()

@pytest.fixture
def client():
    return TestClient(app)
