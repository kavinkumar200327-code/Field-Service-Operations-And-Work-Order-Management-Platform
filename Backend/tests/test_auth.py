import pytest
import uuid

def test_login_success(client):
    res = client.post("/api/auth/login", json={
        "email": "admin@servisync.com",
        "password": "Admin@123"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "access_token" in data["data"]
    assert data["data"]["user"]["role"] == "SUPER_ADMIN"

def test_login_invalid_password(client):
    res = client.post("/api/auth/login", json={
        "email": "admin@servisync.com",
        "password": "WrongPassword123"
    })
    assert res.status_code == 401
    data = res.json()
    assert data["success"] is False
    assert data["error"]["code"] == "INVALID_CREDENTIALS"

def test_get_current_user_me(client, admin_headers):
    res = client.get("/api/auth/me", headers=admin_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["data"]["email"] == "admin@servisync.com"

def test_register_new_customer(client):
    unique_email = f"test.user.{uuid.uuid4().hex[:8]}@example.com"
    res = client.post("/api/auth/register", json={
        "email": unique_email,
        "password": "Password@123",
        "full_name": "Test Customer Registration",
        "phone": "+1 555-010-0099",
        "role": "CUSTOMER",
        "address": "123 Test Street",
        "service_location": "123 Test Street Main House",
    })
    assert res.status_code == 201
    data = res.json()
    assert data["success"] is True
    assert data["data"]["user"]["email"] == unique_email

def test_register_duplicate_email(client):
    res = client.post("/api/auth/register", json={
        "email": "admin@servisync.com",
        "password": "Password@123",
        "full_name": "Duplicate User",
    })
    assert res.status_code == 409
    data = res.json()
    assert data["success"] is False
    assert data["error"]["code"] == "USER_ALREADY_EXISTS"

def test_update_profile_me(client, admin_headers):
    res = client.patch("/api/auth/me", headers=admin_headers, json={
        "full_name": "Edward Sterling Updated",
        "phone": "+1 (555) 999-8888"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["data"]["full_name"] == "Edward Sterling Updated"
    assert data["data"]["phone"] == "+1 (555) 999-8888"

    # Reset back to original name for consistency across tests
    client.patch("/api/auth/me", headers=admin_headers, json={
        "full_name": "Edward Sterling (Super Admin)",
        "phone": "+1 (555) 019-2831"
    })
