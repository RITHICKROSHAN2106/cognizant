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
    assert len(patients) >= 10

    first_patient = patients[0]
    search_term = str(first_patient["id"])
    search_resp = client.get(f"/api/patients/search?q={search_term}")
    assert search_resp.status_code == 200
    results = search_resp.json()["data"]
    assert any(str(p["id"]) == search_term for p in results)


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
    list_resp = client.get("/api/patients?limit=1")
    assert list_resp.status_code == 200
    p_id = list_resp.json()["data"][0]["id"]

    p_resp = client.get(f"/api/patients/{p_id}")
    assert p_resp.status_code == 200
    p = p_resp.json()["data"]
    assert p["id"] == p_id

    encs_resp = client.get(f"/api/patients/{p_id}/encounters")
    assert encs_resp.status_code == 200
    assert isinstance(encs_resp.json()["data"], list)


def test_patient_specific_ai_chat(client: TestClient):
    list_resp = client.get("/api/patients?limit=1")
    p_id = list_resp.json()["data"][0]["id"]

    chat_resp = client.post(f"/api/patients/{p_id}/chat", json={
        "message": "What medications is this patient currently taking and what are the diagnoses?"
    })
    assert chat_resp.status_code == 200
    chat_data = chat_resp.json()["data"]
    assert chat_data["patient_id"] == p_id
    assert len(chat_data["reply"]) > 10
    assert "Clinical Decision Support" in chat_data["disclaimer"]


def test_patient_report_and_pdf(client: TestClient):
    list_resp = client.get("/api/patients?limit=1")
    p_id = list_resp.json()["data"][0]["id"]

    # Test JSON report endpoint
    rep_resp = client.get(f"/api/patients/{p_id}/report")
    assert rep_resp.status_code == 200
    rep_data = rep_resp.json()["data"]
    assert rep_data["patient"]["id"] == p_id

    # Test PDF generation endpoint
    pdf_resp = client.get(f"/api/patients/{p_id}/report/pdf")
    assert pdf_resp.status_code == 200
    assert pdf_resp.headers["content-type"] == "application/pdf"
    assert len(pdf_resp.content) > 500


def test_predict_readmission_endpoint(client: TestClient):
    payload = {
        "patient_id": 8222157,
        "encounter_id": "ENC-2278392",
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
    assert 0.0 <= pred["risk_probability"] <= 1.0
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
