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


def test_dynamic_patient_count(client: TestClient):
    # 1. Get initial total count from dataset endpoint
    res_before = client.get("/api/patients/dataset?page=1&page_size=10")
    assert res_before.status_code == 200
    initial_total = res_before.json()["data"]["total"]

    # 2. Register a new clinical patient
    new_patient_payload = {
        "first_name": "DynamicTest",
        "last_name": "PatientRecord",
        "dob": "1980-04-12",
        "age": 46,
        "sex": "Female",
        "phone": "+1 (555) 999-8888",
        "email": "dynamic.test@example.com",
        "address": "789 Dynamic Way, Chicago, IL",
        "emergency_contact": "Bob Record - +1 (555) 999-8889",
        "blood_group": "O+",
        "race": "Caucasian",
        "ethnicity": "Non-Hispanic",
        "current_ward": "Ward 5B",
        "current_room": "5B-205",
        "admission_status": "Inpatient",
        "primary_diagnosis": "Type 2 Diabetes Mellitus with Complications",
        "known_allergies": "Sulfa",
        "active_medications": "Metformin 1000mg",
        "safety_badges": ["DIABETES"]
    }
    create_resp = client.post("/api/patients", json=new_patient_payload)
    assert create_resp.status_code == 201

    # 3. Verify total increments dynamically
    res_after = client.get("/api/patients/dataset?page=1&page_size=10")
    assert res_after.status_code == 200
    updated_total = res_after.json()["data"]["total"]
    assert updated_total == initial_total + 1

    # 4. Verify analytics endpoint reflects live count
    analytics_resp = client.get("/api/analytics/readmissions")
    assert analytics_resp.status_code == 200
    analytics_data = analytics_resp.json()["data"]
    assert analytics_data["total_dataset_encounters"] >= 101767
    assert analytics_data["total_inpatients"] >= 101767


def test_cohort_csv_export(client: TestClient):
    response = client.get("/api/reports/cohort/csv?limit=50")
    assert response.status_code == 200
    assert "text/csv" in response.headers.get("content-type", "")
    assert "attachment" in response.headers.get("content-disposition", "")
    
    content = response.text
    lines = content.strip().split("\n")
    assert len(lines) >= 2
    header = lines[0]
    assert "Patient ID" in header
    assert "MRN" in header
    assert "Patient Name" in header
    assert "Primary Diagnosis" in header
    assert "Readmission Risk Probability" in header
    assert "Readmission Risk Tier" in header


def test_cohort_pdf_export(client: TestClient):
    response = client.get("/api/reports/cohort/pdf?limit=30")
    assert response.status_code == 200
    assert response.headers.get("content-type") == "application/pdf"
    assert "attachment" in response.headers.get("content-disposition", "")
    assert response.content.startswith(b"%PDF")
    assert len(response.content) > 1000


def test_patient_report_csv_export(client: TestClient):
    response = client.get("/api/patients/1/report/csv")
    assert response.status_code == 200
    assert "text/csv" in response.headers.get("content-type", "")
    disposition = response.headers.get("content-disposition", "")
    assert "attachment" in disposition
    assert ".csv" in disposition
    assert not "None" in disposition
    
    content = response.text
    assert "Category,Field,Value" in content
    assert "Patient Identification,Medical Record Number (MRN)" in content
    assert "Encounter Details,Encounter ID" in content
    assert "Clinical Diagnoses,Primary Diagnosis" in content
    assert "Readmission Risk,ML Readmission Probability" in content


def test_patient_encounter_discharge_summary_endpoints(client: TestClient):
    # PDF encounter endpoint
    pdf_resp = client.get("/api/reports/patients/1/encounters/ENC-1/discharge-summary.pdf")
    assert pdf_resp.status_code == 200
    assert pdf_resp.headers.get("content-type") == "application/pdf"
    assert "Discharge_Summary" in pdf_resp.headers.get("content-disposition", "")
    assert pdf_resp.content.startswith(b"%PDF")

    # CSV encounter endpoint
    csv_resp = client.get("/api/reports/patients/1/encounters/ENC-1/discharge-summary.csv")
    assert csv_resp.status_code == 200
    assert "text/csv" in csv_resp.headers.get("content-type", "")
    assert "Discharge_Summary" in csv_resp.headers.get("content-disposition", "")
    assert "Category,Field,Value" in csv_resp.text


