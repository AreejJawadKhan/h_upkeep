from __future__ import annotations

from app.models.email_verification import EmailVerificationToken
from app.models.user import User


def _register(client, *, email: str, name: str = "Test User") -> None:
    response = client.post(
        "/auth/register",
        json={
            "name": name,
            "email": email,
            "password": "StrongPass123!",
        },
    )
    assert response.status_code == 201, response.text


def _verify_latest_token(client, SessionLocal, email: str, state) -> None:
    with SessionLocal() as db:
        user = db.query(User).filter(User.email == email.lower()).one()
        token = (
            db.query(EmailVerificationToken)
            .filter(EmailVerificationToken.user_id == user.id)
            .order_by(EmailVerificationToken.created_at.desc())
            .first()
        )
        assert token is not None

    assert state["verification_tokens"], "verification email was not captured"
    raw_token = state["verification_tokens"][-1]
    response = client.post("/auth/verify-email", json={"token": raw_token})
    assert response.status_code == 200, response.text


def _login(client, email: str) -> str:
    response = client.post(
        "/auth/login",
        json={"email": email, "password": "StrongPass123!"},
    )
    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["token_type"] == "bearer"
    assert payload["access_token"]
    return payload["access_token"]


def _bootstrap_logged_in_user(app_client, email: str):
    client, SessionLocal, state = app_client
    _register(client, email=email)
    _verify_latest_token(client, SessionLocal, email=email, state=state)
    token = _login(client, email=email)
    return client, SessionLocal, state, token


def test_auth_flow_and_home_crud(app_client):
    client, SessionLocal, state, _ = _bootstrap_logged_in_user(app_client, "owner@example.com")

    login_before_verify = client.post(
        "/auth/login",
        json={"email": "owner@example.com", "password": "StrongPass123!"},
    )
    assert login_before_verify.status_code == 200

    headers = {"Authorization": f"Bearer {login_before_verify.json()['access_token']}"}

    create_home = client.post(
        "/homes",
        json={
            "name": "Primary Home",
            "address": "123 Maple Street",
            "property_type": "House",
            "year_built": 1998,
        },
        headers=headers,
    )
    assert create_home.status_code == 201, create_home.text
    home_id = create_home.json()["id"]

    list_homes = client.get("/homes", headers=headers)
    assert list_homes.status_code == 200
    assert len(list_homes.json()) == 1

    update_home = client.patch(
        f"/homes/{home_id}",
        json={"name": "Updated Home"},
        headers=headers,
    )
    assert update_home.status_code == 200
    assert update_home.json()["name"] == "Updated Home"

    delete_home = client.delete(f"/homes/{home_id}", headers=headers)
    assert delete_home.status_code == 204

    list_homes_after_delete = client.get("/homes", headers=headers)
    assert list_homes_after_delete.status_code == 200
    assert list_homes_after_delete.json() == []


def test_nested_area_asset_and_maintenance_smoke(app_client):
    client, SessionLocal, state, token = _bootstrap_logged_in_user(app_client, "owner2@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    home_response = client.post(
        "/homes",
        json={
            "name": "Townhome",
            "address": "45 Oak Avenue",
            "property_type": "Townhouse",
            "year_built": 2010,
        },
        headers=headers,
    )
    assert home_response.status_code == 201, home_response.text
    home_id = home_response.json()["id"]

    area_response = client.post(
        f"/homes/{home_id}/areas",
        json={"name": "Kitchen", "notes": "Main kitchen"},
        headers=headers,
    )
    assert area_response.status_code == 201, area_response.text
    area_id = area_response.json()["id"]

    asset_response = client.post(
        f"/homes/{home_id}/assets",
        json={
            "name": "Refrigerator",
            "category": "Appliance",
            "manufacturer": "LG",
            "model": "LFXS26596S",
            "serial_number": "ABC123",
            "purchase_date": "2024-01-15",
            "installation_date": "2024-01-16",
            "expected_lifespan": 12,
            "notes": "Kitchen unit",
            "area_id": area_id,
        },
        headers=headers,
    )
    assert asset_response.status_code == 201, asset_response.text
    asset_id = asset_response.json()["id"]

    maintenance_response = client.post(
        f"/homes/{home_id}/maintenance",
        json={
            "title": "Fridge service",
            "description": "Routine maintenance",
            "item": "Refrigerator",
            "category": "Appliance",
            "date": "2026-08-14",
            "cost": 95.0,
            "service_provider": "CoolFix",
            "next_due_date": "2027-08-14",
            "image_url": None,
            "asset_id": asset_id,
        },
        headers=headers,
    )
    assert maintenance_response.status_code == 201, maintenance_response.text

    list_assets = client.get(f"/homes/{home_id}/assets?area_id={area_id}", headers=headers)
    assert list_assets.status_code == 200
    assert len(list_assets.json()) == 1

    list_records = client.get(f"/homes/{home_id}/maintenance?asset_id={asset_id}", headers=headers)
    assert list_records.status_code == 200
    assert len(list_records.json()) == 1


def test_cross_user_ownership_is_blocked(app_client):
    client, SessionLocal, state, owner_token = _bootstrap_logged_in_user(app_client, "owner3@example.com")
    owner_headers = {"Authorization": f"Bearer {owner_token}"}

    home_response = client.post(
        "/homes",
        json={
            "name": "Owner Home",
            "address": "1 Private Lane",
            "property_type": "House",
            "year_built": 2001,
        },
        headers=owner_headers,
    )
    assert home_response.status_code == 201, home_response.text
    home_id = home_response.json()["id"]

    _register(client, email="intruder@example.com")
    _verify_latest_token(client, SessionLocal, email="intruder@example.com", state=state)
    intruder_token = _login(client, "intruder@example.com")
    intruder_headers = {"Authorization": f"Bearer {intruder_token}"}

    blocked_home = client.get(f"/homes/{home_id}", headers=intruder_headers)
    assert blocked_home.status_code == 404

    blocked_area_create = client.post(
        f"/homes/{home_id}/areas",
        json={"name": "Garage"},
        headers=intruder_headers,
    )
    assert blocked_area_create.status_code == 404
