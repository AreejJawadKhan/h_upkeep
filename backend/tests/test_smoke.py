from __future__ import annotations

from datetime import timedelta

from app.core.time import utc_now
from app.models.email_verification import EmailVerificationToken
from app.models.user import User
from app.services import maintenance_document as document_service


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


def test_maintenance_schedule_complete_creates_history(app_client):
    client, SessionLocal, state, token = _bootstrap_logged_in_user(app_client, "scheduler@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    home_response = client.post(
        "/homes",
        json={
            "name": "Schedule Home",
            "address": "22 Cedar Road",
            "property_type": "House",
            "year_built": 2005,
        },
        headers=headers,
    )
    assert home_response.status_code == 201, home_response.text
    home_id = home_response.json()["id"]

    schedule_response = client.post(
        f"/homes/{home_id}/schedules",
        json={
            "title": "Replace HVAC filter",
            "description": "Quarterly filter change",
            "frequency": "quarterly",
            "next_due_date": "2026-09-15",
            "reminder_enabled": True,
        },
        headers=headers,
    )
    assert schedule_response.status_code == 201, schedule_response.text
    schedule_id = schedule_response.json()["id"]

    complete_response = client.post(
        f"/homes/{home_id}/schedules/{schedule_id}/complete",
        headers=headers,
    )
    assert complete_response.status_code == 200, complete_response.text
    payload = complete_response.json()
    assert payload["schedule"]["last_completed"] is not None
    assert payload["maintenance_record"] is not None
    assert payload["maintenance_record"]["title"] == "Replace HVAC filter"

    list_schedules = client.get(f"/homes/{home_id}/schedules", headers=headers)
    assert list_schedules.status_code == 200
    assert len(list_schedules.json()) == 1

    list_records = client.get(f"/homes/{home_id}/maintenance", headers=headers)
    assert list_records.status_code == 200
    assert len(list_records.json()) == 1


def test_maintenance_schedule_update_and_delete(app_client):
    client, SessionLocal, state, token = _bootstrap_logged_in_user(app_client, "schedule-crud@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    home_response = client.post(
        "/homes",
        json={
            "name": "Crud Home",
            "address": "88 Spruce Lane",
            "property_type": "House",
            "year_built": 2018,
        },
        headers=headers,
    )
    assert home_response.status_code == 201, home_response.text
    home_id = home_response.json()["id"]

    create_response = client.post(
        f"/homes/{home_id}/schedules",
        json={
            "title": "Replace smoke alarm batteries",
            "description": "Annual battery check",
            "frequency": "yearly",
            "next_due_date": "2026-10-01",
            "reminder_enabled": True,
        },
        headers=headers,
    )
    assert create_response.status_code == 201, create_response.text
    schedule_id = create_response.json()["id"]

    update_response = client.patch(
        f"/homes/{home_id}/schedules/{schedule_id}",
        json={
            "title": "Replace smoke alarm batteries and test alarms",
            "reminder_enabled": False,
        },
        headers=headers,
    )
    assert update_response.status_code == 200, update_response.text
    assert update_response.json()["title"] == "Replace smoke alarm batteries and test alarms"
    assert update_response.json()["reminder_enabled"] is False

    get_response = client.get(f"/homes/{home_id}/schedules/{schedule_id}", headers=headers)
    assert get_response.status_code == 200, get_response.text

    delete_response = client.delete(f"/homes/{home_id}/schedules/{schedule_id}", headers=headers)
    assert delete_response.status_code == 204, delete_response.text

    list_schedules = client.get(f"/homes/{home_id}/schedules", headers=headers)
    assert list_schedules.status_code == 200
    assert list_schedules.json() == []


def test_spending_analytics_are_derived_from_records(app_client):
    client, SessionLocal, state, token = _bootstrap_logged_in_user(app_client, "analytics@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    home_one = client.post(
        "/homes",
        json={
            "name": "Analytics Home",
            "address": "12 Willow Street",
            "property_type": "House",
            "year_built": 2008,
        },
        headers=headers,
    )
    assert home_one.status_code == 201, home_one.text
    home_one_id = home_one.json()["id"]

    home_two = client.post(
        "/homes",
        json={
            "name": "Second Home",
            "address": "99 Birch Avenue",
            "property_type": "Townhouse",
            "year_built": 2014,
        },
        headers=headers,
    )
    assert home_two.status_code == 201, home_two.text
    home_two_id = home_two.json()["id"]

    furnace = client.post(
        f"/homes/{home_one_id}/assets",
        json={
            "name": "Furnace",
            "category": "HVAC",
            "manufacturer": "Lennox",
            "model": "XC25",
            "serial_number": "FUR-100",
            "purchase_date": "2024-01-10",
            "installation_date": "2024-01-11",
            "expected_lifespan": 15,
            "notes": "Primary heating unit",
            "area_id": None,
        },
        headers=headers,
    )
    assert furnace.status_code == 201, furnace.text
    furnace_id = furnace.json()["id"]

    sink = client.post(
        f"/homes/{home_one_id}/assets",
        json={
            "name": "Kitchen Sink",
            "category": "Plumbing",
            "manufacturer": "Delta",
            "model": "Classic",
            "serial_number": "SINK-200",
            "purchase_date": "2023-06-15",
            "installation_date": "2023-06-16",
            "expected_lifespan": 12,
            "notes": "Main kitchen sink",
            "area_id": None,
        },
        headers=headers,
    )
    assert sink.status_code == 201, sink.text
    sink_id = sink.json()["id"]

    today = utc_now().date()
    previous_year = today - timedelta(days=365)

    records = [
        {
            "home_id": home_one_id,
            "title": "Filter change",
            "description": "Quarterly filter replacement",
            "item": "Furnace",
            "category": "HVAC",
            "date": today.isoformat(),
            "cost": 100.0,
            "service_provider": "HeatCo",
            "next_due_date": None,
            "image_url": None,
            "asset_id": furnace_id,
        },
        {
            "home_id": home_one_id,
            "title": "Pipe repair",
            "description": "Minor kitchen leak",
            "item": "Sink",
            "category": "Plumbing",
            "date": today.isoformat(),
            "cost": 50.0,
            "service_provider": "FlowFix",
            "next_due_date": None,
            "image_url": None,
            "asset_id": sink_id,
        },
        {
            "home_id": home_one_id,
            "title": "Annual tune-up",
            "description": "Yearly service",
            "item": "Furnace",
            "category": "HVAC",
            "date": previous_year.isoformat(),
            "cost": 200.0,
            "service_provider": "HeatCo",
            "next_due_date": None,
            "image_url": None,
            "asset_id": furnace_id,
        },
    ]

    for record in records:
        response = client.post(
            f"/homes/{record['home_id']}/maintenance",
            json=record,
            headers=headers,
        )
        assert response.status_code == 201, response.text

    home_two_record = client.post(
        f"/homes/{home_two_id}/maintenance",
        json={
            "title": "Exterior cleanup",
            "description": "Seasonal clean",
            "item": "Exterior",
            "category": "Cleaning",
            "date": today.isoformat(),
            "cost": 40.0,
            "service_provider": "Sparkle Team",
            "next_due_date": None,
            "image_url": None,
            "asset_id": None,
        },
        headers=headers,
    )
    assert home_two_record.status_code == 201, home_two_record.text

    global_overview = client.get("/analytics/spending", headers=headers)
    assert global_overview.status_code == 200, global_overview.text
    global_payload = global_overview.json()
    assert global_payload["record_count"] == 4
    assert global_payload["total_spend"] == 390.0
    assert global_payload["this_month_spend"] == 190.0
    assert global_payload["this_year_spend"] == 190.0
    assert global_payload["previous_year_spend"] == 200.0
    assert global_payload["category_breakdown"][0]["category"] == "HVAC"
    assert global_payload["category_breakdown"][0]["total_spend"] == 300.0
    assert global_payload["asset_breakdown"][0]["asset_name"] == "Furnace"
    assert global_payload["asset_breakdown"][0]["total_spend"] == 300.0

    scoped_overview = client.get(f"/analytics/spending?home_id={home_one_id}", headers=headers)
    assert scoped_overview.status_code == 200, scoped_overview.text
    scoped_payload = scoped_overview.json()
    assert scoped_payload["scope_home_id"] == home_one_id
    assert scoped_payload["scope_home_name"] == "Analytics Home"
    assert scoped_payload["record_count"] == 3
    assert scoped_payload["total_spend"] == 350.0
    assert scoped_payload["this_month_spend"] == 150.0
    assert scoped_payload["previous_year_spend"] == 200.0


def test_maintenance_documents_upload_list_and_delete(app_client, monkeypatch):
    client, SessionLocal, state, token = _bootstrap_logged_in_user(app_client, "documents@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    home_response = client.post(
        "/homes",
        json={
            "name": "Documents Home",
            "address": "33 Paper Street",
            "property_type": "House",
            "year_built": 2012,
        },
        headers=headers,
    )
    assert home_response.status_code == 201, home_response.text
    home_id = home_response.json()["id"]

    maintenance_response = client.post(
        f"/homes/{home_id}/maintenance",
        json={
            "title": "Roof inspection",
            "description": "Annual roof review",
            "item": "Roof",
            "category": "Structural",
            "date": "2026-08-17",
            "cost": 250.0,
            "service_provider": "TopView",
            "next_due_date": None,
            "image_url": None,
            "asset_id": None,
        },
        headers=headers,
    )
    assert maintenance_response.status_code == 201, maintenance_response.text
    maintenance_id = maintenance_response.json()["id"]

    def fake_upload(*, document, public_id):
        return {
            "public_id": public_id,
            "secure_url": f"https://res.cloudinary.com/test/{public_id}",
            "resource_type": "raw",
        }

    def fake_delete(*, public_id, resource_type):
        return {"result": "ok", "public_id": public_id, "resource_type": resource_type}

    monkeypatch.setattr(document_service, "upload_document_to_cloudinary", fake_upload)
    monkeypatch.setattr(document_service, "delete_document_from_cloudinary", fake_delete)

    upload_response = client.post(
        f"/homes/{home_id}/maintenance/{maintenance_id}/documents",
        json={
            "file_name": "receipt.pdf",
            "file_type": "application/pdf",
            "data_url": "data:application/pdf;base64,JVBERi0xLjQK",
        },
        headers=headers,
    )
    assert upload_response.status_code == 201, upload_response.text
    document_id = upload_response.json()["id"]
    assert upload_response.json()["file_name"] == "receipt.pdf"

    list_response = client.get(
        f"/homes/{home_id}/maintenance/{maintenance_id}/documents",
        headers=headers,
    )
    assert list_response.status_code == 200, list_response.text
    assert len(list_response.json()) == 1

    delete_response = client.delete(
        f"/homes/{home_id}/maintenance/{maintenance_id}/documents/{document_id}",
        headers=headers,
    )
    assert delete_response.status_code == 204, delete_response.text

    list_after_delete = client.get(
        f"/homes/{home_id}/maintenance/{maintenance_id}/documents",
        headers=headers,
    )
    assert list_after_delete.status_code == 200
    assert list_after_delete.json() == []


def test_warranties_and_home_documents_smoke(app_client, monkeypatch):
    client, SessionLocal, state, token = _bootstrap_logged_in_user(app_client, "warranties@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    home_response = client.post(
        "/homes",
        json={
            "name": "Warranty Home",
            "address": "77 Cedar Court",
            "property_type": "House",
            "year_built": 2015,
        },
        headers=headers,
    )
    assert home_response.status_code == 201, home_response.text
    home_id = home_response.json()["id"]

    asset_response = client.post(
        f"/homes/{home_id}/assets",
        json={
            "name": "Water heater",
            "category": "Appliance",
            "manufacturer": "Rheem",
            "model": "ProTerra",
            "serial_number": "WH-100",
            "purchase_date": "2025-01-01",
            "installation_date": "2025-01-02",
            "expected_lifespan": 10,
            "notes": "Garage unit",
            "area_id": None,
        },
        headers=headers,
    )
    assert asset_response.status_code == 201, asset_response.text
    asset_id = asset_response.json()["id"]

    maintenance_response = client.post(
        f"/homes/{home_id}/maintenance",
        json={
            "title": "Water heater inspection",
            "description": "Warranty attachment",
            "item": "Water heater",
            "category": "Appliance",
            "date": "2026-08-17",
            "cost": 150.0,
            "service_provider": "HotWater Co.",
            "next_due_date": None,
            "image_url": None,
            "asset_id": asset_id,
        },
        headers=headers,
    )
    assert maintenance_response.status_code == 201, maintenance_response.text
    maintenance_id = maintenance_response.json()["id"]

    def fake_upload(*, document, public_id):
        return {
            "public_id": public_id,
            "secure_url": f"https://res.cloudinary.com/test/{public_id}",
            "resource_type": "raw",
        }

    def fake_delete(*, public_id, resource_type):
        return {"result": "ok", "public_id": public_id, "resource_type": resource_type}

    monkeypatch.setattr(document_service, "upload_document_to_cloudinary", fake_upload)
    monkeypatch.setattr(document_service, "delete_document_from_cloudinary", fake_delete)

    upload_response = client.post(
        f"/homes/{home_id}/maintenance/{maintenance_id}/documents",
        json={
            "file_name": "warranty.pdf",
            "file_type": "application/pdf",
            "data_url": "data:application/pdf;base64,JVBERi0xLjQK",
        },
        headers=headers,
    )
    assert upload_response.status_code == 201, upload_response.text
    document_id = upload_response.json()["id"]

    home_documents = client.get(f"/homes/{home_id}/documents", headers=headers)
    assert home_documents.status_code == 200, home_documents.text
    assert len(home_documents.json()) == 1
    assert home_documents.json()[0]["maintenance_title"] == "Water heater inspection"

    warranty_response = client.post(
        f"/homes/{home_id}/warranties",
        json={
            "provider": "Rheem",
            "coverage_details": "Parts and labor",
            "start_date": "2025-01-01",
            "expiration_date": "2027-01-01",
            "asset_id": asset_id,
            "document_id": document_id,
        },
        headers=headers,
    )
    assert warranty_response.status_code == 201, warranty_response.text
    warranty_id = warranty_response.json()["id"]
    assert warranty_response.json()["document_id"] == document_id

    list_warranties = client.get(f"/homes/{home_id}/warranties?asset_id={asset_id}", headers=headers)
    assert list_warranties.status_code == 200, list_warranties.text
    assert len(list_warranties.json()) == 1

    update_warranty = client.patch(
        f"/homes/{home_id}/warranties/{warranty_id}",
        json={
            "provider": "Rheem Plus",
            "expiration_date": "2027-06-01",
        },
        headers=headers,
    )
    assert update_warranty.status_code == 200, update_warranty.text
    assert update_warranty.json()["provider"] == "Rheem Plus"

    delete_warranty = client.delete(f"/homes/{home_id}/warranties/{warranty_id}", headers=headers)
    assert delete_warranty.status_code == 204, delete_warranty.text

    list_after_delete = client.get(f"/homes/{home_id}/warranties", headers=headers)
    assert list_after_delete.status_code == 200
    assert list_after_delete.json() == []
