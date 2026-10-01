"""PocketSmart AI - Comprehensive Backend Test Suite.

Tests authentication, planners (Home, Party, Jewelry), validation,
fallbacks, and authorization boundaries without requiring a live Gemini API.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.database.database import Base, get_db

# Use an isolated in-memory SQLite database for testing
SQLALCHEMY_TEST_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(SQLALCHEMY_TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


class TestAuthentication:
    def test_register_success(self):
        payload = {
            "name": "Alex Mercer",
            "email": "alex.mercer@example.com",
            "password": "SecurePassword123!"
        }
        res = client.post("/api/auth/register", json=payload)
        assert res.status_code == 201
        data = res.json()
        assert "access_token" in data
        assert data["user"]["email"] == "alex.mercer@example.com"
        assert "password" not in data["user"]

    def test_register_duplicate_email(self):
        payload = {
            "name": "Alex Mercer Duplicate",
            "email": "alex.mercer@example.com",
            "password": "SecurePassword123!"
        }
        res = client.post("/api/auth/register", json=payload)
        assert res.status_code == 400
        assert "already exists" in res.json()["detail"]

    def test_login_success(self):
        payload = {
            "email": "alex.mercer@example.com",
            "password": "SecurePassword123!"
        }
        res = client.post("/api/auth/login", json=payload)
        assert res.status_code == 200
        assert "access_token" in res.json()

    def test_login_invalid_password(self):
        payload = {
            "email": "alex.mercer@example.com",
            "password": "WrongPassword!"
        }
        res = client.post("/api/auth/login", json=payload)
        assert res.status_code == 401

    def test_get_current_user_unauthorized(self):
        res = client.get("/api/auth/me")
        assert res.status_code == 401

    def test_get_current_user_authorized(self):
        login_res = client.post("/api/auth/login", json={
            "email": "alex.mercer@example.com",
            "password": "SecurePassword123!"
        })
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        res = client.get("/api/auth/me", headers=headers)
        assert res.status_code == 200
        assert res.json()["email"] == "alex.mercer@example.com"


class TestPlanners:
    @pytest.fixture
    def auth_headers(self):
        # Register a unique user for planner testing
        email = "planner.user@example.com"
        client.post("/api/auth/register", json={
            "name": "Planner User",
            "email": email,
            "password": "Password123!"
        })
        login_res = client.post("/api/auth/login", json={
            "email": email,
            "password": "Password123!"
        })
        token = login_res.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}

    def test_home_planner_fallback_structure(self, auth_headers):
        payload = {
            "total_budget": 50000,
            "room_type": "Living Room",
            "room_quantity": 1,
            "style_preference": "Modern Scandinavian",
            "furniture_requirements": "3-seater sofa, coffee table, TV unit",
            "lighting_requirements": "Warm LED floor lamp and ceiling spotlights",
            "ceiling_fan_requirements": "BLDC wooden finish fan"
        }
        res = client.post("/api/planners/home", json=payload, headers=auth_headers)
        assert res.status_code == 200
        data = res.json()
        assert data["planner_type"] == "home"
        assert data["budget"] == 50000
        assert "budget_summary" in data
        assert data["budget_summary"]["allocated"] > 0
        assert len(data["recommendations"]) > 0
        assert len(data["tips"]) > 0

    def test_home_planner_invalid_budget(self):
        payload = {
            "total_budget": -500,
            "room_type": "Living Room",
            "style_preference": "Modern"
        }
        res = client.post("/api/planners/home", json=payload)
        assert res.status_code in (400, 422)

    def test_party_planner_fallback_structure(self, auth_headers):
        payload = {
            "total_budget": 35000,
            "guest_count": 25,
            "event_type": "Birthday Celebration",
            "food_requirements": "Finger foods and buffet",
            "decoration_requirements": "Balloon arch and fairy lights",
            "entertainment_requirements": "DJ speaker system"
        }
        res = client.post("/api/planners/party", json=payload, headers=auth_headers)
        assert res.status_code == 200
        data = res.json()
        assert data["planner_type"] == "party"
        assert data["budget"] == 35000
        assert len(data["recommendations"]) >= 3
        # Ensure categories include food/catering
        categories = [item["category"] for item in data["recommendations"]]
        assert any("Food" in c or "Catering" in c for c in categories)

    def test_party_planner_zero_guests(self):
        payload = {
            "total_budget": 20000,
            "guest_count": 0,
            "event_type": "Anniversary"
        }
        res = client.post("/api/planners/party", json=payload)
        assert res.status_code == 422

    def test_jewelry_planner_json(self, auth_headers):
        payload = {
            "budget": 15000,
            "occasion": "Cocktail Evening",
            "jewelry_type": "Earrings & Bracelet Set",
            "preferred_style": "Contemporary Diamond",
            "preferred_color": "Emerald green",
            "material_preference": "18K Rose Gold",
            "outfit_description": "V-neck black evening gown"
        }
        res = client.post("/api/planners/jewelry", json=payload, headers=auth_headers)
        assert res.status_code == 200
        data = res.json()
        assert data["planner_type"] == "jewelry"
        assert data["budget"] == 15000
        assert len(data["recommendations"]) >= 2

    def test_jewelry_planner_invalid_image_extension(self, auth_headers):
        files = {
            "image": ("malicious.exe", b"binarycontent", "application/octet-stream")
        }
        data = {
            "budget": "15000",
            "occasion": "Wedding",
            "jewelry_type": "Necklace",
            "preferred_style": "Traditional",
            "material_preference": "Gold Plated"
        }
        res = client.post("/api/planners/jewelry", data=data, files=files, headers=auth_headers)
        assert res.status_code == 400
        assert "Unsupported file format" in res.json()["detail"]


class TestHistoryAndIsolation:
    def test_history_ownership_and_isolation(self):
        # User 1 registers and creates a plan
        client.post("/api/auth/register", json={
            "name": "User One",
            "email": "user1@example.com",
            "password": "Password123!"
        })
        login1 = client.post("/api/auth/login", json={
            "email": "user1@example.com",
            "password": "Password123!"
        })
        token1 = login1.json()["access_token"]
        headers1 = {"Authorization": f"Bearer {token1}"}

        # User 1 creates home plan
        client.post("/api/planners/home", json={
            "total_budget": 40000,
            "room_type": "Bedroom",
            "style_preference": "Minimalist"
        }, headers=headers1)

        # Check User 1 history
        hist1 = client.get("/api/history", headers=headers1)
        assert hist1.status_code == 200
        items1 = hist1.json()["items"]
        assert len(items1) >= 1
        item_id = items1[0]["id"]

        # User 2 registers
        client.post("/api/auth/register", json={
            "name": "User Two",
            "email": "user2@example.com",
            "password": "Password123!"
        })
        login2 = client.post("/api/auth/login", json={
            "email": "user2@example.com",
            "password": "Password123!"
        })
        token2 = login2.json()["access_token"]
        headers2 = {"Authorization": f"Bearer {token2}"}

        # User 2 views history - should NOT see User 1's history
        hist2 = client.get("/api/history", headers=headers2)
        assert hist2.status_code == 200
        assert len(hist2.json()["items"]) == 0

        # User 2 tries to directly access User 1's specific history item -> Forbidden 403
        item_res = client.get(f"/api/history/{item_id}", headers=headers2)
        assert item_res.status_code == 403
