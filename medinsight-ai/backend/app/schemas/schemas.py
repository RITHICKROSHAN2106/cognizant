from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Union, Generic, TypeVar
import datetime

DataT = TypeVar("DataT")


# --- Standard Generic API Envelopes ---
class ApiError(BaseModel):
    code: str
    message: str
    details: Optional[Dict[str, Any]] = None


class ApiResponse(BaseModel, Generic[DataT]):
    success: bool
    data: Optional[DataT] = None
    message: Optional[str] = None
    error: Optional[ApiError] = None


# --- Authentication & Workforce Security Schemas ---
class UserLogin(BaseModel):
    username: str
    password: str


class UserBase(BaseModel):
    staff_id: Optional[str] = "DOC-00000"
    email: str
    username: str
    full_name: str
    role: str  # physician, nurse, care_coordinator, dietician, rehab_specialist, administrator
    department: Optional[str] = "Clinical Services"
    facility: Optional[str] = "MedInsight Central Hospital"
    permissions: List[str] = []
    is_active: bool = True


class UserCreate(UserBase):
    password: str
    must_change_password: bool = False


class StaffUserCreate(BaseModel):
    staff_id: str
    first_name: str
    last_name: str
    email: str
    username: str
    role: str
    department: str = "Internal Medicine"
    facility: str = "MedInsight Central Hospital"
    temporary_password: str
    must_change_password: bool = True
    permissions: List[str] = []


class StaffUserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    department: Optional[str] = None
    facility: Optional[str] = None
    is_active: Optional[bool] = None
    permissions: Optional[List[str]] = None


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str


class AdminPasswordReset(BaseModel):
    temporary_password: str
    must_change_password: bool = True


class UserResponse(UserBase):
    id: int
    created_at: Optional[Union[datetime.datetime, str]] = None
    last_login_at: Optional[Union[datetime.datetime, str]] = None
    failed_login_attempts: int = 0
    locked_until: Optional[Union[datetime.datetime, str]] = None
    must_change_password: bool = False

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    session_id: Optional[str] = None
    user: UserResponse


class AuditLogEntry(BaseModel):
    id: Optional[str] = None
    user_id: Optional[int] = None
    staff_id: Optional[str] = None
    username: str
    action: str
    resource: str
    patient_id: Optional[int] = None
    encounter_id: Optional[Union[str, int]] = None
    details: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = "127.0.0.1"
    timestamp: str


class SecurityStatusResponse(BaseModel):
    total_staff: int
    active_staff: int
    deactivated_staff: int
    locked_accounts: int
    active_sessions: int
    recent_events_count: int
    recent_events: List[AuditLogEntry]


class RolePermissionMatrix(BaseModel):
    role: str
    display_name: str
    description: str
    category: str
    permissions: List[str]
    staff_count: int = 0


# --- Patient Schemas ---
class PatientBase(BaseModel):
    mrn: str = "MRN-000000"
    first_name: str = "Patient"
    last_name: str = "Record"
    dob: str = "1965-01-01"
    age: int = 50
    sex: str = "Female"
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    emergency_contact: Optional[str] = None
    blood_group: str = "O+"
    race: str = "Caucasian"
    ethnicity: str = "Non-Hispanic"
    safety_badges: List[str] = []
    current_ward: Optional[str] = "Ward 5B"
    current_room: Optional[str] = "5B-101"
    admission_status: str = "Inpatient"
    primary_diagnosis: Optional[str] = "Clinical Observation"


class PatientCreate(BaseModel):
    mrn: Optional[str] = None
    first_name: str = Field(..., min_length=1)
    last_name: str = Field(..., min_length=1)
    dob: str = Field(..., min_length=4)
    age: int = Field(..., ge=0, le=120)
    sex: str = Field(..., min_length=1)
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    emergency_contact: Optional[str] = None
    blood_group: str = "O+"
    race: str = "Caucasian"
    ethnicity: str = "Non-Hispanic"
    safety_badges: List[str] = []
    current_ward: Optional[str] = "Ward 5B"
    current_room: Optional[str] = "5B-101"
    admission_status: str = "Inpatient"
    primary_diagnosis: Optional[str] = "Observation"
    medical_history: Optional[str] = None
    known_allergies: Optional[str] = None
    active_medications: Optional[str] = None

    class Config:
        extra = "allow"
        from_attributes = True


class PatientUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    dob: Optional[str] = None
    age: Optional[int] = None
    sex: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    emergency_contact: Optional[str] = None
    blood_group: Optional[str] = None
    race: Optional[str] = None
    ethnicity: Optional[str] = None
    safety_badges: Optional[List[str]] = None
    current_ward: Optional[str] = None
    current_room: Optional[str] = None
    admission_status: Optional[str] = None
    primary_diagnosis: Optional[str] = None

    class Config:
        extra = "allow"
        from_attributes = True



class PatientSummary(PatientBase):
    id: int
    current_encounter_id: Optional[str] = None
    attending_physician: Optional[str] = None
    length_of_stay: Optional[int] = None
    risk_probability: Optional[float] = None
    risk_level: Optional[str] = "Low"  # Low, Moderate, High, Critical
    expected_discharge: Optional[str] = None
    care_coordinator: Optional[str] = None
    intervention_status: Optional[str] = "Pending"
    main_risk_driver: Optional[str] = None

    class Config:
        from_attributes = True


class PatientDetail(PatientBase):
    id: int
    created_at: Optional[Union[datetime.datetime, str]] = None
    updated_at: Optional[Union[datetime.datetime, str]] = None

    class Config:
        from_attributes = True


# --- Clinical Schemas ---
class DiagnosisSchema(BaseModel):
    id: int = 1
    patient_id: int
    encounter_id: Optional[int] = None
    icd_code: str = "250.00"
    description: str = "Type 2 Diabetes Mellitus"
    diagnosis_type: str = "Primary"  # Primary, Secondary, Chronic
    status: str = "Active"  # Active, Resolved
    diagnosed_at: Optional[Union[datetime.datetime, str]] = None
    clinician: Optional[str] = "Dr. Sarah Mitchell, MD"

    class Config:
        from_attributes = True


class ObservationSchema(BaseModel):
    id: int = 1
    patient_id: int
    code: Optional[str] = "VITAL"
    name: str = "Vital Observation"
    value: Optional[float] = None
    value_string: str = ""
    unit: str = ""
    status: str = "Normal"  # Normal, High, Low, Critical
    recorded_at: Optional[Union[datetime.datetime, str]] = None

    class Config:
        from_attributes = True


class LabResultSchema(BaseModel):
    id: int = 1
    patient_id: int
    test_code: str = "LAB-DEFAULT"
    test_name: str
    category: str = "Diagnostic Panel"
    value: float
    unit: str
    reference_min: Optional[float] = None
    reference_max: Optional[float] = None
    flag: str = "Normal"  # Normal, High, Low, Critical
    previous_value: Optional[float] = None
    collected_at: Optional[Union[datetime.datetime, str]] = None

    class Config:
        from_attributes = True



class MedicationSchema(BaseModel):
    id: int
    patient_id: int
    medication_name: str
    dose: str
    route: str
    frequency: str
    status: str  # Active, Held, Discontinued
    insulin_status: str = "None"  # None, Steady, Increased, Decreased
    is_active: bool
    prescribed_at: Optional[Union[datetime.datetime, str]] = None
    prescribed_by: Optional[str] = None

    class Config:
        from_attributes = True


class AllergySchema(BaseModel):
    id: int
    patient_id: int
    substance: str
    reaction: str
    severity: str  # Mild, Moderate, Severe
    verification_status: str = "Confirmed"
    identified_at: Optional[Union[datetime.datetime, str]] = None

    class Config:
        from_attributes = True


class ProcedureSchema(BaseModel):
    id: int
    patient_id: int
    code: str
    procedure_name: str
    department: str
    clinician: str
    performed_at: Optional[Union[datetime.datetime, str]] = None

    class Config:
        from_attributes = True


class ClinicalNoteSchema(BaseModel):
    id: int
    patient_id: int
    note_type: str
    author: str
    author_role: str
    created_at: Optional[Union[datetime.datetime, str]] = None
    content: str

    class Config:
        from_attributes = True


class EncounterSchema(BaseModel):
    id: int
    encounter_id: Union[str, int]
    patient_id: int
    admission_date: Optional[Union[datetime.datetime, str]] = None
    discharge_date: Optional[Union[datetime.datetime, str]] = None
    encounter_type: str = "Inpatient Admission"
    department: str = "Internal Medicine"
    ward: str = "Ward 5B"
    room: str = "5B-101"
    attending_physician: str = "Dr. Sarah Mitchell"
    primary_diagnosis: str = "Type 2 Diabetes Mellitus"
    secondary_diagnoses: List[str] = []
    length_of_stay: int = 1
    admission_source: Optional[str] = "Emergency Room"
    admission_type: Optional[str] = "Emergency / Urgent"
    discharge_disposition: Optional[str] = "Home"
    readmission_status: Optional[str] = "NO"
    is_current: bool = True
    time_in_hospital: int = 1
    num_lab_procedures: int = 0
    num_medications: int = 0
    number_outpatient: int = 0
    number_emergency: int = 0
    number_inpatient: int = 0
    a1c_result: Optional[str] = "None"
    insulin_status: Optional[str] = "No"
    previous_readmissions: int = 0
    source_data: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True


# --- ML & Prediction Schemas ---
class PredictionInput(BaseModel):
    patient_id: Optional[int] = None
    encounter_id: Optional[str] = None
    time_in_hospital: int = Field(..., ge=1, le=60)
    num_lab_procedures: int = Field(..., ge=0, le=200)
    num_medications: int = Field(..., ge=0, le=100)
    number_outpatient: int = Field(..., ge=0, le=50)
    number_emergency: int = Field(..., ge=0, le=50)
    number_inpatient: int = Field(..., ge=0, le=50)
    A1Cresult: str = Field(..., description="none, norm, high")
    insulin: str = Field(..., description="none, steady, up, down")
    previous_readmissions: int = Field(0, ge=0, le=20)


class PredictionResult(BaseModel):
    id: Optional[int] = None
    patient_id: Optional[int] = None
    encounter_id: Optional[str] = None
    risk_probability: float
    risk_level: str  # Low, Moderate, High, Critical
    threshold: float = 0.50
    model_name: str
    model_version: str
    is_demo: bool = False
    prediction_timestamp: Optional[Union[datetime.datetime, str]] = None
    input_features: Optional[Dict[str, Any]] = None
    confidence_interval: Optional[List[float]] = None

    class Config:
        from_attributes = True


class ExplanationFeature(BaseModel):
    feature: str
    value: str
    contribution: float
    direction: str  # increases_risk, decreases_risk


class ExplanationResult(BaseModel):
    patient_id: int
    encounter_id: str
    prediction: float
    risk_level: str
    baseline_risk: float
    disclaimer: str = "Clinical Decision Support — These contributions describe model influence and do not establish clinical causation."
    features: List[ExplanationFeature]


class SimulationInput(BaseModel):
    medication_reconciliation: bool = False
    follow_up_scheduled: bool = False
    diabetes_education: bool = False
    care_coordinator: bool = False
    early_outpatient_review: bool = False
    home_monitoring: bool = False


class SimulationResult(BaseModel):
    patient_id: int
    baselineRisk: float
    scenarioRisk: float
    difference: float
    appliedInterventions: List[str]


# --- Prevention & Recommendation Schemas ---
class RecommendationCreate(BaseModel):
    title: str
    priority: str = "High"  # Urgent, High, Medium, Low
    reason: str
    responsible_team: str = "Clinical Team"
    source: str = "Clinical Protocol"
    due_date: Optional[str] = None


class RecommendationSchema(BaseModel):
    id: int
    patient_id: int
    title: str
    priority: str  # Urgent, High, Medium, Low
    reason: str
    responsible_team: str
    status: str  # Pending, In Progress, Completed
    source: str
    is_completed: bool
    due_date: Optional[str] = None

    class Config:
        from_attributes = True


class DischargePlanSchema(BaseModel):
    id: int
    patient_id: int
    encounter_id: Optional[int] = None
    readiness_score: float
    medication_reconciliation: bool
    follow_up_appointment: bool
    diabetes_education: bool
    pending_tests_cleared: bool
    transport_arranged: bool
    home_monitoring_setup: bool
    care_coordinator_assigned: bool
    patient_education_completed: bool
    high_risk_review_completed: bool
    notes: Optional[str] = None
    updated_at: Optional[Union[datetime.datetime, str]] = None
    updated_by: Optional[str] = "Clinical Team"

    class Config:
        from_attributes = True


class DischargePlanUpdate(BaseModel):
    medication_reconciliation: Optional[bool] = None
    follow_up_appointment: Optional[bool] = None
    diabetes_education: Optional[bool] = None
    pending_tests_cleared: Optional[bool] = None
    transport_arranged: Optional[bool] = None
    home_monitoring_setup: Optional[bool] = None
    care_coordinator_assigned: Optional[bool] = None
    patient_education_completed: Optional[bool] = None
    high_risk_review_completed: Optional[bool] = None
    notes: Optional[str] = None


# --- AI Chat Schemas ---
class ChatMessage(BaseModel):
    role: str  # user, assistant, system
    content: str


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1)
    history: Optional[List[ChatMessage]] = []


class ChatResponse(BaseModel):
    patient_id: int
    reply: str
    model: str
    timestamp: str
    disclaimer: str = "MedInsight Clinical AI Assistant is for clinical decision support and does not replace medical judgement."


# --- Reports Schemas ---
class ReportSummaryResponse(BaseModel):
    patient: Dict[str, Any]
    encounters: List[Dict[str, Any]] = []
    diagnoses: List[Dict[str, Any]] = []
    vitals: List[Dict[str, Any]] = []
    labs: List[Dict[str, Any]] = []
    medications: List[Dict[str, Any]] = []
    allergies: List[Dict[str, Any]] = []
    procedures: List[Dict[str, Any]] = []
    notes: List[Dict[str, Any]] = []
    discharge_plan: Optional[Dict[str, Any]] = None
    prediction: Optional[Dict[str, Any]] = None
    report_generated_at: str
    generated_by: str

    class Config:
        extra = "allow"
        from_attributes = True


# --- Analytics Schemas ---
class AnalyticsSummary(BaseModel):
    total_inpatients: int
    high_risk_count: int
    critical_risk_count: int
    discharges_today: int
    pending_reviews: int
    readmission_rate_30d: float
    predictions_today: int
    risk_distribution: Dict[str, int]
    monthly_trend: List[Dict[str, Any]]
    readmission_by_diagnosis: List[Dict[str, Any]]
    readmission_by_age_group: List[Dict[str, Any]]
    department_distribution: List[Dict[str, Any]]
    model_metrics: Dict[str, Any]
    fairness_metrics: List[Dict[str, Any]]
    # Enterprise 1-Lakh Dataset Analytics
    total_dataset_encounters: Optional[int] = 101766
    total_unique_patients: Optional[int] = 71518
    readmission_30d_count: Optional[int] = 11357
    readmission_gt30_count: Optional[int] = 35545
    readmission_no_count: Optional[int] = 54864
    avg_length_of_stay: Optional[float] = 4.4
    avg_lab_procedures: Optional[float] = 43.1
    avg_medications: Optional[float] = 16.0
    a1c_stats: Optional[List[Dict[str, Any]]] = []
    insulin_stats: Optional[List[Dict[str, Any]]] = []
    prior_inpatient_stats: Optional[List[Dict[str, Any]]] = []
    los_stats: Optional[List[Dict[str, Any]]] = []



# --- System Health & Integration Schemas ---
class IntegrationItem(BaseModel):
    name: str
    service_name: str
    type: str
    status: str
    latency_ms: int
    last_request: str
    last_sync: str
    details: Dict[str, Any] = {}


class SystemHealthResponse(BaseModel):
    backend: str
    database: str
    ml_service: str
    external_api: str
    recommendation_service: str
    status: str
    timestamp: datetime.datetime
    integrations: List[IntegrationItem]


# --- Post-Discharge Recovery & Continuity of Care Schemas ---
class FollowUpVisit(BaseModel):
    id: int
    patient_id: int
    care_plan_id: Optional[int] = None
    week_number: int  # 1, 2, 3, 4
    visit_type: str = "Primary Care Follow-Up"  # Primary Care, Endocrinology, Cardiology, Telehealth, Home Health
    scheduled_date: str
    completed_date: Optional[str] = None
    assigned_clinician: str = "Dr. Sarah Mitchell, MD"
    status: str = "Scheduled"  # Scheduled, Completed, Pending, Missed, Rescheduled, Cancelled
    notes: Optional[str] = None
    outcome: Optional[str] = None

    class Config:
        extra = "allow"
        from_attributes = True


class FollowUpVisitUpdate(BaseModel):
    scheduled_date: Optional[str] = None
    completed_date: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    outcome: Optional[str] = None

    class Config:
        extra = "allow"


class MedicationSupplyItem(BaseModel):
    id: int
    patient_id: int
    medication_name: str
    dosage: str
    frequency: str
    prescription_date: str
    expected_supply_date: str
    supplied_date: Optional[str] = None
    quantity_status: str = "30-Day Supply"
    supplier: str = "Hospital Outpatient Pharmacy"
    status: str = "Supplied"  # Supplied, Partially Supplied, Pending, Delayed, Unavailable, Patient Declined, Unknown
    adherence_status: str = "Confirmed"  # Confirmed, Possible Issue, Unknown
    last_verified: str
    next_refill_date: str
    verified_by: str = "Pharmacist Marcus Brody, PharmD"
    notes: Optional[str] = None

    class Config:
        extra = "allow"
        from_attributes = True


class NutritionPlanSchema(BaseModel):
    id: int
    patient_id: int
    encounter_id: Optional[int] = None
    dietician_name: str = "Elena Rostova, RD, CDE"
    dietician_id: Optional[int] = 1
    plan_start_date: str
    plan_end_date: Optional[str] = None
    diet_type: str = "Consistent Carbohydrate Diabetes Meal Plan (1500-1800 kcal)"
    daily_goals: List[str] = [
        "Carbohydrate target: 45-60g per main meal",
        "Consistent meal timing to prevent hypoglycemia",
        "Hydration: Minimum 2.0L water daily",
        "Sodium restriction: <2,000 mg/day"
    ]
    restrictions: List[str] = ["Refined sugars", "High glycemic juices", "Excessive saturated fats"]
    status: str = "Assigned"  # Not Assigned, Assigned, In Progress, Review Due, Completed, Paused
    adherence_status: str = "Adherent"  # Adherent, Partial, Non-Adherent, Pending Review
    last_reviewed: str
    next_review: str
    clinical_notes: str = "Personalized diabetic medical nutrition therapy initiated. Bedside carbohydrate counting education completed."

    class Config:
        extra = "allow"
        from_attributes = True


class RehabilitationSessionSchema(BaseModel):
    id: int
    scheduled_date: str
    completed_date: Optional[str] = None
    therapist: str = "David Chen, DPT"
    session_type: str = "Physical Mobility & Gait Training"
    status: str = "Completed"  # Scheduled, Completed, Missed, Cancelled
    progress: str = "Tolerated well. 300ft ambulation achieved."
    notes: Optional[str] = None

    class Config:
        extra = "allow"
        from_attributes = True


class RehabilitationPlanSchema(BaseModel):
    id: int
    patient_id: int
    care_plan_id: Optional[int] = None
    rehabilitation_type: str = "Physical Rehabilitation & Mobility Support"
    assigned_specialist: str = "David Chen, DPT"
    start_date: str
    expected_end_date: str
    frequency: str = "2 sessions / week"
    status: str = "In Progress"  # Not Required, Assessment Required, Planned, In Progress, Paused, Completed, Escalated
    goals: List[str] = [
        "Independent transfers and stairs",
        "Improve lower extremity endurance",
        "Fall prevention home safety regimen"
    ]
    progress_percentage: int = 60
    next_session: str
    sessions: List[RehabilitationSessionSchema] = []

    class Config:
        extra = "allow"
        from_attributes = True


class PatientCoverageSchema(BaseModel):
    id: int
    patient_id: int
    coverage_type: str = "Medicare Part A & B"  # Medicare, Medicaid, Commercial / Private, Self-Pay, Government Programme
    provider: str = "Centers for Medicare & Medicaid Services (CMS)"
    policy_or_member_id: str = "MED-8849201"
    coverage_status: str = "Active"  # Active, Pending Verification, Expired, Not Available, Self-Pay
    valid_from: str = "2026-01-01"
    valid_until: str = "2026-12-31"
    emergency_coverage: bool = True
    rehabilitation_coverage: bool = True
    medication_coverage: bool = True
    dietician_coverage: bool = True
    followup_coverage: bool = True
    emergency_support_eligibility: str = "Eligible"  # Eligible, Potentially Eligible, Not Eligible, Verification Required, Not Assessed
    notes: Optional[str] = "High-Risk 30-Day Readmission Reduction Support Program Qualified"

    class Config:
        extra = "allow"
        from_attributes = True


class PatientContactSchema(BaseModel):
    id: int
    patient_id: int
    date: str
    contact_type: str = "Phone Call"  # Phone Call, Video Consultation, In-Person Visit, Home Visit, Secure Message
    staff_name: str = "Emma Davis, RN"
    staff_role: str = "Care Coordinator"
    outcome: str = "Reached - Patient stable and taking insulin as prescribed."
    notes: str = "Verified glucometer readings (morning fasting 138 mg/dL). Week 2 PCP visit confirmed."
    next_action: str = "Follow-up check-in call in 5 days."

    class Config:
        extra = "allow"
        from_attributes = True


class ReadmissionEventSchema(BaseModel):
    id: int
    patient_id: int
    previous_encounter_id: str
    new_encounter_id: str
    previous_discharge_date: str
    readmission_date: str
    days_since_discharge: int
    within_30_days: bool = True
    readmission_type: str = "Urgent Inpatient Readmission"
    primary_diagnosis: str
    recorded_at: str

    class Config:
        extra = "allow"
        from_attributes = True


class PostDischargeCarePlan(BaseModel):
    id: int
    patient_id: int
    mrn: str
    patient_name: str
    discharge_encounter_id: str
    discharge_date: str
    care_start_date: str
    care_end_date: str
    recovery_status: str = "Improving"  # Stable, Improving, Needs Attention, High Risk, Escalated, Readmitted, Follow-Up Completed
    risk_level_at_discharge: str = "High"
    discharge_risk_score: float = 0.68
    current_risk_level: str = "Moderate"
    current_risk_score: float = 0.52
    assigned_physician: str = "Dr. Sarah Mitchell, MD"
    care_coordinator: str = "Emma Davis, RN"
    assigned_dietician: str = "Elena Rostova, RD, CDE"
    assigned_rehab_specialist: str = "David Chen, DPT"
    follow_up_completion_rate: int = 75
    next_followup_date: str
    follow_up_visits: List[FollowUpVisit] = []
    medication_supplies: List[MedicationSupplyItem] = []
    nutrition_plan: Optional[NutritionPlanSchema] = None
    rehabilitation_plan: Optional[RehabilitationPlanSchema] = None
    coverage: Optional[PatientCoverageSchema] = None
    contacts: List[PatientContactSchema] = []
    readmissions: List[ReadmissionEventSchema] = []
    created_at: str
    updated_at: str

    class Config:
        extra = "allow"
        from_attributes = True


class PostDischargePatientSummary(BaseModel):
    patient_id: int
    mrn: str
    patient_name: str
    age: int
    sex: str
    discharge_date: str
    primary_diagnosis: str
    discharge_risk_level: str
    discharge_risk_score: float
    current_risk_level: str
    current_risk_score: float
    recovery_status: str  # Stable, Improving, Needs Attention, High Risk, Escalated, Readmitted, Follow-Up Completed
    next_visit_date: str
    next_visit_status: str
    medication_supply_status: str
    diet_plan_status: str
    rehab_status: str
    coverage_status: str
    care_coordinator: str
    action_required: Optional[str] = None
    follow_up_completion_percent: int = 0

    class Config:
        extra = "allow"
        from_attributes = True

