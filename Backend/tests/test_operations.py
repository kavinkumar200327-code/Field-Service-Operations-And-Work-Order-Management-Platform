import pytest
from datetime import datetime, timedelta, timezone

def get_utc_now():
    return datetime.now(timezone.utc)

def test_customers_api(client, admin_headers, customer_headers):
    # Admin can list customers
    res = client.get("/api/customers", headers=admin_headers)
    assert res.status_code == 200
    data = res.json()["data"]
    assert len(data) >= 2

    # Customer gets only their own
    res_cust = client.get("/api/customers", headers=customer_headers)
    assert res_cust.status_code == 200
    assert len(res_cust.json()["data"]) == 1

def test_services_catalog(client, admin_headers):
    res = client.get("/api/services", headers=admin_headers)
    assert res.status_code == 200
    services = res.json()["data"]
    assert len(services) >= 4
    assert any(s["name"] == "Commercial AC Comprehensive Tune-Up" for s in services)

def test_scheduling_conflict_prevention(client, dispatcher_headers):
    # Fetch technician Alex
    techs = client.get("/api/technicians", headers=dispatcher_headers).json()["data"]
    alex = next(t for t in techs if "Alex" in t["full_name"])
    alex_id = alex["id"]

    # Fetch existing in-progress job WO-202610-8002
    wos = client.get("/api/work-orders", headers=dispatcher_headers).json()["data"]
    in_prog = next(w for w in wos if w["work_order_number"] == "WO-202610-8002")
    
    start_dt = datetime.fromisoformat(in_prog["scheduled_start"])
    # Attempt to book another work order overlapping with Alex's existing job
    # WO-202610-8004 is unassigned
    draft_wo = next(w for w in wos if w["work_order_number"] == "WO-202610-8004")

    # Overlapping slot: 15 minutes after start of existing job
    overlap_start = start_dt + timedelta(minutes=15)
    overlap_end = start_dt + timedelta(minutes=75)

    res = client.post(
        f"/api/work-orders/{draft_wo['id']}/assign",
        headers=dispatcher_headers,
        json={
            "technician_id": alex_id,
            "scheduled_start": overlap_start.isoformat(),
            "scheduled_end": overlap_end.isoformat(),
            "notes": "Testing conflict prevention"
        }
    )
    assert res.status_code == 409
    data = res.json()
    assert data["success"] is False
    assert data["error"]["code"] == "SCHEDULING_CONFLICT"

def test_inventory_deduction_and_insufficient_stock(client, tech_headers):
    # Get parts
    parts = client.get("/api/parts", headers=tech_headers).json()["data"]
    part = next(p for p in parts if p["sku"] == "CAP-455-03")
    part_id = part["id"]
    initial_stock = part["available_quantity"]

    wos = client.get("/api/work-orders", headers=tech_headers).json()["data"]
    in_prog = next(w for w in wos if w["status"] == "IN_PROGRESS")
    wo_id = in_prog["id"]

    # Consume 2 units
    consume_res = client.post(
        f"/api/work-orders/{wo_id}/parts",
        headers=tech_headers,
        json={
            "part_id": part_id,
            "quantity": 2,
            "action": "CONSUMED"
        }
    )
    assert consume_res.status_code == 201

    # Verify stock decreased
    part_after = client.get(f"/api/parts/{part_id}", headers=tech_headers).json()["data"]
    assert part_after["available_quantity"] == initial_stock - 2

    # Attempt to consume more than available stock
    fail_res = client.post(
        f"/api/work-orders/{wo_id}/parts",
        headers=tech_headers,
        json={
            "part_id": part_id,
            "quantity": 99999,
            "action": "CONSUMED"
        }
    )
    assert fail_res.status_code == 409
    assert fail_res.json()["error"]["code"] == "INSUFFICIENT_PARTS_STOCK"

def test_service_report_and_pdf_download(client, admin_headers):
    wos = client.get("/api/work-orders", headers=admin_headers).json()["data"]
    completed_wo = next(w for w in wos if w["status"] == "COMPLETED")

    # Get service report
    report_res = client.get(f"/api/work-orders/{completed_wo['id']}/reports", headers=admin_headers)
    assert report_res.status_code == 200
    report = report_res.json()["data"]
    assert report is not None
    report_id = report["id"]

    # Download PDF
    pdf_res = client.get(f"/api/reports/{report_id}/download", headers=admin_headers)
    assert pdf_res.status_code == 200
    assert pdf_res.headers["content-type"] == "application/pdf"
    assert len(pdf_res.content) > 1000 # Valid PDF bytes
    assert pdf_res.content[:4] == b"%PDF" # PDF header magic number!

def test_websocket_notifications(client):
    user_id = "a425346c-b7cd-43e9-939c-b4e2cd33c2e5"
    with client.websocket_connect(f"/ws/notifications/{user_id}") as ws:
        ws.send_text("ping")
        data = ws.receive_text()
        assert data == "pong"

