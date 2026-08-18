# MedInsight AI — MongoDB Database Schema & Collection Architecture

This document describes the MongoDB NoSQL data model, collection schemas, document relationships, and institutional indexes supporting the MedInsight Clinical Information System.

---

## 1. Architecture Overview

The system utilizes **MongoDB** as the single authoritative database source:

```
                  diabetic_data.csv (Historical Cohort)
                                │
                                ▼
                       MongoDB Database
                 (Cluster / High-Performance Store)
                   ├── users
                   ├── patients (UCI + Registered)
                   ├── encounters (1-to-Many by patient_id)
                   ├── observations & labs
                   ├── diagnoses & medications
                   ├── predictions & explanations
                   ├── care_plans & post_discharge
                   └── audit_logs
```

---

## 2. Core Collections & Schemas

### `users`
Stores clinical staff accounts and role-based permissions.

```json
{
  "_id": "ObjectId(...)",
  "id": 1,
  "email": "sarah.mitchell@medinsight.hospital",
  "username": "dr.sarah",
  "hashed_password": "$2b$12$...",
  "full_name": "Dr. Sarah Mitchell",
  "role": "physician",
  "department": "Internal Medicine",
  "is_active": true,
  "created_at": "2026-08-18T00:00:00.000Z"
}
```

### `patients`
Master patient index supporting both imported historical records and user-registered clinical patients.

```json
{
  "_id": "ObjectId(...)",
  "id": 1,
  "mrn": "MRN-104928",
  "source_patient_id": "822215",
  "patient_nbr": 822215,
  "record_source": "CLINICAL_REGISTRATION",
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
  "created_at": "2026-08-18T00:00:00.000Z",
  "updated_at": "2026-08-18T00:00:00.000Z"
}
```

### `encounters`
Longitudinal inpatient and emergency encounters linked to `patient_id`. Multiple encounters reference the same patient record.

```json
{
  "_id": "ObjectId(...)",
  "id": 3,
  "encounter_id": "ENC-2026-008412",
  "patient_id": 1,
  "source_encounter_id": "244372",
  "record_source": "CLINICAL_REGISTRATION",
  "admission_date": "2026-08-11T00:00:00.000Z",
  "discharge_date": null,
  "encounter_type": "Inpatient",
  "department": "Internal Medicine",
  "ward": "Ward 5B",
  "room": "5B-214",
  "attending_physician": "Dr. Sarah Mitchell",
  "primary_diagnosis": "Type 2 Diabetes Mellitus with Hyperglycemia (E11.65)",
  "secondary_diagnoses": ["Essential Hypertension (I10)", "Hyperlipidemia (E78.5)"],
  "length_of_stay": 7,
  "admission_source": "Physician Referral",
  "admission_type": "Urgent",
  "discharge_disposition": "Pending",
  "readmission_status": "Pending",
  "is_current": true,
  "num_lab_procedures": 42,
  "num_medications": 18,
  "number_outpatient": 3,
  "number_emergency": 2,
  "number_inpatient": 2,
  "a1c_result": "high",
  "insulin_status": "up"
}
```

### `observations` (Vitals & Telemetry)
```json
{
  "_id": "ObjectId(...)",
  "id": 1,
  "patient_id": 1,
  "encounter_id": "ENC-2026-008412",
  "code": "BP",
  "name": "Blood Pressure",
  "observation_type": "blood_pressure",
  "value": 138.0,
  "value_string": "138/84 mmHg",
  "unit": "mmHg",
  "status": "High",
  "source": "MANUAL_ENTRY",
  "recorded_at": "2026-08-18T00:00:00.000Z"
}
```

### `predictions` & `prediction_explanations`
Actual outputs from the trained ML ensemble pipeline (`diabetes_readmission_notebook_final`) and TreeSHAP attributions.

```json
{
  "_id": "ObjectId(...)",
  "id": 1,
  "patient_id": 1,
  "encounter_id": 3,
  "encounter_identifier": "ENC-2026-008412",
  "probability": 0.72,
  "predicted_class": "Readmitted <30 Days",
  "risk_level": "Critical",
  "decision_threshold": 0.45,
  "model_name": "MedInsight-Ensemble-XGBoost-LightGBM",
  "model_version": "prod-v2.1",
  "is_demo": false,
  "data_source": "diabetic_data.csv",
  "prediction_timestamp": "2026-08-18T00:00:00.000Z"
}
```

### `post_discharge_care_plans`
Longitudinal recovery tracking, 4-week follow-up visit timeline, and multi-disciplinary care regimens.

```json
{
  "_id": "ObjectId(...)",
  "patient_id": 1,
  "discharge_date": "2026-08-18T00:00:00.000Z",
  "readiness_score": 78,
  "follow_up_visits": [...],
  "medication_supplies": [...],
  "nutrition_plan": {...},
  "rehabilitation_plan": {...},
  "patient_coverage": {...},
  "emergency_contact": {...},
  "readmission_events": []
}
```

### `audit_logs`
HIPAA-compliant administrative and clinical action trail.

```json
{
  "_id": "ObjectId(...)",
  "user_id": 1,
  "username": "dr.sarah",
  "action": "PATIENT_CREATED",
  "resource": "patients",
  "patient_id": 1,
  "encounter_id": 3,
  "ip_address": "127.0.0.1",
  "timestamp": "2026-08-18T00:00:00.000Z"
}
```

---

## 3. MongoDB Indexes

The application automatically verifies and enforces the following indexes during FastAPI startup:

| Collection | Index Key(s) | Unique | Purpose |
|---|---|---|---|
| `users` | `username` | Yes | Fast authentication lookup and uniqueness |
| `users` | `email` | No | User search by email |
| `patients` | `mrn` | Yes | Fast patient lookup by institutional MRN |
| `patients` | `source_patient_id` | No | Historical dataset cross-reference |
| `patients` | `patient_nbr` | No | Historical dataset patient number |
| `patients` | `risk_probability` (DESC) | No | High-risk census sorting |
| `patients` | `first_name`, `last_name` | No | Full-name clinical search |
| `encounters` | `encounter_id` | Yes | Unique encounter identifier lookup |
| `encounters` | `patient_id` | No | Longitudinal encounter history retrieval |
| `observations` | `patient_id`, `encounter_id` | No | Scoped observation retrieval |
| `audit_logs` | `timestamp` (DESC) | No | Chronological security review |
| `audit_logs` | `patient_id` | No | Patient-specific audit trail |
| `post_discharge_care_plans` | `patient_id` | Yes | Single active post-discharge care plan |
