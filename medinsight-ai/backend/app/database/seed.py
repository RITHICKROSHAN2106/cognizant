import datetime
import random
from sqlalchemy.orm import Session
from app.database.session import SessionLocal, engine
from app.database.base import Base
from app.models.models import (
    User, Patient, Encounter, Diagnosis, Observation,
    LabResult, Medication, Allergy, Procedure, ClinicalNote,
    Prediction, PredictionExplanation, Recommendation, DischargePlan, AuditLog
)
from app.security.password import get_password_hash
from app.ml.demo_model import DemoReadmissionModel


def seed_database():
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()

    try:
        # Check if already seeded
        if db.query(Patient).filter(Patient.mrn == "MRN-104928").first():
            print("Database already seeded with demo data.")
            return

        print("Seeding MedInsight AI database...")

        # 1. Seed Users
        demo_users = [
            User(
                email="sarah.mitchell@medinsight.hospital",
                username="dr.sarah",
                hashed_password=get_password_hash("doctor123"),
                full_name="Dr. Sarah Mitchell",
                role="physician",
                department="Internal Medicine",
                is_active=True
            ),
            User(
                email="emily.watson@medinsight.hospital",
                username="nurse.emily",
                hashed_password=get_password_hash("nurse123"),
                full_name="Nurse Emily Watson, RN",
                role="nurse",
                department="Inpatient Medical Ward 5B",
                is_active=True
            ),
            User(
                email="alex.rivera@medinsight.hospital",
                username="coordinator.alex",
                hashed_password=get_password_hash("coordinator123"),
                full_name="Alex Rivera, MSW",
                role="care_coordinator",
                department="Transitional Care & Discharge Planning",
                is_active=True
            ),
            User(
                email="admin@medinsight.hospital",
                username="admin",
                hashed_password=get_password_hash("admin123"),
                full_name="Hospital Administrator",
                role="administrator",
                department="Health Informatics & Quality",
                is_active=True
            )
        ]
        db.add_all(demo_users)
        db.commit()

        # 2. Seed Presentation Star Patient: James Anderson (MRN-104928)
        now = datetime.datetime.utcnow()
        admit_time = now - datetime.timedelta(days=7, hours=4)
        exp_discharge = now + datetime.timedelta(days=1, hours=2)

        james = Patient(
            mrn="MRN-104928",
            first_name="James",
            last_name="Anderson",
            dob="1964-03-14",
            age=62,
            sex="Male",
            blood_group="O+",
            race="Caucasian",
            ethnicity="Non-Hispanic",
            safety_badges=["DIABETES", "PENICILLIN ALLERGY", "FALL RISK", "HIGH READMISSION RISK"],
            current_ward="Ward 5B",
            current_room="5B-214",
            admission_status="Inpatient"
        )
        db.add(james)
        db.flush()

        # Star Patient Historical Encounter 1 (6 months ago - Inpatient)
        enc_hist1 = Encounter(
            encounter_id="ENC-2025-004192",
            patient_id=james.id,
            admission_date=now - datetime.timedelta(days=180),
            discharge_date=now - datetime.timedelta(days=175),
            encounter_type="Inpatient",
            department="Cardiology",
            ward="4A",
            room="4A-108",
            attending_physician="Dr. Sarah Mitchell",
            primary_diagnosis="Acute Decompensated Heart Failure (NYHA Class III)",
            secondary_diagnoses=["Type 2 Diabetes Mellitus", "Essential Hypertension"],
            length_of_stay=5,
            admission_source="Emergency Department",
            admission_type="Emergency",
            discharge_disposition="Home with Home Health Care",
            readmission_status="Readmitted within 30d",
            is_current=False,
            time_in_hospital=5,
            num_lab_procedures=32,
            num_medications=14,
            number_outpatient=2,
            number_emergency=1,
            number_inpatient=1,
            a1c_result="high",
            insulin_status="steady",
            previous_readmissions=1
        )
        db.add(enc_hist1)

        # Star Patient Historical Encounter 2 (2 months ago - Emergency Department)
        enc_hist2 = Encounter(
            encounter_id="ENC-2026-001289",
            patient_id=james.id,
            admission_date=now - datetime.timedelta(days=60),
            discharge_date=now - datetime.timedelta(days=59, hours=18),
            encounter_type="Emergency",
            department="Emergency Medicine",
            ward="ED-Observation",
            room="ED-Bay 04",
            attending_physician="Dr. Marcus Vance",
            primary_diagnosis="Severe Hypoglycemic Episode with Altered Mental Status",
            secondary_diagnoses=["Type 2 Diabetes Mellitus with Ketoacidosis risk", "CKD Stage 2"],
            length_of_stay=1,
            admission_source="Self-referral / Ambulance",
            admission_type="Emergency",
            discharge_disposition="Home with Self-Care",
            readmission_status="No Readmission",
            is_current=False,
            time_in_hospital=1,
            num_lab_procedures=18,
            num_medications=12,
            number_outpatient=3,
            number_emergency=2,
            number_inpatient=1,
            a1c_result="high",
            insulin_status="up",
            previous_readmissions=1
        )
        db.add(enc_hist2)

        # Star Patient Current Active Encounter
        enc_current = Encounter(
            encounter_id="ENC-2026-008412",
            patient_id=james.id,
            admission_date=admit_time,
            discharge_date=None,
            encounter_type="Inpatient",
            department="Internal Medicine",
            ward="Ward 5B",
            room="5B-214",
            attending_physician="Dr. Sarah Mitchell",
            primary_diagnosis="Type 2 Diabetes Mellitus with Hyperglycemia and Hyperosmolar State",
            secondary_diagnoses=[
                "Essential Hypertension (I10)",
                "Hyperlipidemia (E78.5)",
                "Chronic Kidney Disease Stage 2 (N18.2)",
                "Peripheral Diabetic Neuropathy (E11.40)"
            ],
            length_of_stay=7,
            admission_source="Emergency Department",
            admission_type="Urgent / Acute",
            discharge_disposition="Pending Care Coordinator Review",
            expected_discharge=exp_discharge,
            readmission_status="Pending",
            is_current=True,
            time_in_hospital=7,
            num_lab_procedures=42,
            num_medications=18,
            number_outpatient=3,
            number_emergency=2,
            number_inpatient=2,
            a1c_result="high",
            insulin_status="up",
            previous_readmissions=1
        )
        db.add(enc_current)
        db.flush()

        # Star Patient Diagnoses
        diagnoses_list = [
            Diagnosis(patient_id=james.id, encounter_id=enc_current.id, icd_code="E11.65", description="Type 2 Diabetes Mellitus with Hyperglycemia", diagnosis_type="Primary", status="Active", diagnosed_at=admit_time, clinician="Dr. Sarah Mitchell"),
            Diagnosis(patient_id=james.id, encounter_id=enc_current.id, icd_code="I10", description="Essential (Primary) Hypertension", diagnosis_type="Secondary", status="Active", diagnosed_at=admit_time, clinician="Dr. Sarah Mitchell"),
            Diagnosis(patient_id=james.id, encounter_id=enc_current.id, icd_code="E78.5", description="Hyperlipidemia, Unspecified", diagnosis_type="Secondary", status="Active", diagnosed_at=admit_time, clinician="Dr. Sarah Mitchell"),
            Diagnosis(patient_id=james.id, encounter_id=enc_current.id, icd_code="N18.2", description="Chronic Kidney Disease, Stage 2 (Mild)", diagnosis_type="Chronic", status="Active", diagnosed_at=now - datetime.timedelta(days=365), clinician="Dr. Sarah Mitchell"),
            Diagnosis(patient_id=james.id, encounter_id=enc_current.id, icd_code="E11.40", description="Type 2 Diabetes Mellitus with Diabetic Neuropathy", diagnosis_type="Chronic", status="Active", diagnosed_at=now - datetime.timedelta(days=400), clinician="Dr. Rachel Green")
        ]
        db.add_all(diagnoses_list)

        # Star Patient Allergies
        allergy_james = Allergy(
            patient_id=james.id,
            substance="Penicillin",
            reaction="Anaphylaxis, severe generalized urticaria, bronchospasm",
            severity="Severe",
            verification_status="Confirmed",
            recorded_at=now - datetime.timedelta(days=800)
        )
        db.add(allergy_james)

        # Star Patient Vitals (Historical + Current)
        vitals_data = [
            # Day 1
            ("HR", "Heart Rate", 98.0, None, "bpm", "High", admit_time),
            ("BP", "Blood Pressure", 158.0, "158/94", "mmHg", "High", admit_time),
            ("SPO2", "SpO2 Oxygen Saturation", 96.0, "96", "%", "Normal", admit_time),
            ("TEMP", "Body Temperature", 37.4, "37.4", "°C", "Normal", admit_time),
            ("RR", "Respiratory Rate", 20.0, "20", "breaths/min", "High", admit_time),
            ("BMI", "Body Mass Index", 31.4, "31.4", "kg/m²", "High", admit_time),
            # Day 4
            ("HR", "Heart Rate", 84.0, None, "bpm", "Normal", admit_time + datetime.timedelta(days=3)),
            ("BP", "Blood Pressure", 142.0, "142/88", "mmHg", "High", admit_time + datetime.timedelta(days=3)),
            ("SPO2", "SpO2 Oxygen Saturation", 98.0, "98", "%", "Normal", admit_time + datetime.timedelta(days=3)),
            ("TEMP", "Body Temperature", 36.8, "36.8", "°C", "Normal", admit_time + datetime.timedelta(days=3)),
            ("RR", "Respiratory Rate", 16.0, "16", "breaths/min", "Normal", admit_time + datetime.timedelta(days=3)),
            # Day 7 (Today)
            ("HR", "Heart Rate", 76.0, None, "bpm", "Normal", now - datetime.timedelta(hours=2)),
            ("BP", "Blood Pressure", 134.0, "134/82", "mmHg", "Normal", now - datetime.timedelta(hours=2)),
            ("SPO2", "SpO2 Oxygen Saturation", 98.0, "98", "%", "Normal", now - datetime.timedelta(hours=2)),
            ("TEMP", "Body Temperature", 36.6, "36.6", "°C", "Normal", now - datetime.timedelta(hours=2)),
            ("RR", "Respiratory Rate", 16.0, "16", "breaths/min", "Normal", now - datetime.timedelta(hours=2)),
            ("BMI", "Body Mass Index", 31.2, "31.2", "kg/m²", "High", now - datetime.timedelta(hours=2)),
        ]
        for code, name, val, val_str, unit, status, rec_at in vitals_data:
            db.add(Observation(
                patient_id=james.id,
                encounter_id=enc_current.id,
                code=code,
                name=name,
                value=val,
                value_string=val_str or str(val),
                unit=unit,
                status=status,
                recorded_at=rec_at
            ))

        # Star Patient Lab Results (Longitudinal Trends)
        labs_data = [
            # HbA1c
            (james.id, enc_current.id, "4548-4", "Hemoglobin A1c", "Diabetes Monitoring", 9.2, "%", 4.0, 5.6, "Critical", 9.8, now - datetime.timedelta(hours=4)),
            (james.id, enc_hist1.id, "4548-4", "Hemoglobin A1c", "Diabetes Monitoring", 9.8, "%", 4.0, 5.6, "Critical", 10.4, now - datetime.timedelta(days=178)),
            # Glucose
            (james.id, enc_current.id, "2345-7", "Serum Fasting Glucose", "Diabetes Monitoring", 214.0, "mg/dL", 70.0, 99.0, "Critical", 285.0, now - datetime.timedelta(hours=4)),
            (james.id, enc_current.id, "2345-7", "Serum Fasting Glucose", "Diabetes Monitoring", 285.0, "mg/dL", 70.0, 99.0, "Critical", 320.0, admit_time + datetime.timedelta(days=1)),
            # Serum Creatinine
            (james.id, enc_current.id, "2160-0", "Serum Creatinine", "Renal Function", 1.8, "mg/dL", 0.7, 1.3, "High", 1.9, now - datetime.timedelta(hours=4)),
            # eGFR
            (james.id, enc_current.id, "33914-3", "Estimated GFR (CKD-EPI)", "Renal Function", 52.0, "mL/min/1.73m²", 60.0, 120.0, "Low", 49.0, now - datetime.timedelta(hours=4)),
            # Blood Urea Nitrogen
            (james.id, enc_current.id, "3094-0", "Blood Urea Nitrogen (BUN)", "Renal Function", 28.0, "mg/dL", 7.0, 20.0, "High", 34.0, now - datetime.timedelta(hours=4)),
            # Serum Potassium
            (james.id, enc_current.id, "2823-3", "Serum Potassium", "Chemistry", 4.6, "mmol/L", 3.5, 5.1, "Normal", 4.9, now - datetime.timedelta(hours=4)),
            # Serum Sodium
            (james.id, enc_current.id, "2951-2", "Serum Sodium", "Chemistry", 137.0, "mmol/L", 135.0, 145.0, "Normal", 134.0, now - datetime.timedelta(hours=4)),
            # Hemoglobin
            (james.id, enc_current.id, "718-7", "Hemoglobin", "Hematology", 13.2, "g/dL", 13.8, 17.2, "Low", 12.8, now - datetime.timedelta(hours=4)),
            # White Blood Count
            (james.id, enc_current.id, "6690-2", "White Blood Cell Count", "Hematology", 8.4, "x10^3/uL", 4.5, 11.0, "Normal", 11.8, now - datetime.timedelta(hours=4)),
            # ALT Liver enzyme
            (james.id, enc_current.id, "1742-6", "Alanine Aminotransferase (ALT)", "Liver Function", 34.0, "U/L", 7.0, 56.0, "Normal", 38.0, now - datetime.timedelta(hours=4)),
            # AST Liver enzyme
            (james.id, enc_current.id, "1920-8", "Aspartate Aminotransferase (AST)", "Liver Function", 28.0, "U/L", 10.0, 40.0, "Normal", 30.0, now - datetime.timedelta(hours=4)),
        ]
        for pid, eid, code, name, cat, val, unit, rmin, rmax, flag, prev, col_time in labs_data:
            db.add(LabResult(
                patient_id=pid,
                encounter_id=eid,
                test_code=code,
                test_name=name,
                category=cat,
                value=val,
                unit=unit,
                reference_min=rmin,
                reference_max=rmax,
                flag=flag,
                previous_value=prev,
                collected_at=col_time
            ))

        # Star Patient Medications (Active & Historical with Insulin Status)
        meds_data = [
            (james.id, enc_current.id, "Insulin Glargine (Lantus)", "28 Units", "Subcutaneous", "Once daily at bedtime", "Active", "Dr. Sarah Mitchell", "Increased", True, admit_time + datetime.timedelta(days=2)),
            (james.id, enc_current.id, "Insulin Lispro (Humalog)", "6 Units", "Subcutaneous", "Three times daily before meals", "Active", "Dr. Sarah Mitchell", "Increased", True, admit_time + datetime.timedelta(days=2)),
            (james.id, enc_current.id, "Metformin HCl", "1000 mg", "Oral", "Twice daily with meals", "Held", "Dr. Sarah Mitchell", "None", False, admit_time),
            (james.id, enc_current.id, "Lisinopril", "20 mg", "Oral", "Once daily in morning", "Active", "Dr. Sarah Mitchell", "None", True, now - datetime.timedelta(days=120)),
            (james.id, enc_current.id, "Atorvastatin Calcium", "40 mg", "Oral", "Once daily at bedtime", "Active", "Dr. Sarah Mitchell", "None", True, now - datetime.timedelta(days=200)),
            (james.id, enc_current.id, "Furosemide (Lasix)", "40 mg", "Oral", "Once daily in morning", "Active", "Dr. Sarah Mitchell", "None", True, now - datetime.timedelta(days=90)),
            (james.id, enc_current.id, "Empagliflozin (Jardiance)", "10 mg", "Oral", "Once daily in morning", "Active", "Dr. Sarah Mitchell", "None", True, admit_time + datetime.timedelta(days=3)),
            (james.id, enc_current.id, "Aspirin EC", "81 mg", "Oral", "Once daily", "Active", "Dr. Sarah Mitchell", "None", True, now - datetime.timedelta(days=300)),
            (james.id, enc_current.id, "Gabapentin", "300 mg", "Oral", "Three times daily", "Active", "Dr. Sarah Mitchell", "None", True, now - datetime.timedelta(days=150)),
        ]
        for pid, eid, name, dose, route, freq, status, presc, ins_st, is_act, s_date in meds_data:
            db.add(Medication(
                patient_id=pid,
                encounter_id=eid,
                medication_name=name,
                dose=dose,
                route=route,
                frequency=freq,
                start_date=s_date,
                status=status,
                prescriber=presc,
                insulin_status=ins_st,
                is_active=is_act
            ))

        # Star Patient Procedures
        procs_data = [
            (james.id, enc_current.id, "93306", "Transthoracic Echocardiography with Doppler (Complete)", admit_time + datetime.timedelta(days=2), "Dr. Nathan Cole", "Cardiology"),
            (james.id, enc_current.id, "76770", "Renal and Bladder Ultrasound with Color Flow", admit_time + datetime.timedelta(days=4), "Dr. Elena Rostova", "Radiology / Imaging"),
            (james.id, enc_current.id, "G0246", "Diabetic Sensory Foot Examination and Monofilament Testing", admit_time + datetime.timedelta(days=5), "Dr. Sarah Mitchell", "Internal Medicine"),
        ]
        for pid, eid, code, name, p_time, clin, dept in procs_data:
            db.add(Procedure(
                patient_id=pid,
                encounter_id=eid,
                code=code,
                procedure_name=name,
                performed_at=p_time,
                clinician=clin,
                department=dept
            ))

        # Star Patient Clinical Notes
        notes_data = [
            (james.id, enc_current.id, "Physician Progress Note", "Dr. Sarah Mitchell", "Attending Physician", admit_time + datetime.timedelta(days=1),
             "PATIENT PRESENTATION:\n62-year-old male with long-standing Type 2 Diabetes, hypertension, and known CKD Stage 2 admitted through the ED with severe hyperglycemia (blood glucose 320 mg/dL upon arrival) and hyperosmolar symptoms.\n\nHOSPITAL COURSE:\nInsulin glargine restarted and titrated upward to 28 units. Lispro sliding scale converted to scheduled mealtime dosing. Metformin currently withheld due to elevated baseline creatinine (1.8 mg/dL). Vitals currently stabilizing.\n\nASSESSMENT & PLAN:\nHigh 30-day readmission risk flagged due to multiple past admissions within 6 months and complex medication changes. Will coordinate with diabetes educator and schedule high-priority 7-day post-discharge clinic follow-up."),
            (james.id, enc_current.id, "Specialist Consultation", "Dr. Anthony Hayes", "Consulting Endocrinologist", admit_time + datetime.timedelta(days=3),
             "REASON FOR CONSULT: Insulin optimization and glycemic instability.\n\nFINDINGS: HbA1c 9.2% indicates prolonged sub-optimal glycemic control. Patient reported difficulty managing multi-injection pens at home prior to admission.\n\nRECOMMENDATION: Initiate continuous glucose monitoring (CGM) education, reinforce hypoglycemia protocols, and recommend post-discharge home nursing visits for insulin administration support."),
            (james.id, enc_current.id, "Medication Review", "Dr. Liam Vance, PharmD", "Clinical Pharmacist", admit_time + datetime.timedelta(days=5),
             "MEDICATION RECONCILIATION SUMMARY:\n1. Metformin stopped to protect renal function.\n2. Empagliflozin (Jardiance) 10mg initiated for cardio-renal protection.\n3. Glargine 28u + Lispro 6u TID verified.\n4. Penicillin allergy prominent alert verified (Anaphylaxis risk).\n\nPatient requires thorough medication reconciliation counseling prior to discharge."),
            (james.id, enc_current.id, "Case Management", "Alex Rivera, MSW", "Lead Care Coordinator", admit_time + datetime.timedelta(days=6),
             "DISCHARGE TRANSITION ASSESSMENT:\nPatient lives with spouse who assists with meal preparation. Transport to clinic verified. Scheduled for early post-discharge primary care appointment on Day 5 post-discharge. Discharge readiness currently at 78% pending pharmacy consult completion.")
        ]
        for pid, eid, ntype, auth, arole, ctime, content in notes_data:
            db.add(ClinicalNote(
                patient_id=pid,
                encounter_id=eid,
                note_type=ntype,
                author=auth,
                author_role=arole,
                created_at=ctime,
                content=content
            ))

        # Star Patient Pre-calculated Prediction & SHAP Explanations
        demo_model = DemoReadmissionModel()
        james_features = {
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
        james_prob = 0.72  # Exactly 72% Critical Risk for the hackathon presentation
        pred_james = Prediction(
            patient_id=james.id,
            encounter_id=enc_current.id,
            encounter_identifier="ENC-2026-008412",
            risk_probability=james_prob,
            risk_level="Critical",
            threshold=0.50,
            model_name="MedInsight-GradientBoost-v1",
            model_version="demo-v1.2",
            is_demo=True,
            input_features=james_features,
            prediction_timestamp=now - datetime.timedelta(hours=6)
        )
        db.add(pred_james)
        db.flush()

        # SHAP Explanations for James
        james_explanations = [
            ("Previous Inpatient Admissions", "2 prior admissions", 0.18, "increases_risk"),
            ("Previous 30-Day Readmission History", "1 prior readmission", 0.12, "increases_risk"),
            ("Insulin Therapy Titration", "Dose Increased (Unstable Glycemia)", 0.11, "increases_risk"),
            ("Emergency Department Visits", "2 visits in prior 12 mos", 0.10, "increases_risk"),
            ("HbA1c Glycemic Marker", "Elevated (9.2%)", 0.09, "increases_risk"),
            ("Medication Burden (Polypharmacy)", "18 active medications", 0.07, "increases_risk"),
            ("Hospital Length of Stay", "7 days", 0.06, "increases_risk"),
            ("Diagnostic Lab Utilization", "42 procedures", 0.04, "increases_risk"),
            ("Outpatient Follow-Up Engagement", "3 visits in prior year", -0.05, "decreases_risk")
        ]
        for fname, fval, cont, direct in james_explanations:
            db.add(PredictionExplanation(
                prediction_id=pred_james.id,
                patient_id=james.id,
                feature_name=fname,
                feature_value=fval,
                contribution=cont,
                direction=direct,
                created_at=now - datetime.timedelta(hours=6)
            ))

        # Star Patient Recommendations
        james_recommendations = [
            Recommendation(patient_id=james.id, title="Priority Primary Care Follow-up (within 7 days)", priority="Urgent", reason="High readmission risk score (72%) and multiple chronic conditions.", responsible_team="Care Coordination", status="Completed", due_date="Within 7 days", source="AI_generated", is_completed=True, completed_at=now - datetime.timedelta(hours=12), created_at=now - datetime.timedelta(days=2)),
            Recommendation(patient_id=james.id, title="Pharmacist-Led Medication Reconciliation & Safety Review", priority="High", reason="18 active medications and insulin titration require strict reconciliation to avoid hypoglycemia.", responsible_team="Clinical Pharmacy", status="In Progress", due_date="Prior to discharge", source="AI_generated", is_completed=False, created_at=now - datetime.timedelta(days=2)),
            Recommendation(patient_id=james.id, title="Certified Diabetes Educator (CDCES) Inpatient Consultation", priority="High", reason="Elevated HbA1c 9.2% and new basal-bolus insulin injection regimen.", responsible_team="Endocrinology", status="Completed", due_date="Completed during stay", source="AI_generated", is_completed=True, completed_at=now - datetime.timedelta(days=1), created_at=now - datetime.timedelta(days=3)),
            Recommendation(patient_id=james.id, title="Cellular Continuous Glucose Monitor (CGM) Setup", priority="Medium", reason="Provide real-time glycemic telemetry to prevent readmission due to acute dysglycemia.", responsible_team="Digital Health", status="Pending", due_date="At discharge", source="AI_generated", is_completed=False, created_at=now - datetime.timedelta(days=1)),
            Recommendation(patient_id=james.id, title="Dedicated Nurse Care Coordinator Post-Discharge Calls (48h & 7d)", priority="High", reason="Close post-acute transition surveillance to address medication adherence or worsening symptoms.", responsible_team="Care Coordination", status="In Progress", due_date="Post-discharge Day 2 & 7", source="AI_generated", is_completed=False, created_at=now - datetime.timedelta(days=2))
        ]
        db.add_all(james_recommendations)

        # Star Patient Discharge Plan
        james_discharge = DischargePlan(
            patient_id=james.id,
            encounter_id=enc_current.id,
            readiness_score=78.0,
            medication_reconciliation=True,
            follow_up_appointment=True,
            diabetes_education=True,
            pending_tests_cleared=True,
            transport_arranged=True,
            home_monitoring_setup=False,
            care_coordinator_assigned=True,
            patient_education_completed=True,
            high_risk_review_completed=False,
            notes="Patient is medically stable for discharge planning. Final pharmacist reconciliation pending. Transportation confirmed with spouse.",
            updated_at=now - datetime.timedelta(hours=1),
            updated_by="Dr. Sarah Mitchell"
        )
        db.add(james_discharge)

        # 3. Seed 29 Additional Synthetic Patients across diverse cohorts
        cohort_templates = [
            # Critical Risk Patients
            {"name": ("Eleanor", "Vance"), "age": 74, "sex": "Female", "bg": "A+", "diag": "Congestive Heart Failure with Fluid Overload", "icd": "I50.9", "ward": "Ward 4B", "room": "4B-201", "los": 8, "labs": 38, "meds": 16, "inpatient": 3, "er": 2, "a1c": "high", "insulin": "steady", "readmit": 2, "prob": 0.78, "level": "Critical", "badges": ["HEART FAILURE", "FALL RISK", "CRITICAL RISK"]},
            {"name": ("Robert", "Chen"), "age": 68, "sex": "Male", "bg": "B+", "diag": "COPD Exacerbation with Acute Respiratory Failure", "icd": "J44.1", "ward": "Ward 3C", "room": "3C-112", "los": 6, "labs": 35, "meds": 15, "inpatient": 2, "er": 3, "a1c": "none", "insulin": "none", "readmit": 1, "prob": 0.74, "level": "Critical", "badges": ["COPD", "OXYGEN DEPENDENT", "CRITICAL RISK"]},
            {"name": ("Margaret", "Taylor"), "age": 81, "sex": "Female", "bg": "O-", "diag": "Sepsis secondary to Urinary Tract Infection with AKI", "icd": "A41.9", "ward": "ICU Step-down", "room": "ICU-S03", "los": 9, "labs": 48, "meds": 19, "inpatient": 2, "er": 2, "a1c": "normal", "insulin": "none", "readmit": 2, "prob": 0.81, "level": "Critical", "badges": ["SEPSIS SURVIVOR", "AKI", "CRITICAL RISK"]},
            {"name": ("Arthur", "Jenkins"), "age": 71, "sex": "Male", "bg": "AB+", "diag": "End-Stage Renal Disease with Volume Overload", "icd": "N18.6", "ward": "Ward 5A", "room": "5A-104", "los": 7, "labs": 44, "meds": 17, "inpatient": 3, "er": 1, "a1c": "high", "insulin": "up", "readmit": 2, "prob": 0.76, "level": "Critical", "badges": ["DIALYSIS", "CRITICAL RISK", "FALL RISK"]},

            # High Risk Patients
            {"name": ("Maria", "Gonzalez"), "age": 59, "sex": "Female", "bg": "O+", "diag": "Acute Coronary Syndrome / NSTEMI Post-PCI", "icd": "I21.4", "ward": "Cardiology 4A", "room": "4A-210", "los": 4, "labs": 28, "meds": 13, "inpatient": 1, "er": 1, "a1c": "high", "insulin": "steady", "readmit": 0, "prob": 0.64, "level": "High", "badges": ["CARDIAC TELEMETRY", "HIGH RISK"]},
            {"name": ("David", "Kim"), "age": 65, "sex": "Male", "bg": "A-", "diag": "Pneumonia with Underlying Chronic Bronchitis", "icd": "J18.9", "ward": "Ward 3B", "room": "3B-305", "los": 5, "labs": 24, "meds": 11, "inpatient": 1, "er": 2, "a1c": "normal", "insulin": "none", "readmit": 1, "prob": 0.58, "level": "High", "badges": ["HIGH READMISSION RISK"]},
            {"name": ("Patricia", "Wilson"), "age": 77, "sex": "Female", "bg": "B-", "diag": "Atrial Fibrillation with Rapid Ventricular Response", "icd": "I48.0", "ward": "Ward 4A", "room": "4A-118", "los": 4, "labs": 22, "meds": 12, "inpatient": 1, "er": 1, "a1c": "none", "insulin": "none", "readmit": 0, "prob": 0.55, "level": "High", "badges": ["ANTICOAGULATED", "FALL RISK"]},
            {"name": ("Thomas", "Clark"), "age": 63, "sex": "Male", "bg": "O+", "diag": "Complicated Cellulitis with Diabetic Foot Ulcer", "icd": "L03.90", "ward": "Ward 5B", "room": "5B-208", "los": 5, "labs": 26, "meds": 14, "inpatient": 1, "er": 1, "a1c": "high", "insulin": "down", "readmit": 0, "prob": 0.62, "level": "High", "badges": ["DIABETES", "HIGH RISK"]},
            {"name": ("Dorothy", "Adams"), "age": 83, "sex": "Female", "bg": "A+", "diag": "Acute Ischemic Stroke (Mild) with Dysphagia", "icd": "I63.9", "ward": "Neurology 2A", "room": "2A-106", "los": 6, "labs": 30, "meds": 13, "inpatient": 1, "er": 1, "a1c": "none", "insulin": "none", "readmit": 0, "prob": 0.67, "level": "High", "badges": ["STROKE CARE", "ASPIRATION RISK"]},
            {"name": ("Samuel", "Wright"), "age": 56, "sex": "Male", "bg": "O+", "diag": "Cirrhosis with Ascites and Hepatic Encephalopathy", "icd": "K74.60", "ward": "Ward 5A", "room": "5A-212", "los": 6, "labs": 32, "meds": 15, "inpatient": 2, "er": 1, "a1c": "normal", "insulin": "none", "readmit": 1, "prob": 0.69, "level": "High", "badges": ["LIVER DISEASE", "HIGH RISK"]},

            # Moderate Risk Patients
            {"name": ("Linda", "Martinez"), "age": 52, "sex": "Female", "bg": "A+", "diag": "Acute Pancreatitis (Mild / Resolving)", "icd": "K85.90", "ward": "Ward 5B", "room": "5B-102", "los": 3, "labs": 18, "meds": 7, "inpatient": 0, "er": 1, "a1c": "normal", "insulin": "none", "readmit": 0, "prob": 0.38, "level": "Moderate", "badges": ["MODERATE RISK"]},
            {"name": ("William", "Harris"), "age": 70, "sex": "Male", "bg": "O-", "diag": "Deep Vein Thrombosis Post-Orthopedic Surgery", "icd": "I82.40", "ward": "Orthopedics 3A", "room": "3A-108", "los": 4, "labs": 16, "meds": 9, "inpatient": 0, "er": 0, "a1c": "none", "insulin": "none", "readmit": 0, "prob": 0.35, "level": "Moderate", "badges": ["ANTICOAGULATED"]},
            {"name": ("Elizabeth", "Lewis"), "age": 66, "sex": "Female", "bg": "B+", "diag": "Hypertensive Urgency with Mild Headache", "icd": "I16.0", "ward": "Ward 5A", "room": "5A-116", "los": 2, "labs": 14, "meds": 8, "inpatient": 0, "er": 1, "a1c": "high", "insulin": "none", "readmit": 0, "prob": 0.42, "level": "Moderate", "badges": ["HYPERTENSION"]},
            {"name": ("Charles", "Walker"), "age": 58, "sex": "Male", "bg": "A+", "diag": "Acute Pyelonephritis without Sepsis", "icd": "N10", "ward": "Ward 3B", "room": "3B-204", "los": 3, "labs": 15, "meds": 6, "inpatient": 0, "er": 1, "a1c": "none", "insulin": "none", "readmit": 0, "prob": 0.33, "level": "Moderate", "badges": []},
            {"name": ("Barbara", "Hall"), "age": 64, "sex": "Female", "bg": "O+", "diag": "Small Bowel Obstruction (Partial / Non-operative)", "icd": "K56.60", "ward": "Surgical Ward 2B", "room": "2B-109", "los": 4, "labs": 20, "meds": 8, "inpatient": 0, "er": 1, "a1c": "normal", "insulin": "none", "readmit": 0, "prob": 0.46, "level": "Moderate", "badges": ["NPO"]},
            {"name": ("Joseph", "Young"), "age": 61, "sex": "Male", "bg": "AB-", "diag": "Syncope and Collapse (Orthostatic Evaluation)", "icd": "R55", "ward": "Ward 4A", "room": "4A-220", "los": 2, "labs": 16, "meds": 7, "inpatient": 0, "er": 1, "a1c": "none", "insulin": "none", "readmit": 0, "prob": 0.39, "level": "Moderate", "badges": ["FALL RISK"]},
            {"name": ("Susan", "King"), "age": 55, "sex": "Female", "bg": "A+", "diag": "Acute Diverticulitis without Perforation", "icd": "K57.32", "ward": "Ward 5B", "room": "5B-114", "los": 3, "labs": 14, "meds": 6, "inpatient": 0, "er": 1, "a1c": "normal", "insulin": "none", "readmit": 0, "prob": 0.32, "level": "Moderate", "badges": []},
            {"name": ("Richard", "Scott"), "age": 73, "sex": "Male", "bg": "B+", "diag": "Dehydration with Mild Electrolyte Derangement", "icd": "E86.0", "ward": "Ward 3B", "room": "3B-118", "los": 3, "labs": 19, "meds": 9, "inpatient": 0, "er": 0, "a1c": "none", "insulin": "none", "readmit": 0, "prob": 0.44, "level": "Moderate", "badges": []},

            # Low Risk Patients
            {"name": ("Jessica", "Green"), "age": 34, "sex": "Female", "bg": "O+", "diag": "Laparoscopic Cholecystectomy Recovery", "icd": "K80.20", "ward": "Day Surgery 2A", "room": "2A-301", "los": 1, "labs": 8, "meds": 4, "inpatient": 0, "er": 0, "a1c": "normal", "insulin": "none", "readmit": 0, "prob": 0.12, "level": "Low", "badges": []},
            {"name": ("Brian", "Baker"), "age": 42, "sex": "Male", "bg": "A+", "diag": "Uncomplicated Acute Appendicitis Post-Appendectomy", "icd": "K35.80", "ward": "Surgical 2B", "room": "2B-215", "los": 2, "labs": 9, "meds": 4, "inpatient": 0, "er": 1, "a1c": "normal", "insulin": "none", "readmit": 0, "prob": 0.14, "level": "Low", "badges": []},
            {"name": ("Sarah", "Nelson"), "age": 29, "sex": "Female", "bg": "O-", "diag": "Post-Partum Inpatient Recovery (Uncomplicated)", "icd": "Z39.0", "ward": "Maternity 1B", "room": "1B-104", "los": 2, "labs": 6, "meds": 3, "inpatient": 0, "er": 0, "a1c": "normal", "insulin": "none", "readmit": 0, "prob": 0.08, "level": "Low", "badges": []},
            {"name": ("Kevin", "Carter"), "age": 47, "sex": "Male", "bg": "B+", "diag": "Elective Left Total Knee Arthroplasty", "icd": "Z96.652", "ward": "Orthopedics 3A", "room": "3A-206", "los": 2, "labs": 11, "meds": 6, "inpatient": 0, "er": 0, "a1c": "normal", "insulin": "none", "readmit": 0, "prob": 0.16, "level": "Low", "badges": ["PHYSIO ENROLLED"]},
            {"name": ("Nancy", "Mitchell"), "age": 39, "sex": "Female", "bg": "A-", "diag": "Acute Gastroenteritis with Volume Depletion", "icd": "A09", "ward": "Ward 3B", "room": "3B-110", "los": 1, "labs": 8, "meds": 3, "inpatient": 0, "er": 1, "a1c": "none", "insulin": "none", "readmit": 0, "prob": 0.11, "level": "Low", "badges": []},
            {"name": ("Daniel", "Perez"), "age": 45, "sex": "Male", "bg": "O+", "diag": "Elective Right Inguinal Hernia Repair", "icd": "K40.90", "ward": "Day Surgery 2A", "room": "2A-308", "los": 1, "labs": 6, "meds": 3, "inpatient": 0, "er": 0, "a1c": "none", "insulin": "none", "readmit": 0, "prob": 0.09, "level": "Low", "badges": []},
            {"name": ("Karen", "Roberts"), "age": 51, "sex": "Female", "bg": "AB+", "diag": "Community-Acquired Bronchitis (Mild)", "icd": "J20.9", "ward": "Ward 3B", "room": "3B-114", "los": 2, "labs": 9, "meds": 4, "inpatient": 0, "er": 0, "a1c": "none", "insulin": "none", "readmit": 0, "prob": 0.15, "level": "Low", "badges": []},
            {"name": ("Steven", "Turner"), "age": 38, "sex": "Male", "bg": "A+", "diag": "Closed Fracture of Distal Radius Post-ORIF", "icd": "S52.501A", "ward": "Orthopedics 3A", "room": "3A-112", "los": 1, "labs": 7, "meds": 4, "inpatient": 0, "er": 1, "a1c": "none", "insulin": "none", "readmit": 0, "prob": 0.10, "level": "Low", "badges": []},
            {"name": ("Amanda", "Phillips"), "age": 41, "sex": "Female", "bg": "O+", "diag": "Elective Septoplasty and Sinus Endoscopy", "icd": "J34.2", "ward": "ENT / Short Stay", "room": "1A-102", "los": 1, "labs": 5, "meds": 3, "inpatient": 0, "er": 0, "a1c": "normal", "insulin": "none", "readmit": 0, "prob": 0.07, "level": "Low", "badges": []},
            {"name": ("Jason", "Campbell"), "age": 49, "sex": "Male", "bg": "B+", "diag": "Uncomplicated Nephrolithiasis Post-Stenting", "icd": "N20.0", "ward": "Urology 2C", "room": "2C-104", "los": 1, "labs": 8, "meds": 4, "inpatient": 0, "er": 1, "a1c": "none", "insulin": "none", "readmit": 0, "prob": 0.13, "level": "Low", "badges": []},
            {"name": ("Rachel", "Parker"), "age": 33, "sex": "Female", "bg": "A+", "diag": "Elective Diagnostic Arthroscopy Left Shoulder", "icd": "Z96.612", "ward": "Day Surgery 2A", "room": "2A-312", "los": 1, "labs": 5, "meds": 3, "inpatient": 0, "er": 0, "a1c": "none", "insulin": "none", "readmit": 0, "prob": 0.06, "level": "Low", "badges": []},
        ]

        for i, c in enumerate(cohort_templates, start=2):
            mrn = f"MRN-{100000 + i * 142}"
            birth_year = 2026 - c["age"]
            dob = f"{birth_year}-{random.randint(1, 12):02d}-{random.randint(1, 28):02d}"
            
            p = Patient(
                mrn=mrn,
                first_name=c["name"][0],
                last_name=c["name"][1],
                dob=dob,
                age=c["age"],
                sex=c["sex"],
                blood_group=c["bg"],
                race="Caucasian" if i % 2 == 0 else "African American" if i % 3 == 0 else "Hispanic",
                ethnicity="Non-Hispanic" if i % 3 != 0 else "Hispanic or Latino",
                safety_badges=c["badges"],
                current_ward=c["ward"],
                current_room=c["room"],
                admission_status="Inpatient"
            )
            db.add(p)
            db.flush()

            enc_date = now - datetime.timedelta(days=c["los"], hours=random.randint(1, 12))
            enc = Encounter(
                encounter_id=f"ENC-2026-{100000 + i * 317}",
                patient_id=p.id,
                admission_date=enc_date,
                discharge_date=None,
                encounter_type="Inpatient",
                department="Internal Medicine" if "Ward 5" in c["ward"] else "Cardiology" if "4A" in c["ward"] else "General Medicine",
                ward=c["ward"],
                room=c["room"],
                attending_physician="Dr. Sarah Mitchell" if i % 2 == 0 else "Dr. Marcus Vance",
                primary_diagnosis=c["diag"],
                secondary_diagnoses=["Essential Hypertension", "Hyperlipidemia"] if c["age"] > 60 else [],
                length_of_stay=c["los"],
                admission_source="Emergency Department" if c["er"] > 0 else "Direct Physician Referral",
                admission_type="Urgent / Acute",
                discharge_disposition="Pending Review",
                expected_discharge=now + datetime.timedelta(days=random.randint(1, 3)),
                readmission_status="Pending",
                is_current=True,
                time_in_hospital=c["los"],
                num_lab_procedures=c["labs"],
                num_medications=c["meds"],
                number_outpatient=1 if c["age"] > 50 else 0,
                number_emergency=c["er"],
                number_inpatient=c["inpatient"],
                a1c_result=c["a1c"],
                insulin_status=c["insulin"],
                previous_readmissions=c["readmit"]
            )
            db.add(enc)
            db.flush()

            # Diagnoses
            db.add(Diagnosis(
                patient_id=p.id,
                encounter_id=enc.id,
                icd_code=c["icd"],
                description=c["diag"],
                diagnosis_type="Primary",
                status="Active",
                diagnosed_at=enc_date,
                clinician=enc.attending_physician
            ))

            # Observations / Vitals
            db.add(Observation(
                patient_id=p.id,
                encounter_id=enc.id,
                code="HR",
                name="Heart Rate",
                value=float(random.randint(68, 92)),
                unit="bpm",
                status="Normal",
                recorded_at=now - datetime.timedelta(hours=2)
            ))
            db.add(Observation(
                patient_id=p.id,
                encounter_id=enc.id,
                code="BP",
                name="Blood Pressure",
                value=130.0,
                value_string=f"{random.randint(120, 148)}/{random.randint(76, 90)}",
                unit="mmHg",
                status="Normal" if c["level"] == "Low" else "High",
                recorded_at=now - datetime.timedelta(hours=2)
            ))

            # Lab Results
            db.add(LabResult(
                patient_id=p.id,
                encounter_id=enc.id,
                test_code="2345-7",
                test_name="Serum Glucose",
                category="Chemistry",
                value=165.0 if c["a1c"] == "high" else 95.0,
                unit="mg/dL",
                reference_min=70.0,
                reference_max=99.0,
                flag="High" if c["a1c"] == "high" else "Normal",
                previous_value=175.0 if c["a1c"] == "high" else 98.0,
                collected_at=now - datetime.timedelta(hours=6)
            ))

            # Active Medication
            db.add(Medication(
                patient_id=p.id,
                encounter_id=enc.id,
                medication_name="Lisinopril" if c["age"] > 55 else "Amoxicillin-Clavulanate",
                dose="10 mg" if c["age"] > 55 else "875 mg",
                route="Oral",
                frequency="Once daily",
                status="Active",
                prescriber=enc.attending_physician,
                insulin_status=c["insulin"],
                is_active=True
            ))

            # Prediction
            pred = Prediction(
                patient_id=p.id,
                encounter_id=enc.id,
                encounter_identifier=enc.encounter_id,
                risk_probability=c["prob"],
                risk_level=c["level"],
                threshold=0.50,
                model_name="MedInsight-GradientBoost-v1",
                model_version="demo-v1.2",
                is_demo=True,
                input_features={
                    "time_in_hospital": c["los"],
                    "num_lab_procedures": c["labs"],
                    "num_medications": c["meds"],
                    "number_outpatient": 1,
                    "number_emergency": c["er"],
                    "number_inpatient": c["inpatient"],
                    "A1Cresult": c["a1c"],
                    "insulin": c["insulin"],
                    "previous_readmissions": c["readmit"]
                },
                prediction_timestamp=now - datetime.timedelta(hours=random.randint(2, 12))
            )
            db.add(pred)
            db.flush()

            # Explanations
            db.add(PredictionExplanation(
                prediction_id=pred.id,
                patient_id=p.id,
                feature_name="Prior Inpatient Utilization",
                feature_value=f"{c['inpatient']} prior admissions",
                contribution=0.12 if c['inpatient'] > 0 else -0.04,
                direction="increases_risk" if c['inpatient'] > 0 else "decreases_risk",
                created_at=now - datetime.timedelta(hours=3)
            ))

            # Recommendations
            db.add(Recommendation(
                patient_id=p.id,
                title="Schedule 7-Day Outpatient Review",
                priority="Urgent" if c["level"] in ["High", "Critical"] else "Medium",
                reason=f"Risk tier: {c['level']}",
                responsible_team="Care Coordination",
                status="Pending",
                due_date="Within 7 days",
                source="AI_generated",
                is_completed=False,
                created_at=now - datetime.timedelta(days=1)
            ))

            # Discharge Plan
            db.add(DischargePlan(
                patient_id=p.id,
                encounter_id=enc.id,
                readiness_score=45.0 if c["level"] == "Critical" else 70.0 if c["level"] == "High" else 90.0,
                medication_reconciliation=c["level"] != "Critical",
                follow_up_appointment=c["level"] == "Low",
                diabetes_education=False,
                pending_tests_cleared=True,
                transport_arranged=True,
                home_monitoring_setup=False,
                care_coordinator_assigned=c["level"] in ["High", "Critical"],
                patient_education_completed=c["level"] == "Low",
                high_risk_review_completed=False,
                notes="Standard discharge workflow underway.",
                updated_at=now - datetime.timedelta(hours=2),
                updated_by="Dr. Sarah Mitchell"
            ))

        db.commit()
        print("Successfully seeded MedInsight AI database with 30 synthetic patients, clinical records, and demonstration patient James Anderson (MRN-104928)!")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
