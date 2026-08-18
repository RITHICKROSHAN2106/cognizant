import urllib.request
import urllib.parse
import json

BASE_URL = "http://127.0.0.1:8000/api"

def make_req(endpoint, method="GET", data=None, headers=None):
    url = f"{BASE_URL}{endpoint}"
    req_headers = {"Content-Type": "application/json"}
    if headers:
        req_headers.update(headers)
    
    encoded_data = json.dumps(data).encode('utf-8') if data else None
    req = urllib.request.Request(url, data=encoded_data, headers=req_headers, method=method)
    
    try:
        with urllib.request.urlopen(req) as resp:
            body = resp.read().decode('utf-8')
            return resp.status, json.loads(body)
    except urllib.error.HTTPError as e:
        err_body = e.read().decode('utf-8')
        return e.code, json.loads(err_body)

def run_tests():
    print("--- 1. Testing User Authentication ---")
    status, login_res = make_req("/auth/login", method="POST", data={
        "username": "dr.sarah",
        "password": "doctor123"
    })
    print(f"Login Status: {status}")
    assert status == 200, f"Login failed: {login_res}"
    token = login_res["data"]["access_token"]
    auth_headers = {"Authorization": f"Bearer {token}"}
    print("[OK] Auth token obtained successfully")

    print("\n--- 2. Testing Clinical AI Copilot (General Mode) ---")
    status, gen_res = make_req("/copilot/chat", method="POST", headers=auth_headers, data={
        "message": "What is the standard hospital protocol for 30-day readmission prevention?"
    })
    print(f"Copilot General Status: {status}")
    assert status == 200, f"General Copilot failed: {gen_res}"
    gen_data = gen_res["data"]
    print(f"[OK] Reply length: {len(gen_data['reply'])}, Citations: {gen_data['citations']}")

    print("\n--- 3. Testing Clinical AI Copilot (Contextual Readmission Risk Mode) ---")
    status, c_res = make_req("/copilot/chat", method="POST", headers=auth_headers, data={
        "patient_id": 1,
        "encounter_id": "ENC-1",
        "context_type": "READMISSION_RISK",
        "message": "Explain the major risk drivers for this patient readmission score."
    })
    print(f"Copilot Contextual Status: {status}")
    assert status == 200, f"Contextual Copilot failed: {c_res}"
    c_data = c_res["data"]
    print(f"[OK] Contextual reply generated. Citations: {c_data.get('citations')}")
    print(f"[OK] Suggested actions: {len(c_data.get('suggested_actions', []))}")

    print("\n--- 4. Testing Post-Discharge Patient Cohort Queue ---")
    status, cohort_res = make_req("/post-discharge/patients", method="GET", headers=auth_headers)
    print(f"Cohort Queue Status: {status}")
    assert status == 200, f"Cohort Queue failed: {cohort_res}"
    cohort = cohort_res["data"]
    print(f"[OK] Retrieved {len(cohort)} post-discharge patients. First: {cohort[0]['patient_name']} ({cohort[0]['recovery_status']})")

    print("\n--- 5. Testing Patient Post-Discharge Care Plan Bundle ---")
    status, plan_res = make_req("/patients/1/post-discharge", method="GET", headers=auth_headers)
    print(f"Patient Plan Status: {status}")
    assert status == 200, f"Patient plan failed: {plan_res}"
    plan = plan_res["data"]
    print(f"[OK] 4-Week Visits: {len(plan['follow_up_visits'])}, Med Supplies: {len(plan['medication_supplies'])}, Diet: {plan['nutrition_plan']['diet_type']}")

    print("\n--- 6. Testing Pre-Registration Duplicate Check ---")
    status, dup_res = make_req("/patients/check-duplicate", method="POST", headers=auth_headers, data={
        "first_name": "Hannah",
        "last_name": "Wilson",
        "dob": "1965-05-14"
    })
    print(f"Duplicate Check Status: {status}")
    assert status == 200, f"Duplicate check failed: {dup_res}"
    matches = dup_res["data"]
    print(f"[OK] Duplicate candidate matches returned: {len(matches)}")

    print("\n--- 7. Testing Returning Patient Readmission Encounter Creation ---")
    status, enc_res = make_req("/patients/1/encounters", method="POST", headers=auth_headers, data={
        "previous_discharge_date": "2026-08-01",
        "ward": "Ward 4A",
        "primary_diagnosis": "Recurrent Acute Hyperglycemia",
        "department": "Internal Medicine"
    })
    print(f"Readmission Encounter Status: {status}")
    assert status == 201, f"Readmission encounter failed: {enc_res}"
    enc_data = enc_res["data"]
    print(f"[OK] New encounter recorded: {enc_data['encounter']['encounter_id']}, 30-Day Window: {enc_data['readmission_event']['within_30_days']}")

    print("\n=============================================")
    print("ALL CLINICAL COPILOT & POST-DISCHARGE TESTS PASSED!")
    print("=============================================")

if __name__ == "__main__":
    run_tests()
