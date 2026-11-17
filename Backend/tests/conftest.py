import os
import sys
import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.database import SessionLocal
from app.models.user import User

@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:
        yield c

@pytest.fixture(scope="session")
def db_session():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()

def get_auth_token(client: TestClient, email: str, password: str) -> str:
    res = client.post("/api/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, f"Login failed for {email}: {res.text}"
    return res.json()["data"]["access_token"]

@pytest.fixture(scope="session")
def admin_headers(client):
    token = get_auth_token(client, "admin@servisync.com", "Admin@123")
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture(scope="session")
def manager_headers(client):
    token = get_auth_token(client, "manager@servisync.com", "Manager@123")
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture(scope="session")
def dispatcher_headers(client):
    token = get_auth_token(client, "dispatcher@servisync.com", "Dispatcher@123")
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture(scope="session")
def tech_headers(client):
    token = get_auth_token(client, "tech.alex@servisync.com", "Tech@123")
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture(scope="session")
def customer_headers(client):
    token = get_auth_token(client, "customer.john@example.com", "Customer@123")
    return {"Authorization": f"Bearer {token}"}
