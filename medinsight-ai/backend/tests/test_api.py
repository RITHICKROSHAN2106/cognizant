from fastapi.testclient import TestClient


def test_system_health(client: TestClient):
    response = client.get("/api/system/health")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["backend"] == "healthy"
    assert "MongoDB" in data["data"]["database"]
    assert len(data["data"]["integrations"]) >= 6


def test_auth_login_and_me(client: TestClient):
    response = client.post("/api/auth/login", json={
        "username": "dr.sarah",
        "password": "doctor123"
    })
    assert response.status_code == 200
    res_json = response.json()
    assert res_json["success"] is True
    token = res_json["data"]["access_token"]
    assert token is not None

    me_resp = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_resp.status_code == 200
    me_data = me_resp.json()
    assert me_data["data"]["username"] == "dr.sarah"
    assert me_data["data"]["role"] == "physician"


def test_patients_list_and_search(client: TestClient):
    response = client.get("/api/patients")
    assert response.status_code == 200
    patients = response.json()["data"]
    assert len(patients) >= 30

    search_resp = client.get("/api/patients/search?q=James")
    assert search_resp.status_code == 200
    results = search_resp.json()["data"]
    assert any(p["mrn"] == "MRN-104928" for p in results)


def test_create_new_patient(client: TestClient):
    new_patient_payload = {
        "first_name": "Alexander",
        "last_name": "Pierce",
        "dob": "1972-06-20",
        "age": 54,
        "sex": "Male",
        "phone": "+1 (555) 345-6789",
        "email": "alex.pierce@example.com",
        "address": "456 Oak Avenue, Springfield, IL",
        "emergency_contact": "Laura Pierce (Wife) - +1 (555) 345-6790",
        "blood_group": "A+",
        "race": "Caucasian",
        "ethnicity": "Non-Hispanic",
        "current_ward": "Ward 5B",
        "current_room": "5B-108",
        "admission_status": "Inpatient",
        "primary_diagnosis": "Type 2 Diabetes Mellitus with Peripheral Angiopathy",
        "known_allergies": "Penicillin",
        "active_medications": "Metformin 500mg, Lisinopril 10mg",
        "safety_badges": ["FALL RISK"]
    }
    response = client.post("/api/patients", json=new_patient_payload)
    assert response.status_code == 201
    created = response.json()["data"]
    assert created["first_name"] == "Alexander"
    assert created["last_name"] == "Pierce"
    assert "DIABETES" in created["safety_badges"]
    assert "PENICILLIN ALLERGY" in created["safety_badges"]


def test_patient_ehr_details(client: TestClient):
    p_resp = client.get("/api/patients/1")
    assert p_resp.status_code == 200
    p = p_resp.json()["data"]
    assert p["mrn"] == "MRN-104928"

    encs_resp = client.get("/api/patients/1/encounters")
    assert encs_resp.status_code == 200
    assert len(encs_resp.json()["data"]) >= 3

    diags_resp = client.get("/api/patients/1/diagnoses")
    assert diags_resp.status_code == 200
    assert len(diags_resp.json()["data"]) >= 4

    labs_resp = client.get("/api/patients/1/labs")
    assert labs_resp.status_code == 200
    assert any("Hemoglobin A1c" in l["test_name"] for l in labs_resp.json()["data"])

    meds_resp = client.get("/api/patients/1/medications")
    assert meds_resp.status_code == 200
    assert any(m["insulin_status"] == "Increased" for m in meds_resp.json()["data"])


def test_patient_specific_ai_chat(client: TestClient):
    chat_resp = client.post("/api/patients/1/chat", json={
        "message": "What medications is this patient currently taking and what are his allergies?"
    })
    assert chat_resp.status_code == 200
    chat_data = chat_resp.json()["data"]
    assert chat_data["patient_id"] == 1
    assert len(chat_data["reply"]) > 20
    assert "Clinical Decision Support" in chat_data["disclaimer"]


def test_patient_report_and_pdf(client: TestClient):
    # Test JSON report endpoint
    rep_resp = client.get("/api/patients/1/report")
    assert rep_resp.status_code == 200
    rep_data = rep_resp.json()["data"]
    assert rep_data["patient"]["mrn"] == "MRN-104928"
    assert len(rep_data["diagnoses"]) >= 4

    # Test PDF generation endpoint
    pdf_resp = client.get("/api/patients/1/report/pdf")
    assert pdf_resp.status_code == 200
    assert pdf_resp.headers["content-type"] == "application/pdf"
    assert len(pdf_resp.content) > 500  # Valid binary PDF


def test_predict_readmission_endpoint(client: TestClient):
    payload = {
        "patient_id": 1,
        "encounter_id": "ENC-2026-008412",
        "time_in_hospital": 7,
        "num_lab_procedures": 42,
        "num_medications": 18,
        "number_outpatient": 3,
        "number_emergency": 2,
        "number_inpatient": 2,
        "A1Cresult": "high",
        "insulin": "up",
        "previous_readmissions": 1
    }
    response = client.post("/api/predict/readmission", json=payload)
    assert response.status_code == 200
    pred = response.json()["data"]
    assert 0.0 < pred["risk_probability"] < 1.0
    assert pred["risk_level"] in ["Critical", "High", "Moderate", "Low"]


def test_invalid_prediction_payload(client: TestClient):
    response = client.post("/api/predict/readmission", json={
        "time_in_hospital": 0,
        "num_lab_procedures": 10,
        "num_medications": 5,
        "number_outpatient": 0,
        "number_emergency": 0,
        "number_inpatient": 0,
        "A1Cresult": "none",
        "insulin": "none",
        "previous_readmissions": 0
    })
    assert response.status_code == 422


def test_explanation_and_simulation(client: TestClient):
    exp_resp = client.get("/api/patients/1/explanation")
    assert exp_resp.status_code == 200
    exp_data = exp_resp.json()["data"]
    assert len(exp_data["features"]) > 0

    sim_resp = client.post("/api/patients/1/simulate-risk", json={
        "follow_up_scheduled": True,
        "medication_reconciliation": True,
        "diabetes_education": True,
        "care_coordinator": True,
        "early_outpatient_review": True,
        "home_monitoring": True
    })
    assert sim_resp.status_code == 200
    sim_data = sim_resp.json()["data"]
    assert sim_data["scenarioRisk"] <= sim_data["baselineRisk"]
