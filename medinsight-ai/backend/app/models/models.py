import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, JSON, Enum
)
from sqlalchemy.orm import relationship
from app.database.base import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), default="physician", nullable=False)  # physician, nurse, care_coordinator, administrator
    department = Column(String(100), default="Internal Medicine")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    mrn = Column(String(50), unique=True, index=True, nullable=False)  # Medical Record Number
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    dob = Column(String(20), nullable=False)
    age = Column(Integer, nullable=False)
    sex = Column(String(20), nullable=False)
    blood_group = Column(String(10), default="O+")
    race = Column(String(50), default="Caucasian")
    ethnicity = Column(String(50), default="Non-Hispanic")
    safety_badges = Column(JSON, default=list)  # ["DIABETES", "PENICILLIN ALLERGY", "FALL RISK"]
    current_ward = Column(String(50), nullable=True)
    current_room = Column(String(50), nullable=True)
    admission_status = Column(String(50), default="Inpatient")  # Inpatient, Discharged, Observation
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    encounters = relationship("Encounter", back_populates="patient", cascade="all, delete-orphan")
    diagnoses = relationship("Diagnosis", back_populates="patient", cascade="all, delete-orphan")
    observations = relationship("Observation", back_populates="patient", cascade="all, delete-orphan")
    lab_results = relationship("LabResult", back_populates="patient", cascade="all, delete-orphan")
    medications = relationship("Medication", back_populates="patient", cascade="all, delete-orphan")
    allergies = relationship("Allergy", back_populates="patient", cascade="all, delete-orphan")
    procedures = relationship("Procedure", back_populates="patient", cascade="all, delete-orphan")
    clinical_notes = relationship("ClinicalNote", back_populates="patient", cascade="all, delete-orphan")
    predictions = relationship("Prediction", back_populates="patient", cascade="all, delete-orphan")
    recommendations = relationship("Recommendation", back_populates="patient", cascade="all, delete-orphan")
    discharge_plans = relationship("DischargePlan", back_populates="patient", cascade="all, delete-orphan")


class Encounter(Base):
    __tablename__ = "encounters"

    id = Column(Integer, primary_key=True, index=True)
    encounter_id = Column(String(50), unique=True, index=True, nullable=False)  # ENC-2026-008412
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False, index=True)
    admission_date = Column(DateTime, nullable=False)
    discharge_date = Column(DateTime, nullable=True)
    encounter_type = Column(String(50), default="Inpatient")  # Inpatient, Emergency, Outpatient, Ambulatory
    department = Column(String(100), default="Internal Medicine")
    ward = Column(String(50), default="5B")
    room = Column(String(50), default="5B-214")
    attending_physician = Column(String(150), default="Dr. Sarah Mitchell")
    primary_diagnosis = Column(String(255), nullable=False)
    secondary_diagnoses = Column(JSON, default=list)
    length_of_stay = Column(Integer, default=1)
    admission_source = Column(String(100), default="Emergency Department")
    admission_type = Column(String(100), default="Urgent / Acute")
    discharge_disposition = Column(String(100), default="Home with Self-Care")
    expected_discharge = Column(DateTime, nullable=True)
    readmission_status = Column(String(50), default="No Readmission")  # "Readmitted within 30d", "No Readmission", "Pending"
    is_current = Column(Boolean, default=False)

    # ML Feature tracking attributes
    time_in_hospital = Column(Integer, default=3)
    num_lab_procedures = Column(Integer, default=15)
    num_medications = Column(Integer, default=8)
    number_outpatient = Column(Integer, default=0)
    number_emergency = Column(Integer, default=0)
    number_inpatient = Column(Integer, default=1)
    a1c_result = Column(String(50), default="None")  # "high", "normal", "none"
    insulin_status = Column(String(50), default="None")  # "up", "down", "steady", "none"
    previous_readmissions = Column(Integer, default=0)

    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    patient = relationship("Patient", back_populates="encounters")
    diagnoses = relationship("Diagnosis", back_populates="encounter")
    lab_results = relationship("LabResult", back_populates="encounter")
    medications = relationship("Medication", back_populates="encounter")
    procedures = relationship("Procedure", back_populates="encounter")
    clinical_notes = relationship("ClinicalNote", back_populates="encounter")
    predictions = relationship("Prediction", back_populates="encounter")
    discharge_plans = relationship("DischargePlan", back_populates="encounter")


class Diagnosis(Base):
    __tablename__ = "diagnoses"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False, index=True)
    encounter_id = Column(Integer, ForeignKey("encounters.id"), nullable=True, index=True)
    icd_code = Column(String(50), nullable=False, index=True)
    description = Column(String(255), nullable=False)
    diagnosis_type = Column(String(50), default="Primary")  # Primary, Secondary, Chronic, Historical
    status = Column(String(50), default="Active")  # Active, Resolved, Inactive
    diagnosed_at = Column(DateTime, default=datetime.datetime.utcnow)
    clinician = Column(String(150), default="Dr. Sarah Mitchell")

    patient = relationship("Patient", back_populates="diagnoses")
    encounter = relationship("Encounter", back_populates="diagnoses")


class Observation(Base):
    __tablename__ = "observations"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False, index=True)
    encounter_id = Column(Integer, ForeignKey("encounters.id"), nullable=True)
    code = Column(String(50), nullable=False)  # LOINC code or standard code e.g. HR, BP_SYS, BP_DIA, SPO2, TEMP, RR, BMI
    name = Column(String(100), nullable=False)
    value = Column(Float, nullable=False)
    value_string = Column(String(50), nullable=True)  # For BP e.g. "138/86"
    unit = Column(String(30), nullable=False)
    recorded_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    status = Column(String(50), default="Normal")  # Normal, High, Low, Critical

    patient = relationship("Patient", back_populates="observations")


class LabResult(Base):
    __tablename__ = "lab_results"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False, index=True)
    encounter_id = Column(Integer, ForeignKey("encounters.id"), nullable=True, index=True)
    test_code = Column(String(50), nullable=False)
    test_name = Column(String(150), nullable=False)
    category = Column(String(100), default="Chemistry")  # Hematology, Chemistry, Renal Function, Liver Function, Diabetes Monitoring
    value = Column(Float, nullable=False)
    unit = Column(String(30), nullable=False)
    reference_min = Column(Float, nullable=True)
    reference_max = Column(Float, nullable=True)
    flag = Column(String(20), default="Normal")  # Normal, High, Low, Critical
    previous_value = Column(Float, nullable=True)
    collected_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)

    patient = relationship("Patient", back_populates="lab_results")
    encounter = relationship("Encounter", back_populates="lab_results")


class Medication(Base):
    __tablename__ = "medications"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False, index=True)
    encounter_id = Column(Integer, ForeignKey("encounters.id"), nullable=True, index=True)
    medication_name = Column(String(200), nullable=False)
    dose = Column(String(100), nullable=False)
    route = Column(String(50), default="Oral")  # Oral, IV, Subcutaneous, Inhalation
    frequency = Column(String(100), default="Once daily")
    start_date = Column(DateTime, default=datetime.datetime.utcnow)
    end_date = Column(DateTime, nullable=True)
    status = Column(String(50), default="Active")  # Active, Historical, Discontinued, Held
    prescriber = Column(String(150), default="Dr. Sarah Mitchell")
    insulin_status = Column(String(50), default="None")  # None, Steady, Increased, Decreased
    is_active = Column(Boolean, default=True)

    patient = relationship("Patient", back_populates="medications")
    encounter = relationship("Encounter", back_populates="medications")


class Allergy(Base):
    __tablename__ = "allergies"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False, index=True)
    substance = Column(String(150), nullable=False)
    reaction = Column(String(255), nullable=False)
    severity = Column(String(50), default="Moderate")  # Severe, Moderate, Mild
    verification_status = Column(String(50), default="Confirmed")  # Confirmed, Suspected, Refuted
    recorded_at = Column(DateTime, default=datetime.datetime.utcnow)

    patient = relationship("Patient", back_populates="allergies")


class Procedure(Base):
    __tablename__ = "procedures"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False, index=True)
    encounter_id = Column(Integer, ForeignKey("encounters.id"), nullable=True, index=True)
    code = Column(String(50), nullable=False)  # CPT / ICD-10-PCS
    procedure_name = Column(String(255), nullable=False)
    performed_at = Column(DateTime, default=datetime.datetime.utcnow)
    clinician = Column(String(150), default="Dr. Sarah Mitchell")
    department = Column(String(100), default="Internal Medicine")

    patient = relationship("Patient", back_populates="procedures")
    encounter = relationship("Encounter", back_populates="procedures")


class ClinicalNote(Base):
    __tablename__ = "clinical_notes"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False, index=True)
    encounter_id = Column(Integer, ForeignKey("encounters.id"), nullable=True, index=True)
    note_type = Column(String(100), nullable=False)  # Physician Progress Note, Nursing Note, Specialist Consultation, Medication Review, Case Management, Discharge Summary
    author = Column(String(150), nullable=False)
    author_role = Column(String(100), default="Attending Physician")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    content = Column(Text, nullable=False)

    patient = relationship("Patient", back_populates="clinical_notes")
    encounter = relationship("Encounter", back_populates="clinical_notes")


class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False, index=True)
    encounter_id = Column(Integer, ForeignKey("encounters.id"), nullable=True, index=True)
    encounter_identifier = Column(String(50), nullable=True)
    risk_probability = Column(Float, nullable=False)
    risk_level = Column(String(50), nullable=False)  # Low, Moderate, High, Critical
    threshold = Column(Float, default=0.5)
    model_name = Column(String(100), default="MedInsight-GradientBoost-v1")
    model_version = Column(String(50), default="prod-v2.1")
    is_demo = Column(Boolean, default=False)
    input_features = Column(JSON, default=dict)
    prediction_timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)

    patient = relationship("Patient", back_populates="predictions")
    encounter = relationship("Encounter", back_populates="predictions")
    explanations = relationship("PredictionExplanation", back_populates="prediction", cascade="all, delete-orphan")


class PredictionExplanation(Base):
    __tablename__ = "prediction_explanations"

    id = Column(Integer, primary_key=True, index=True)
    prediction_id = Column(Integer, ForeignKey("predictions.id"), nullable=False, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False, index=True)
    feature_name = Column(String(100), nullable=False)
    feature_value = Column(String(100), nullable=False)
    contribution = Column(Float, nullable=False)  # SHAP value / contribution weight (+ increases risk, - decreases risk)
    direction = Column(String(20), default="increases_risk")  # increases_risk, decreases_risk
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    prediction = relationship("Prediction", back_populates="explanations")


class Recommendation(Base):
    __tablename__ = "recommendations"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False, index=True)
    encounter_id = Column(Integer, ForeignKey("encounters.id"), nullable=True, index=True)
    title = Column(String(255), nullable=False)
    priority = Column(String(50), default="High")  # Urgent, High, Medium, Low
    reason = Column(Text, nullable=False)
    responsible_team = Column(String(100), default="Care Coordination")
    status = Column(String(50), default="Pending")  # Pending, In Progress, Completed, Declined
    due_date = Column(String(50), nullable=True)
    source = Column(String(50), default="AI_generated")  # rule_based, AI_generated, clinician_added
    is_completed = Column(Boolean, default=False)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    patient = relationship("Patient", back_populates="recommendations")


class DischargePlan(Base):
    __tablename__ = "discharge_plans"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False, index=True)
    encounter_id = Column(Integer, ForeignKey("encounters.id"), nullable=True, index=True)
    readiness_score = Column(Float, default=0.0)  # Percentage 0-100%
    medication_reconciliation = Column(Boolean, default=False)
    follow_up_appointment = Column(Boolean, default=False)
    diabetes_education = Column(Boolean, default=False)
    pending_tests_cleared = Column(Boolean, default=False)
    transport_arranged = Column(Boolean, default=False)
    home_monitoring_setup = Column(Boolean, default=False)
    care_coordinator_assigned = Column(Boolean, default=False)
    patient_education_completed = Column(Boolean, default=False)
    high_risk_review_completed = Column(Boolean, default=False)
    notes = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    updated_by = Column(String(150), default="Dr. Sarah Mitchell")

    patient = relationship("Patient", back_populates="discharge_plans")
    encounter = relationship("Encounter", back_populates="discharge_plans")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True)
    username = Column(String(100), nullable=False)
    action = Column(String(100), nullable=False)  # PATIENT_RECORD_VIEWED, PREDICTION_GENERATED, etc.
    resource = Column(String(100), nullable=False)
    patient_id = Column(Integer, nullable=True, index=True)
    details = Column(JSON, default=dict)
    ip_address = Column(String(50), default="127.0.0.1")
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)
