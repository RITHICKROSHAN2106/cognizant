export type UserRole =
  | 'administrator'
  | 'physician'
  | 'nurse'
  | 'care_coordinator'
  | 'dietician'
  | 'rehab_specialist'
  | 'registration_staff'
  | 'super_admin';

export interface User {
  id: number;
  staff_id?: string;
  email: string;
  username: string;
  full_name: string;
  first_name?: string;
  last_name?: string;
  role: UserRole | string;
  department: string;
  facility?: string;
  permissions?: string[];
  is_active: boolean;
  must_change_password?: boolean;
  failed_login_attempts?: number;
  locked_until?: string | null;
  last_login_at?: string | null;
  created_at?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface AuditLogEntry {
  id?: string;
  user_id?: number | null;
  staff_id?: string | null;
  username: string;
  action: string;
  resource: string;
  patient_id?: number | null;
  encounter_id?: string | number | null;
  details?: Record<string, any> | null;
  ip_address?: string | null;
  timestamp: string;
}

export interface SecurityStatus {
  total_staff: number;
  active_staff: number;
  deactivated_staff: number;
  locked_accounts: number;
  active_sessions: number;
  recent_events_count: number;
  recent_events: AuditLogEntry[];
}

export interface RolePermissionMatrix {
  role: string;
  display_name: string;
  description: string;
  category: string;
  permissions: string[];
  staff_count: number;
}

export interface StaffUserCreate {
  staff_id: string;
  first_name: string;
  last_name: string;
  email: string;
  username: string;
  role: string;
  department: string;
  facility: string;
  temporary_password: string;
  must_change_password: boolean;
  permissions?: string[];
}

export interface StaffUserUpdate {
  first_name?: string;
  last_name?: string;
  email?: string;
  role?: string;
  department?: string;
  facility?: string;
  is_active?: boolean;
  permissions?: string[];
}

export interface Patient {
  id: number;
  mrn: string;
  first_name: string;
  last_name: string;
  dob: string;
  age: number;
  sex: string;
  blood_group: string;
  race: string;
  ethnicity: string;
  safety_badges: string[];
  current_ward?: string;
  current_room?: string;
  admission_status: string;
  current_encounter_id?: string;
  primary_diagnosis?: string;
  attending_physician?: string;
  length_of_stay?: number;
  risk_probability?: number;
  risk_level?: 'Low' | 'Moderate' | 'High' | 'Critical';
  expected_discharge?: string;
  care_coordinator?: string;
  intervention_status?: string;
  main_risk_driver?: string;
}

export interface Diagnosis {
  id: number;
  patient_id: number;
  encounter_id?: number;
  icd_code: string;
  description: string;
  diagnosis_type: 'Primary' | 'Secondary' | 'Chronic' | 'Historical';
  status: 'Active' | 'Resolved' | 'Inactive';
  diagnosed_at: string;
  clinician: string;
}

export interface Observation {
  id: number;
  patient_id: number;
  encounter_id?: number;
  code: string;
  name: string;
  observation_type?: string;
  value: number;
  value_string?: string;
  unit: string;
  recorded_at: string;
  source?: string;
  status: 'Normal' | 'High' | 'Low' | 'Critical';
}

export interface LabResult {
  id: number;
  patient_id: number;
  encounter_id?: number;
  test_code: string;
  test_name: string;
  category: string;
  value: number;
  unit: string;
  reference_min?: number;
  reference_max?: number;
  flag: 'Normal' | 'High' | 'Low' | 'Critical';
  previous_value?: number;
  collected_at: string;
}

export interface Medication {
  id: number;
  patient_id: number;
  encounter_id?: number;
  medication_name: string;
  dose: string;
  route: string;
  frequency: string;
  start_date: string;
  end_date?: string;
  status: 'Active' | 'Historical' | 'Held' | 'Discontinued';
  prescriber: string;
  insulin_status: 'None' | 'Steady' | 'Increased' | 'Decreased';
  is_active: boolean;
}

export interface Allergy {
  id: number;
  patient_id: number;
  substance: string;
  reaction: string;
  severity: 'Severe' | 'Moderate' | 'Mild';
  verification_status: string;
  recorded_at: string;
}

export interface Procedure {
  id: number;
  patient_id: number;
  encounter_id?: number;
  code: string;
  procedure_name: string;
  performed_at: string;
  clinician: string;
  department: string;
}

export interface ClinicalNote {
  id: number;
  patient_id: number;
  encounter_id?: number;
  note_type: string;
  author: string;
  author_role: string;
  created_at: string;
  content: string;
}

export interface Encounter {
  id: number;
  encounter_id: string;
  patient_id: number;
  admission_date: string;
  discharge_date?: string;
  encounter_type: string;
  department: string;
  ward: string;
  room: string;
  attending_physician: string;
  primary_diagnosis: string;
  secondary_diagnoses: string[];
  length_of_stay: number;
  admission_source: string;
  admission_type: string;
  discharge_disposition: string;
  expected_discharge?: string;
  readmission_status: string;
  is_current: boolean;
  time_in_hospital: number;
  num_lab_procedures: number;
  num_medications: number;
  number_outpatient: number;
  number_emergency: number;
  number_inpatient: number;
  a1c_result: string;
  insulin_status: string;
  previous_readmissions: number;
  diagnoses?: Diagnosis[];
  lab_results?: LabResult[];
  medications?: Medication[];
  procedures?: Procedure[];
  clinical_notes?: ClinicalNote[];
}

export interface PredictionInput {
  patient_id?: number;
  encounter_id?: string;
  time_in_hospital: number;
  num_lab_procedures: number;
  num_medications: number;
  number_outpatient: number;
  number_emergency: number;
  number_inpatient: number;
  A1Cresult: string;
  insulin: string;
  previous_readmissions: number;
}

export interface PredictionResult {
  id?: number;
  patient_id?: number;
  encounter_id?: string;
  risk_probability: number;
  risk_level: 'Low' | 'Moderate' | 'High' | 'Critical';
  threshold: number;
  model_name: string;
  model_version: string;
  is_demo: boolean;
  prediction_timestamp: string;
  input_features?: Record<string, any>;
  confidence_interval?: [number, number];
}

export interface ExplanationFeature {
  feature: string;
  value: any;
  contribution: number;
  direction: 'increases_risk' | 'decreases_risk';
}

export interface ExplanationResult {
  patient_id: number;
  encounter_id?: string;
  prediction: number;
  risk_level: string;
  baseline_risk: number;
  disclaimer: string;
  features: ExplanationFeature[];
}

export interface SimulationInput {
  follow_up_scheduled: boolean;
  medication_reconciliation: boolean;
  diabetes_education: boolean;
  care_coordinator: boolean;
  early_outpatient_review: boolean;
  home_monitoring: boolean;
}

export interface SimulationResult {
  patient_id: number;
  baselineRisk: number;
  scenarioRisk: number;
  difference: number;
  appliedInterventions: string[];
  disclaimer: string;
}

export interface Recommendation {
  id: number;
  patient_id: number;
  encounter_id?: number;
  title: string;
  priority: 'Urgent' | 'High' | 'Medium' | 'Low';
  reason: string;
  responsible_team: string;
  status: 'Pending' | 'In Progress' | 'Completed' | 'Declined';
  due_date?: string;
  source: 'rule_based' | 'AI_generated' | 'clinician_added';
  is_completed: boolean;
  completed_at?: string;
  created_at: string;
}

export interface DischargePlan {
  id: number;
  patient_id: number;
  encounter_id?: number;
  readiness_score: number;
  medication_reconciliation: boolean;
  follow_up_appointment: boolean;
  diabetes_education: boolean;
  pending_tests_cleared: boolean;
  transport_arranged: boolean;
  home_monitoring_setup: boolean;
  care_coordinator_assigned: boolean;
  patient_education_completed: boolean;
  high_risk_review_completed: boolean;
  notes?: string;
  updated_at: string;
  updated_by: string;
}

export interface DatasetPatient {
  id: number;
  encounter_id: number;
  patient_nbr: number;
  mrn: string;
  first_name: string;
  last_name: string;
  full_name: string;
  age: number;
  age_group: string;
  sex: string;
  race: string;
  primary_diagnosis: string;
  diag_1: string;
  time_in_hospital: number;
  length_of_stay: number;
  num_lab_procedures: number;
  num_procedures: number;
  num_medications: number;
  number_inpatient: number;
  number_emergency: number;
  number_outpatient: number;
  number_diagnoses: number;
  a1c_result: string;
  insulin: string;
  change: string;
  diabetes_med: string;
  readmitted_outcome: string;
  risk_probability: number;
  risk_level: string;
  current_ward: string;
  current_room: string;
  admission_status: string;
}

export interface DatasetQueryResult {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  items: DatasetPatient[];
}

export interface AnalyticsSummary {
  total_inpatients: number;
  high_risk_count: number;
  critical_risk_count: number;
  discharges_today: number;
  pending_reviews: number;
  readmission_rate_30d: number;
  predictions_today: number;
  risk_distribution: {
    Low: number;
    Moderate: number;
    High: number;
    Critical: number;
  };
  monthly_trend: Array<{
    month: string;
    readmissionRate: number;
    nationalBenchmark: number;
    target: number;
    interventions: number;
  }>;
  readmission_by_diagnosis: Array<{
    diagnosis: string;
    rate: number;
    patientCount: number;
    readmit30dCount?: number;
    riskLevel: string;
  }>;
  readmission_by_age_group: Array<{
    ageGroup: string;
    readmissionRate: number;
    volume: number;
    readmit30dCount?: number;
    avgStayDays?: number;
    avgRisk?: number;
  }>;
  department_distribution: Array<{
    department: string;
    criticalCount: number;
    highCount: number;
    total: number;
  }>;
  model_metrics: {
    auroc: number;
    accuracy: number;
    precision: number;
    recall: number;
    f1: number;
    brier_score: number;
    decision_threshold?: number;
    model_name?: string;
    model_version: string;
    evaluated_cohort_size?: number;
    total_training_records?: number;
    unique_training_patients?: number;
    features_count?: number;
    calibration_status: string;
    disclaimer?: string;
  };
  fairness_metrics: Array<{
    group: string;
    sample_size: number;
    accuracy: number;
    tpr: number;
    fpr: number;
    selection_rate: number;
    disparate_impact: number;
  }>;
  total_dataset_encounters?: number;
  total_unique_patients?: number;
  readmission_30d_count?: number;
  readmission_gt30_count?: number;
  readmission_no_count?: number;
  avg_length_of_stay?: number;
  avg_lab_procedures?: number;
  avg_medications?: number;
  a1c_stats?: Array<{ a1c_status: string; volume: number; readmissionRate: number }>;
  insulin_stats?: Array<{ insulin_regimen: string; volume: number; readmissionRate: number }>;
  prior_inpatient_stats?: Array<{ inpatientVisits: string; volume: number; readmissionRate: number }>;
  los_stats?: Array<{ days: string; volume: number; readmissionRate: number }>;
}


export interface IntegrationItem {
  name: string;
  service_name: string;
  type: string;
  status: string;
  latency_ms: number;
  last_request: string;
  last_sync: string;
  details: Record<string, any>;
}

export interface SystemHealth {
  backend: string;
  database: string;
  ml_service: string;
  external_api: string;
  recommendation_service: string;
  status: string;
  timestamp: string;
  integrations: IntegrationItem[];
}

export interface PatientCreatePayload {
  mrn?: string;
  first_name: string;
  last_name: string;
  dob: string;
  age: number;
  sex: string;
  phone?: string;
  email?: string;
  address?: string;
  emergency_contact?: string;
  blood_group?: string;
  race?: string;
  ethnicity?: string;
  safety_badges?: string[];
  current_ward?: string;
  current_room?: string;
  admission_status?: string;
  primary_diagnosis?: string;
  medical_history?: string;
  known_allergies?: string;
  active_medications?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatResponse {
  patient_id: number;
  reply: string;
  model: string;
  timestamp: string;
  disclaimer: string;
}

export interface ReportSummaryResponse {
  patient: Patient;
  encounters: Encounter[];
  diagnoses: Diagnosis[];
  vitals: Observation[];
  labs: LabResult[];
  medications: Medication[];
  allergies: Allergy[];
  procedures: Procedure[];
  notes: ClinicalNote[];
  discharge_plan?: DischargePlan;
  prediction?: PredictionResult;
  report_generated_at: string;
  generated_by: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}
