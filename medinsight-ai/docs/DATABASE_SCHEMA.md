# MedInsight AI — Relational Database Architecture

This document describes the PostgreSQL relational data model and table schemas supporting the MedInsight AI Clinical Decision Support platform.

---

## Entity Relationship Topology

```
User (Role-Based RBAC)
  │
  └── AuditLog (Compliance Tracking)

Patient (Demographics & Safety Badges)
  ├── Encounters (Longitudinal Hospital Stays)
  │     ├── Diagnoses (ICD-10 Coded Problems)
  │     ├── LabResults (LOINC Categorized Labs)
  │     ├── Medications (Active Regimen & Insulin Titration)
  │     ├── Procedures (CPT Interventions)
  │     └── ClinicalNotes (Multidisciplinary Documentation)
  │
  ├── Observations (Physiologic Vitals: HR, BP, SpO2, Temp, RR, BMI)
  ├── Allergies (Severe Allergen Tracking)
  ├── Predictions (ML Probability & Metadata)
  │     └── PredictionExplanations (SHAP Feature Attributions)
  ├── Recommendations (Personalized Prevention Orders)
  └── DischargePlans (Transition Readiness & Safety Checklist)
```

---

## Table Schema Reference

### 1. `users`
- `id` (INTEGER, PK)
- `email` (VARCHAR(255), UNIQUE, INDEX)
- `username` (VARCHAR(100), UNIQUE, INDEX)
- `hashed_password` (VARCHAR(255))
- `full_name` (VARCHAR(255))
- `role` (VARCHAR(50)) — `physician`, `nurse`, `care_coordinator`, `administrator`
- `department` (VARCHAR(100))
- `is_active` (BOOLEAN)
- `created_at` (TIMESTAMP)

### 2. `patients`
- `id` (INTEGER, PK)
- `mrn` (VARCHAR(50), UNIQUE, INDEX) — e.g. `MRN-104928`
- `first_name`, `last_name` (VARCHAR(100))
- `dob` (VARCHAR(20))
- `age` (INTEGER)
- `sex` (VARCHAR(20))
- `blood_group` (VARCHAR(10))
- `race`, `ethnicity` (VARCHAR(50))
- `safety_badges` (JSON) — `["DIABETES", "PENICILLIN ALLERGY", "FALL RISK"]`
- `current_ward`, `current_room` (VARCHAR(50))
- `admission_status` (VARCHAR(50)) — `Inpatient`, `Discharged`

### 3. `encounters`
- `id` (INTEGER, PK)
- `encounter_id` (VARCHAR(50), UNIQUE, INDEX) — e.g. `ENC-2026-008412`
- `patient_id` (INTEGER, FK -> `patients.id`)
- `admission_date` (TIMESTAMP)
- `discharge_date` (TIMESTAMP, NULLABLE)
- `encounter_type` (VARCHAR(50)) — `Inpatient`, `Emergency`, `Ambulatory`
- `department`, `ward`, `room` (VARCHAR)
- `attending_physician` (VARCHAR(150))
- `primary_diagnosis` (VARCHAR(255))
- `secondary_diagnoses` (JSON)
- `length_of_stay` (INTEGER)
- `admission_source`, `admission_type`, `discharge_disposition` (VARCHAR)
- `readmission_status` (VARCHAR(50)) — `Readmitted within 30d`, `No Readmission`, `Pending`
- `is_current` (BOOLEAN)
- *ML Features:* `time_in_hospital`, `num_lab_procedures`, `num_medications`, `number_outpatient`, `number_emergency`, `number_inpatient`, `a1c_result`, `insulin_status`, `previous_readmissions`

### 4. `diagnoses`
- `id` (INTEGER, PK)
- `patient_id` (INTEGER, FK)
- `encounter_id` (INTEGER, FK, NULLABLE)
- `icd_code` (VARCHAR(50), INDEX) — e.g. `E11.65`, `I10`
- `description` (VARCHAR(255))
- `diagnosis_type` (VARCHAR(50)) — `Primary`, `Secondary`, `Chronic`
- `status` (VARCHAR(50)) — `Active`, `Resolved`
- `diagnosed_at` (TIMESTAMP)
- `clinician` (VARCHAR(150))

### 5. `observations`
- `id` (INTEGER, PK)
- `patient_id` (INTEGER, FK)
- `code` (VARCHAR(50)) — `HR`, `BP`, `SPO2`, `TEMP`, `RR`, `BMI`
- `name` (VARCHAR(100))
- `value` (FLOAT)
- `value_string` (VARCHAR(50))
- `unit` (VARCHAR(30))
- `status` (VARCHAR(50)) — `Normal`, `High`, `Low`, `Critical`
- `recorded_at` (TIMESTAMP, INDEX)

### 6. `lab_results`
- `id` (INTEGER, PK)
- `patient_id` (INTEGER, FK)
- `test_code` (VARCHAR(50)) — LOINC code
- `test_name` (VARCHAR(150))
- `category` (VARCHAR(100)) — `Diabetes Monitoring`, `Renal Function`, `Chemistry`, `Hematology`, `Liver Function`
- `value` (FLOAT)
- `unit` (VARCHAR(30))
- `reference_min`, `reference_max` (FLOAT)
- `flag` (VARCHAR(20)) — `Normal`, `High`, `Low`, `Critical`
- `previous_value` (FLOAT)
- `collected_at` (TIMESTAMP, INDEX)

### 7. `medications`
- `id` (INTEGER, PK)
- `patient_id` (INTEGER, FK)
- `medication_name` (VARCHAR(200))
- `dose`, `route`, `frequency` (VARCHAR)
- `status` (VARCHAR(50)) — `Active`, `Held`, `Discontinued`
- `insulin_status` (VARCHAR(50)) — `None`, `Steady`, `Increased`, `Decreased`
- `is_active` (BOOLEAN)

### 8. `allergies`
- `id` (INTEGER, PK)
- `patient_id` (INTEGER, FK)
- `substance` (VARCHAR(150))
- `reaction` (VARCHAR(255))
- `severity` (VARCHAR(50)) — `Severe`, `Moderate`, `Mild`
- `verification_status` (VARCHAR(50))

### 9. `procedures`
- `id` (INTEGER, PK)
- `patient_id` (INTEGER, FK)
- `code` (VARCHAR(50)) — CPT / ICD-10-PCS
- `procedure_name` (VARCHAR(255))
- `department` (VARCHAR(100))
- `clinician` (VARCHAR(150))
- `performed_at` (TIMESTAMP)

### 10. `clinical_notes`
- `id` (INTEGER, PK)
- `patient_id` (INTEGER, FK)
- `note_type` (VARCHAR(100)) — `Physician Progress Note`, `Specialist Consultation`, `Medication Review`, `Case Management`
- `author`, `author_role` (VARCHAR)
- `created_at` (TIMESTAMP)
- `content` (TEXT)

### 11. `predictions` & `prediction_explanations`
- `predictions`: `id`, `patient_id`, `encounter_identifier`, `risk_probability`, `risk_level`, `threshold`, `model_name`, `model_version`, `input_features` (JSON), `prediction_timestamp`
- `prediction_explanations`: `id`, `prediction_id` (FK), `patient_id` (FK), `feature_name`, `feature_value`, `contribution`, `direction`

### 12. `recommendations` & `discharge_plans`
- `recommendations`: `id`, `patient_id`, `title`, `priority`, `reason`, `responsible_team`, `status`, `source`, `is_completed`, `due_date`
- `discharge_plans`: `id`, `patient_id`, `readiness_score`, `medication_reconciliation`, `follow_up_appointment`, `diabetes_education`, `pending_tests_cleared`, `transport_arranged`, `home_monitoring_setup`, `care_coordinator_assigned`, `patient_education_completed`, `high_risk_review_completed`, `notes`, `updated_at`, `updated_by`

### 13. `audit_logs`
- `id` (INTEGER, PK)
- `user_id` (INTEGER, NULLABLE)
- `username` (VARCHAR(100))
- `action` (VARCHAR(100)) — e.g. `PATIENT_RECORD_VIEWED`, `PREDICTION_GENERATED`, `DISCHARGE_PLAN_UPDATED`
- `resource` (VARCHAR(100))
- `patient_id` (INTEGER, NULLABLE, INDEX)
- `details` (JSON)
- `ip_address` (VARCHAR(50))
- `timestamp` (TIMESTAMP, INDEX)
