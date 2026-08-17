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


# --- Authentication Schemas ---
class UserLogin(BaseModel):
    username: str
    password: str


class UserBase(BaseModel):
    email: str
    username: str
    full_name: str
    role: str  # physician, nurse, care_coordinator, administrator
    department: Optional[str] = None
    is_active: bool = True


class UserCreate(UserBase):
    password: str


class UserResponse(UserBase):
    id: int
    created_at: Optional[datetime.datetime] = None

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse


# --- Patient Schemas ---
class PatientBase(BaseModel):
    mrn: str
    first_name: str
    last_name: str
    dob: str
    age: int
    sex: str
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    emergency_contact: Optional[str] = None
    blood_group: str = "O+"
    race: str = "Caucasian"
    ethnicity: str = "Non-Hispanic"
    safety_badges: List[str] = []
    current_ward: Optional[str] = None
    current_room: Optional[str] = None
    admission_status: str = "Inpatient"
    primary_diagnosis: Optional[str] = None


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
    encounter_id: str
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
    patient: PatientDetail
    encounters: List[EncounterSchema]
    diagnoses: List[DiagnosisSchema]
    vitals: List[ObservationSchema]
    labs: List[LabResultSchema]
    medications: List[MedicationSchema]
    allergies: List[AllergySchema]
    procedures: List[ProcedureSchema]
    notes: List[ClinicalNoteSchema]
    discharge_plan: Optional[DischargePlanSchema] = None
    prediction: Optional[PredictionResult] = None
    report_generated_at: str
    generated_by: str


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
