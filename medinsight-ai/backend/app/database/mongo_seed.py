import datetime
import random
from app.database.mongodb import mongodb_manager
from app.security.password import get_password_hash


def seed_mongodb():
    db = mongodb_manager.db
    patients_col = db["patients"]

    # Check if already seeded
    if patients_col.count_documents({"mrn": "MRN-104928"}) > 0:
        print("MongoDB already seeded with clinical dataset.")
        return

    print("Seeding MedInsight AI MongoDB Collections...")

    # Clear existing collections
    for col_name in [
        "users", "patients", "encounters", "diagnoses", "observations",
        "lab_results", "medications", "allergies", "procedures",
        "clinical_notes", "predictions", "prediction_explanations",
        "recommendations", "discharge_plans", "audit_logs", "chat_history"
    ]:
        db[col_name].delete_many({})

    # 1. Seed Users
    users = [
        {
            "id": 1,
            "email": "sarah.mitchell@medinsight.hospital",
            "username": "dr.sarah",
            "hashed_password": get_password_hash("doctor123"),
            "full_name": "Dr. Sarah Mitchell",
            "role": "physician",
            "department": "Internal Medicine",
            "is_active": True,
            "created_at": datetime.datetime.utcnow().isoformat()
        },
        {
            "id": 2,
            "email": "emily.watson@medinsight.hospital",
            "username": "nurse.emily",
            "hashed_password": get_password_hash("nurse123"),
            "full_name": "Nurse Emily Watson, RN",
            "role": "nurse",
            "department": "Inpatient Medical Ward 5B",
            "is_active": True,
            "created_at": datetime.datetime.utcnow().isoformat()
        },
        {
            "id": 3,
            "email": "alex.rivera@medinsight.hospital",
            "username": "coordinator.alex",
            "hashed_password": get_password_hash("coordinator123"),
            "full_name": "Alex Rivera, MSW",
            "role": "care_coordinator",
            "department": "Transitional Care & Discharge Planning",
            "is_active": True,
            "created_at": datetime.datetime.utcnow().isoformat()
        },
        {
            "id": 4,
            "email": "admin@medinsight.hospital",
            "username": "admin",
            "hashed_password": get_password_hash("admin123"),
            "full_name": "Hospital Administrator",
            "role": "administrator",
            "department": "Health Informatics & Quality",
            "is_active": True,
            "created_at": datetime.datetime.utcnow().isoformat()
        }
    ]
    db["users"].insert_many(users)

    # 2. Seed Primary Star Demo Patient: James Anderson (MRN-104928)
    now = datetime.datetime.utcnow()
    james = {
        "id": 1,
        "mrn": "MRN-104928",
        "first_name": "James",
        "last_name": "Anderson",
        "dob": "1964-03-14",
        "age": 62,
        "sex": "Male",
        "phone": "+1 (555) 234-8901",
        "email": "james.anderson@example.com",
        "address": "742 Evergreen Terrace, Springfield, IL",
        "emergency_contact": "Martha Anderson (Wife) - +1 (555) 234-8902",
        "blood_group": "O+",
        "race": "Caucasian",
        "ethnicity": "Non-Hispanic",
        "safety_badges": ["DIABETES", "PENICILLIN ALLERGY", "FALL RISK", "HIGH READMISSION RISK"],
        "current_ward": "Ward 5B",
        "current_room": "5B-214",
        "admission_status": "Inpatient",
        "primary_diagnosis": "Type 2 Diabetes Mellitus with Hyperglycemia (E11.65)",
        "risk_probability": 0.72,
        "risk_level": "Critical",
        "length_of_stay": 7,
        "created_at": now.isoformat(),
        "updated_at": now.isoformat()
    }
    db["patients"].insert_one(james)

    # James Anderson Encounters (3 longitudinal encounters)
    encounters = [
        {
            "id": 1,
            "encounter_id": "ENC-2025-004192",
            "patient_id": 1,
            "admission_date": (now - datetime.timedelta(days=180)).isoformat(),
            "discharge_date": (now - datetime.timedelta(days=175)).isoformat(),
            "encounter_type": "Inpatient",
            "department": "Cardiology",
            "ward": "4A",
            "room": "4A-108",
            "attending_physician": "Dr. Sarah Mitchell",
            "primary_diagnosis": "Acute Decompensated Heart Failure (NYHA Class III)",
            "secondary_diagnoses": ["Type 2 Diabetes Mellitus", "Essential Hypertension"],
            "length_of_stay": 5,
            "admission_source": "Emergency Department",
            "admission_type": "Emergency",
            "discharge_disposition": "Home with Home Health Care",
            "readmission_status": "Readmitted within 30d",
            "is_current": False,
            "time_in_hospital": 5,
            "num_lab_procedures": 32,
            "num_medications": 14,
            "number_outpatient": 2,
            "number_emergency": 1,
            "number_inpatient": 1,
            "a1c_result": "high",
            "insulin_status": "steady",
            "previous_readmissions": 1
        },
        {
            "id": 2,
            "encounter_id": "ENC-2026-001289",
            "patient_id": 1,
            "admission_date": (now - datetime.timedelta(days=60)).isoformat(),
            "discharge_date": (now - datetime.timedelta(days=59, hours=18)).isoformat(),
            "encounter_type": "Emergency",
            "department": "Emergency Medicine",
            "ward": "ED-Observation",
            "room": "ED-Bay 04",
            "attending_physician": "Dr. Marcus Vance",
            "primary_diagnosis": "Severe Hypoglycemic Episode with Altered Mental Status",
            "secondary_diagnoses": ["Type 2 Diabetes Mellitus with Ketoacidosis risk", "CKD Stage 2"],
            "length_of_stay": 1,
            "admission_source": "Ambulance",
            "admission_type": "Emergency",
            "discharge_disposition": "Home with Self-Care",
            "readmission_status": "No Readmission",
            "is_current": False,
            "time_in_hospital": 1,
            "num_lab_procedures": 18,
            "num_medications": 8,
            "number_outpatient": 3,
            "number_emergency": 2,
            "number_inpatient": 1,
            "a1c_result": "high",
            "insulin_status": "down",
            "previous_readmissions": 1
        },
        {
            "id": 3,
            "encounter_id": "ENC-2026-008412",
            "patient_id": 1,
            "admission_date": (now - datetime.timedelta(days=7)).isoformat(),
            "discharge_date": None,
            "encounter_type": "Inpatient",
            "department": "Internal Medicine",
            "ward": "Ward 5B",
            "room": "5B-214",
            "attending_physician": "Dr. Sarah Mitchell",
            "primary_diagnosis": "Type 2 Diabetes Mellitus with Hyperglycemia (E11.65)",
            "secondary_diagnoses": ["Essential Hypertension (I10)", "Hyperlipidemia (E78.5)", "Chronic Kidney Disease Stage 2 (N18.2)"],
            "length_of_stay": 7,
            "admission_source": "Physician Referral",
            "admission_type": "Urgent",
            "discharge_disposition": "Pending",
            "readmission_status": "Pending",
            "is_current": True,
            "time_in_hospital": 7,
            "num_lab_procedures": 42,
            "num_medications": 18,
            "number_outpatient": 3,
            "number_emergency": 2,
            "number_inpatient": 2,
            "a1c_result": "high",
            "insulin_status": "up",
            "previous_readmissions": 1
        }
    ]
    db["encounters"].insert_many(encounters)

    # Diagnoses
    diagnoses = [
        {"id": 1, "patient_id": 1, "icd_code": "E11.65", "description": "Type 2 Diabetes Mellitus with Hyperglycemia", "diagnosis_type": "Primary", "status": "Active", "diagnosed_at": (now - datetime.timedelta(days=7)).isoformat(), "clinician": "Dr. Sarah Mitchell"},
        {"id": 2, "patient_id": 1, "icd_code": "I10", "description": "Essential (Primary) Hypertension", "diagnosis_type": "Secondary", "status": "Active", "diagnosed_at": (now - datetime.timedelta(days=180)).isoformat(), "clinician": "Dr. Sarah Mitchell"},
        {"id": 3, "patient_id": 1, "icd_code": "E78.5", "description": "Hyperlipidemia, Unspecified", "diagnosis_type": "Secondary", "status": "Active", "diagnosed_at": (now - datetime.timedelta(days=180)).isoformat(), "clinician": "Dr. Sarah Mitchell"},
        {"id": 4, "patient_id": 1, "icd_code": "N18.2", "description": "Chronic Kidney Disease, Stage 2 (Mild)", "diagnosis_type": "Chronic", "status": "Active", "diagnosed_at": (now - datetime.timedelta(days=365)).isoformat(), "clinician": "Dr. Angela Foster"}
    ]
    db["diagnoses"].insert_many(diagnoses)

    # Allergies
    allergies = [
        {"id": 1, "patient_id": 1, "substance": "Penicillin", "reaction": "Anaphylaxis / Severe Hives / Bronchospasm", "severity": "Severe", "verification_status": "Confirmed", "identified_at": "2018-05-12T00:00:00"}
    ]
    db["allergies"].insert_many(allergies)

    # Medications
    medications = [
        {"id": 1, "patient_id": 1, "medication_name": "Insulin Glargine (Lantus)", "dose": "28 Units", "route": "Subcutaneous", "frequency": "Once Daily at Bedtime", "status": "Active", "insulin_status": "Increased", "is_active": True, "prescribed_at": (now - datetime.timedelta(days=2)).isoformat(), "prescribed_by": "Dr. Sarah Mitchell"},
        {"id": 2, "patient_id": 1, "medication_name": "Insulin Lispro (Humalog)", "dose": "6 Units", "route": "Subcutaneous", "frequency": "TID with Meals", "status": "Active", "insulin_status": "Increased", "is_active": True, "prescribed_at": (now - datetime.timedelta(days=2)).isoformat(), "prescribed_by": "Dr. Sarah Mitchell"},
        {"id": 3, "patient_id": 1, "medication_name": "Metformin HCl", "dose": "1000 mg", "route": "Oral", "frequency": "BID with Meals", "status": "Held", "insulin_status": "None", "is_active": False, "prescribed_at": (now - datetime.timedelta(days=7)).isoformat(), "prescribed_by": "Dr. Sarah Mitchell"},
        {"id": 4, "patient_id": 1, "medication_name": "Lisinopril", "dose": "20 mg", "route": "Oral", "frequency": "Daily", "status": "Active", "insulin_status": "None", "is_active": True, "prescribed_at": (now - datetime.timedelta(days=7)).isoformat(), "prescribed_by": "Dr. Sarah Mitchell"},
        {"id": 5, "patient_id": 1, "medication_name": "Atorvastatin Calcium", "dose": "40 mg", "route": "Oral", "frequency": "Daily at Bedtime", "status": "Active", "insulin_status": "None", "is_active": True, "prescribed_at": (now - datetime.timedelta(days=7)).isoformat(), "prescribed_by": "Dr. Sarah Mitchell"},
        {"id": 6, "patient_id": 1, "medication_name": "Furosemide (Lasix)", "dose": "40 mg", "route": "Oral", "frequency": "Daily Morning", "status": "Active", "insulin_status": "None", "is_active": True, "prescribed_at": (now - datetime.timedelta(days=7)).isoformat(), "prescribed_by": "Dr. Sarah Mitchell"}
    ]
    db["medications"].insert_many(medications)

    # Vitals / Observations
    vitals = [
        {"id": 1, "patient_id": 1, "code": "HR", "name": "Heart Rate", "value": 78.0, "value_string": "78 bpm", "unit": "bpm", "status": "Normal", "recorded_at": (now - datetime.timedelta(hours=2)).isoformat()},
        {"id": 2, "patient_id": 1, "code": "BP", "name": "Blood Pressure", "value": 138.0, "value_string": "138/84 mmHg", "unit": "mmHg", "status": "High", "recorded_at": (now - datetime.timedelta(hours=2)).isoformat()},
        {"id": 3, "patient_id": 1, "code": "SPO2", "name": "Oxygen Saturation", "value": 97.0, "value_string": "97%", "unit": "%", "status": "Normal", "recorded_at": (now - datetime.timedelta(hours=2)).isoformat()},
        {"id": 4, "patient_id": 1, "code": "TEMP", "name": "Body Temperature", "value": 98.6, "value_string": "98.6 °F", "unit": "°F", "status": "Normal", "recorded_at": (now - datetime.timedelta(hours=2)).isoformat()},
        {"id": 5, "patient_id": 1, "code": "RR", "name": "Respiratory Rate", "value": 18.0, "value_string": "18 /min", "unit": "/min", "status": "Normal", "recorded_at": (now - datetime.timedelta(hours=2)).isoformat()},
        {"id": 6, "patient_id": 1, "code": "BMI", "name": "Body Mass Index", "value": 31.4, "value_string": "31.4 kg/m²", "unit": "kg/m²", "status": "High", "recorded_at": (now - datetime.timedelta(days=7)).isoformat()}
    ]
    db["observations"].insert_many(vitals)

    # Labs
    labs = [
        {"id": 1, "patient_id": 1, "test_code": "4548-4", "test_name": "Hemoglobin A1c (HbA1c)", "category": "Diabetes Monitoring", "value": 9.2, "unit": "%", "reference_min": 4.0, "reference_max": 5.6, "flag": "Critical", "previous_value": 8.4, "collected_at": (now - datetime.timedelta(days=7)).isoformat()},
        {"id": 2, "patient_id": 1, "test_code": "2345-7", "test_name": "Glucose, Fasting Plasma", "category": "Diabetes Monitoring", "value": 214.0, "unit": "mg/dL", "reference_min": 70.0, "reference_max": 99.0, "flag": "High", "previous_value": 320.0, "collected_at": (now - datetime.timedelta(hours=4)).isoformat()},
        {"id": 3, "patient_id": 1, "test_code": "2160-0", "test_name": "Serum Creatinine", "category": "Renal Function", "value": 1.4, "unit": "mg/dL", "reference_min": 0.7, "reference_max": 1.3, "flag": "High", "previous_value": 1.3, "collected_at": (now - datetime.timedelta(days=1)).isoformat()},
        {"id": 4, "patient_id": 1, "test_code": "3094-0", "test_name": "Blood Urea Nitrogen (BUN)", "category": "Renal Function", "value": 24.0, "unit": "mg/dL", "reference_min": 7.0, "reference_max": 20.0, "flag": "High", "previous_value": 26.0, "collected_at": (now - datetime.timedelta(days=1)).isoformat()},
        {"id": 5, "patient_id": 1, "test_code": "33914-3", "test_name": "Estimated GFR (eGFR)", "category": "Renal Function", "value": 58.0, "unit": "mL/min/1.73m²", "reference_min": 60.0, "reference_max": 120.0, "flag": "Low", "previous_value": 62.0, "collected_at": (now - datetime.timedelta(days=1)).isoformat()},
        {"id": 6, "patient_id": 1, "test_code": "2823-3", "test_name": "Serum Potassium", "category": "Chemistry", "value": 4.6, "unit": "mEq/L", "reference_min": 3.5, "reference_max": 5.0, "flag": "Normal", "previous_value": 4.8, "collected_at": (now - datetime.timedelta(days=1)).isoformat()}
    ]
    db["lab_results"].insert_many(labs)

    # Clinical Notes
    notes = [
        {"id": 1, "patient_id": 1, "note_type": "Attending Physician Progress Note", "author": "Dr. Sarah Mitchell, MD", "author_role": "Attending Physician", "created_at": (now - datetime.timedelta(hours=6)).isoformat(), "content": "Patient James Anderson is a 62yo male admitted with severe glycemic instability and acute hyperglycemia (glucose 320 on admission, A1c 9.2%). Over the 7-day stay, IV insulin was transitioned to subcutaneous Basal-Bolus (Lantus 28u qHS, Humalog 6u TID with meals). Blood sugars are stabilizing between 140-190 mg/dL. Metformin remains held given borderline eGFR (58 mL/min). Patient has significant readmission risk given multiple recent admissions and insulin escalation. Coordinating with case management for home nursing and endocrinology follow-up within 7 days."},
        {"id": 2, "patient_id": 1, "note_type": "Certified Diabetes Educator (CDCES) Consult", "author": "Rachel Green, MS, RD, CDCES", "author_role": "Diabetes Educator", "created_at": (now - datetime.timedelta(days=1)).isoformat(), "content": "Completed 1-on-1 bedside diabetes self-management education. Patient demonstrated correct subcutaneous insulin injection technique with insulin pen and glucometer testing. Discussed recognition of hypoglycemia symptoms (shakiness, diaphoresis, confusion) and rule of 15 treatment with fast-acting carbs. Patient expresses motivation but has anxiety regarding insulin dose adjustment. Provided written sliding scale instructions."},
        {"id": 3, "patient_id": 1, "note_type": "Inpatient Clinical Pharmacy Medication Reconciliation", "author": "Dr. Kevin Patel, PharmD", "author_role": "Clinical Pharmacist", "created_at": (now - datetime.timedelta(days=2)).isoformat(), "content": "Comprehensive medication reconciliation completed. Polypharmacy identified: 18 active medications. Penicillin allergy confirmed (severe anaphylaxis). Renally adjusted medications verified for eGFR 58. Recommended discontinuing sulfonylurea at home and continuing Basal-Bolus insulin. 30-day supply of Lantus and Humalog co-pay assistance voucher secured for discharge."},
        {"id": 4, "patient_id": 1, "note_type": "Transitional Care & Social Work Evaluation", "author": "Alex Rivera, MSW", "author_role": "Care Coordinator", "created_at": (now - datetime.timedelta(hours=18)).isoformat(), "content": "Met with patient and spouse Martha. Confirmed post-discharge support system. Arranged home health nursing visits (2x/week for vital signs and glucometer checks). Scheduled follow-up primary care appointment with Dr. Sarah Mitchell for 6 days post-discharge (Aug 23). Transportation confirmed."}
    ]
    db["clinical_notes"].insert_many(notes)

    # Procedures
    procs = [
        {"id": 1, "patient_id": 1, "code": "93306", "procedure_name": "Transthoracic Echocardiogram (2D with Doppler)", "department": "Cardiovascular Diagnostics", "clinician": "Dr. Robert Vance, FACC", "performed_at": (now - datetime.timedelta(days=5)).isoformat()},
        {"id": 2, "patient_id": 1, "code": "76770", "procedure_name": "Renal Ultrasound Complete", "department": "Radiology", "clinician": "Dr. Susan Miller, MD", "performed_at": (now - datetime.timedelta(days=4)).isoformat()},
        {"id": 3, "patient_id": 1, "code": "99214", "procedure_name": "Comprehensive Diabetic Foot Exam & Monofilament Sensory Testing", "department": "Internal Medicine", "clinician": "Dr. Sarah Mitchell, MD", "performed_at": (now - datetime.timedelta(days=3)).isoformat()}
    ]
    db["procedures"].insert_many(procs)

    # Prediction & Explanations
    pred = {
        "id": 1,
        "patient_id": 1,
        "encounter_identifier": "ENC-2026-008412",
        "risk_probability": 0.72,
        "risk_level": "Critical",
        "threshold": 0.50,
        "model_name": "MedInsight-Ensemble-XGBoost-LightGBM",
        "model_version": "prod-v2.1",
        "input_features": {
            "time_in_hospital": 7,
            "num_lab_procedures": 42,
            "num_medications": 18,
            "number_outpatient": 3,
            "number_emergency": 2,
            "number_inpatient": 2,
            "A1Cresult": "high",
            "insulin": "up",
            "previous_readmissions": 1
        },
        "prediction_timestamp": now.isoformat()
    }
    db["predictions"].insert_one(pred)

    explanations = [
        {"id": 1, "prediction_id": 1, "patient_id": 1, "feature_name": "Prior Inpatient Admissions (Last 12mo)", "feature_value": "2 admissions", "contribution": 0.18, "direction": "increases_risk"},
        {"id": 2, "prediction_id": 1, "patient_id": 1, "feature_name": "Previous 30-Day Readmission History", "feature_value": "1 readmission", "contribution": 0.12, "direction": "increases_risk"},
        {"id": 3, "prediction_id": 1, "patient_id": 1, "feature_name": "Insulin Regimen Titrated Upward", "feature_value": "Increased (+10u)", "contribution": 0.11, "direction": "increases_risk"},
        {"id": 4, "prediction_id": 1, "patient_id": 1, "feature_name": "Elevated Glycated Hemoglobin (HbA1c)", "feature_value": "9.2% (High)", "contribution": 0.09, "direction": "increases_risk"},
        {"id": 5, "prediction_id": 1, "patient_id": 1, "feature_name": "High Medication Burden (Polypharmacy)", "feature_value": "18 active meds", "contribution": 0.07, "direction": "increases_risk"},
        {"id": 6, "prediction_id": 1, "patient_id": 1, "feature_name": "Extended Length of Stay", "feature_value": "7 days", "contribution": 0.06, "direction": "increases_risk"}
    ]
    db["prediction_explanations"].insert_many(explanations)

    # Recommendations
    recommendations = [
        {"id": 1, "patient_id": 1, "title": "Medication Reconciliation at Discharge", "priority": "Urgent", "reason": "High polypharmacy (18 meds) and insulin titration increase readmission risk.", "responsible_team": "Clinical Pharmacy", "status": "Completed", "source": "CDS Protocol", "is_completed": True, "due_date": "At Discharge"},
        {"id": 2, "patient_id": 1, "title": "7-Day Outpatient Primary Care Follow-up", "priority": "Urgent", "reason": "Rapid post-discharge clinical evaluation lowers 30-day readmissions by up to 24%.", "responsible_team": "Care Coordinator", "status": "Completed", "source": "CMS Bundle", "is_completed": True, "due_date": "Aug 23, 2026"},
        {"id": 3, "patient_id": 1, "title": "Certified Diabetes Educator (CDCES) Inpatient Consultation", "priority": "High", "reason": "Patient newly escalated to basal-bolus insulin regimen with high HbA1c (9.2%).", "responsible_team": "Endocrinology / CDCES", "status": "Completed", "source": "ADA Guidelines", "is_completed": True, "due_date": "Completed Aug 16"},
        {"id": 4, "patient_id": 1, "title": "Home Health Nurse Follow-Up & Vitals Monitoring", "priority": "High", "reason": "Monitor blood pressure, glycemic response, and adherence at home twice weekly.", "responsible_team": "Transitional Care", "status": "Pending", "source": "Care Coordination", "is_completed": False, "due_date": "48h Post-Discharge"}
    ]
    db["recommendations"].insert_many(recommendations)

    # Discharge Plan
    discharge_plan = {
        "id": 1,
        "patient_id": 1,
        "readiness_score": 78,
        "medication_reconciliation": True,
        "follow_up_appointment": True,
        "diabetes_education": True,
        "pending_tests_cleared": True,
        "transport_arranged": True,
        "home_monitoring_setup": False,
        "care_coordinator_assigned": True,
        "patient_education_completed": True,
        "high_risk_review_completed": False,
        "notes": "Patient is clinically stable for discharge tomorrow morning. Home nursing referral placed. 7-day follow-up confirmed.",
        "updated_at": now.isoformat(),
        "updated_by": "Dr. Sarah Mitchell"
    }
    db["discharge_plans"].insert_one(discharge_plan)

    # 3. Seed remaining 29 synthetic patients with complete clinical attributes
    cohorts = [
        # High Risk
        ("Eleanor", "Vance", 74, "Female", "MRN-100284", "Ward 4B", "4B-201", "Congestive Heart Failure (I50.9)", 0.68, "High", 6),
        ("Robert", "Chen", 68, "Male", "MRN-100426", "Ward 3C", "3C-112", "COPD with Acute Exacerbation (J44.1)", 0.65, "High", 5),
        ("Margaret", "Taylor", 81, "Female", "MRN-100568", "ICU Step-down", "ICU-S03", "Acute Kidney Injury on CKD (N17.9)", 0.74, "Critical", 8),
        ("Arthur", "Jenkins", 71, "Male", "MRN-100710", "Ward 5A", "5A-104", "Severe Sepsis secondary to UTI (A41.9)", 0.71, "Critical", 9),
        ("Maria", "Gonzalez", 59, "Female", "MRN-100852", "Cardiology 4A", "4A-210", "Non-ST Elevation Myocardial Infarction", 0.62, "High", 4),
        ("David", "Kim", 65, "Male", "MRN-100994", "Ward 3B", "3B-305", "Acute Pancreatitis (K85.9)", 0.76, "Critical", 7),
        ("Patricia", "Wilson", 77, "Female", "MRN-101136", "Ward 4A", "4A-118", "Atrial Fibrillation with RVR (I48.0)", 0.58, "High", 4),
        ("Thomas", "Clark", 63, "Male", "MRN-101278", "Ward 5B", "5B-208", "Type 2 Diabetes with Foot Ulcer (E11.621)", 0.70, "Critical", 8),
        ("Dorothy", "Adams", 83, "Female", "MRN-101420", "Neurology 2A", "2A-106", "Acute Ischemic Stroke (I63.9)", 0.64, "High", 6),
        # Moderate Risk
        ("Samuel", "Wright", 56, "Male", "MRN-101562", "Ward 5A", "5A-212", "Cellulitis of Left Lower Extremity (L03.116)", 0.44, "Moderate", 3),
        ("Linda", "Martinez", 52, "Female", "MRN-101704", "Ward 5B", "5B-102", "Uncontrolled Type 2 Diabetes (E11.65)", 0.48, "Moderate", 4),
        ("William", "Harris", 70, "Male", "MRN-101846", "Orthopedics 3A", "3A-108", "Elective Total Knee Arthroplasty (Z96.651)", 0.38, "Moderate", 3),
        ("Elizabeth", "Lewis", 66, "Female", "MRN-101988", "Ward 5A", "5A-116", "Community-Acquired Pneumonia (J18.9)", 0.46, "Moderate", 4),
        ("Charles", "Walker", 58, "Male", "MRN-102130", "Ward 3B", "3B-204", "Acute Diverticulitis (K57.32)", 0.41, "Moderate", 3),
        ("Barbara", "Hall", 64, "Female", "MRN-102272", "Surgical Ward 2B", "2B-109", "Laparoscopic Cholecystectomy (K80.20)", 0.35, "Moderate", 2),
        ("Joseph", "Young", 61, "Male", "MRN-102414", "Ward 4A", "4A-220", "Hypertensive Emergency (I16.9)", 0.47, "Moderate", 3),
        ("Susan", "King", 55, "Female", "MRN-102556", "Ward 5B", "5B-114", "Diabetic Ketoacidosis (Resolved) (E11.10)", 0.49, "Moderate", 4),
        ("Richard", "Scott", 73, "Male", "MRN-102698", "Ward 3B", "3B-118", "Acute Gastroenteritis with Dehydration", 0.39, "Moderate", 2),
        ("Jessica", "Green", 34, "Female", "MRN-102840", "Day Surgery 2A", "2A-301", "Laparoscopic Appendectomy (K35.80)", 0.32, "Moderate", 2),
        # Low Risk
        ("Brian", "Baker", 42, "Male", "MRN-102982", "Surgical 2B", "2B-215", "Inguinal Hernia Repair (K40.90)", 0.14, "Low", 1),
        ("Sarah", "Nelson", 29, "Female", "MRN-103124", "Maternity 1B", "1B-104", "Postpartum Observation (O80)", 0.08, "Low", 2),
        ("Kevin", "Carter", 47, "Male", "MRN-103266", "Orthopedics 3A", "3A-206", "Arthroscopic Meniscectomy (M23.22)", 0.12, "Low", 1),
        ("Nancy", "Mitchell", 39, "Female", "MRN-103408", "Ward 3B", "3B-110", "Acute Bronchitis (J20.9)", 0.18, "Low", 2),
        ("Daniel", "Perez", 45, "Male", "MRN-103550", "Day Surgery 2A", "2A-308", "Tonsillectomy (J35.01)", 0.11, "Low", 1),
        ("Karen", "Roberts", 51, "Female", "MRN-103692", "Ward 3B", "3B-114", "Uncomplicated Pyelonephritis (N10)", 0.22, "Low", 3),
        ("Steven", "Turner", 38, "Male", "MRN-103834", "Orthopedics 3A", "3A-112", "Distal Radius Fracture Fixation", 0.15, "Low", 2),
        ("Amanda", "Phillips", 41, "Female", "MRN-103976", "ENT / Short Stay", "1A-102", "Septoplasty (J34.2)", 0.09, "Low", 1),
        ("Jason", "Campbell", 49, "Male", "MRN-104118", "Urology 2C", "2C-104", "Ureteral Calculus Laser Lithotripsy", 0.20, "Low", 2),
        ("Rachel", "Parker", 33, "Female", "MRN-104260", "Day Surgery 2A", "2A-312", "Excision of Benign Skin Lesion (L82.1)", 0.07, "Low", 1)
    ]

    patient_records = []
    enc_records = []
    dp_records = []

    for idx, c in enumerate(cohorts, start=2):
        p_doc = {
            "id": idx,
            "mrn": c[4],
            "first_name": c[0],
            "last_name": c[1],
            "dob": f"{1950 + (idx * 2) % 45}-0{1 + idx % 9}-15",
            "age": c[2],
            "sex": c[3],
            "phone": f"+1 (555) {100 + idx}-{2000 + idx}",
            "email": f"{c[0].lower()}.{c[1].lower()}@example.com",
            "address": f"{100 + idx} Elm Street, Suite {idx}, Springfield, IL",
            "emergency_contact": f"Family Contact - +1 (555) 999-{1000 + idx}",
            "blood_group": ["A+", "O+", "B+", "AB+", "A-", "O-"][idx % 6],
            "race": ["Caucasian", "African American", "Hispanic/Latino", "Asian"][idx % 4],
            "ethnicity": "Non-Hispanic" if idx % 4 != 2 else "Hispanic",
            "safety_badges": ["FALL RISK"] if c[8] >= 0.50 else [],
            "current_ward": c[5],
            "current_room": c[6],
            "admission_status": "Inpatient",
            "primary_diagnosis": c[7],
            "risk_probability": c[8],
            "risk_level": c[9],
            "length_of_stay": c[10],
            "created_at": now.isoformat(),
            "updated_at": now.isoformat()
        }
        patient_records.append(p_doc)

        enc_doc = {
            "id": idx + 2,
            "encounter_id": f"ENC-2026-{100000 + idx * 317}",
            "patient_id": idx,
            "admission_date": (now - datetime.timedelta(days=c[10])).isoformat(),
            "discharge_date": None,
            "encounter_type": "Inpatient",
            "department": c[5],
            "ward": c[5],
            "room": c[6],
            "attending_physician": "Dr. Sarah Mitchell" if idx % 2 == 0 else "Dr. Marcus Vance",
            "primary_diagnosis": c[7],
            "secondary_diagnoses": ["Hypertension"] if c[2] > 60 else [],
            "length_of_stay": c[10],
            "admission_source": "Emergency" if c[8] >= 0.50 else "Elective",
            "admission_type": "Emergency" if c[8] >= 0.50 else "Elective",
            "discharge_disposition": "Pending",
            "readmission_status": "Pending",
            "is_current": True,
            "time_in_hospital": c[10],
            "num_lab_procedures": 10 + idx * 2,
            "num_medications": 5 + idx % 10,
            "number_outpatient": 1 + idx % 3,
            "number_emergency": 1 if c[8] >= 0.50 else 0,
            "number_inpatient": 1 if c[8] >= 0.60 else 0,
            "a1c_result": "high" if "Diabetes" in c[7] else "none",
            "insulin_status": "steady" if "Diabetes" in c[7] else "none",
            "previous_readmissions": 1 if c[8] >= 0.70 else 0
        }
        enc_records.append(enc_doc)

        dp_doc = {
            "id": idx,
            "patient_id": idx,
            "readiness_score": random.randint(45, 90),
            "medication_reconciliation": c[8] < 0.50,
            "follow_up_appointment": c[8] < 0.60,
            "diabetes_education": "Diabetes" not in c[7],
            "pending_tests_cleared": True,
            "transport_arranged": True,
            "home_monitoring_setup": False,
            "care_coordinator_assigned": c[8] >= 0.50,
            "patient_education_completed": True,
            "high_risk_review_completed": False,
            "notes": "Standard care pathway active.",
            "updated_at": now.isoformat(),
            "updated_by": "Dr. Sarah Mitchell"
        }
        dp_records.append(dp_doc)

    db["patients"].insert_many(patient_records)
    db["encounters"].insert_many(enc_records)
    db["discharge_plans"].insert_many(dp_records)

    print(f"MongoDB successfully seeded with {len(patient_records) + 1} patient records and complete EHR data!")


if __name__ == "__main__":
    seed_mongodb()
