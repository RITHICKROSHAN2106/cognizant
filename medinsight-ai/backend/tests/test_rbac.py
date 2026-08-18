import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.security.jwt import create_access_token


def get_token_client(username: str, role: str, user_id: int = 1, staff_id: str = "STF-001") -> TestClient:
    token_payload = {
        "sub": username,
        "user_id": user_id,
        "staff_id": staff_id,
        "role": role,
        "session_id": f"pytest-session-{username}"
    }
    token = create_access_token(token_payload)
    tc = TestClient(app)
    tc.headers.update({"Authorization": f"Bearer {token}"})
    return tc


def test_rbac_unauthenticated_request_rejected(unauthenticated_client: TestClient):
    """Direct unauthenticated access to clinical endpoints must return 401 Unauthorized."""
    resp = unauthenticated_client.get("/api/patients")
    assert resp.status_code == 401


def test_rbac_nurse_cannot_access_admin(client: TestClient):
    """Nurse role accessing /api/admin/users must return 403 Forbidden."""
    nurse_client = get_token_client("nurse.emily", "nurse", user_id=3, staff_id="NUR-00891")
    resp = nurse_client.get("/api/admin/users")
    assert resp.status_code == 403


def test_rbac_admin_can_access_admin_endpoints(admin_client: TestClient):
    """Administrator role can access staff directory and security status."""
    resp = admin_client.get("/api/admin/users")
    assert resp.status_code == 200
    assert len(resp.json()["data"]) >= 6

    sec_resp = admin_client.get("/api/admin/security-status")
    assert sec_resp.status_code == 200


def test_rbac_dietician_cannot_update_rehabilitation():
    """Dietician cannot modify rehabilitation therapy plan -> 403 Forbidden."""
    diet_client = get_token_client("dietician.elena", "dietician", user_id=5, staff_id="DIE-00311")
    resp = diet_client.post("/api/post-discharge/rehabilitation", json={"patient_id": 1})
    assert resp.status_code == 403


def test_rbac_rehab_cannot_update_nutrition():
    """Rehabilitation Specialist cannot modify medical nutrition therapy -> 403 Forbidden."""
    rehab_client = get_token_client("rehab.david", "rehab_specialist", user_id=6, staff_id="REH-00205")
    resp = rehab_client.post("/api/post-discharge/nutrition-plan", json={"patient_id": 1})
    assert resp.status_code == 403


def test_rbac_doctor_can_score_and_diagnose():
    """Physician can run predictions and view patients."""
    doc_client = get_token_client("dr.sarah", "physician", user_id=2, staff_id="DOC-00124")
    pred_resp = doc_client.post("/api/predict/readmission/2278392")
    assert pred_resp.status_code == 200
