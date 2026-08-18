export interface FollowUpVisit {
  id: number;
  patient_id: number;
  care_plan_id?: number;
  week_number: number; // 1, 2, 3, 4
  visit_type: string;
  scheduled_date: string;
  completed_date?: string | null;
  assigned_clinician: string;
  status: 'Scheduled' | 'Completed' | 'Pending' | 'Missed' | 'Rescheduled' | 'Cancelled';
  notes?: string | null;
  outcome?: string | null;
}

export interface MedicationSupplyItem {
  id: number;
  patient_id: number;
  medication_name: string;
  dosage: string;
  frequency: string;
  prescription_date: string;
  expected_supply_date: string;
  supplied_date?: string | null;
  quantity_status: string;
  supplier: string;
  status: 'Supplied' | 'Partially Supplied' | 'Pending' | 'Delayed' | 'Unavailable' | 'Patient Declined' | 'Unknown';
  adherence_status: 'Confirmed' | 'Possible Issue' | 'Unknown';
  last_verified: string;
  next_refill_date: string;
  verified_by: string;
  notes?: string | null;
}

export interface NutritionPlan {
  id: number;
  patient_id: number;
  encounter_id?: number;
  dietician_name: string;
  dietician_id?: number;
  plan_start_date: string;
  plan_end_date?: string | null;
  diet_type: string;
  daily_goals: string[];
  restrictions: string[];
  status: 'Not Assigned' | 'Assigned' | 'In Progress' | 'Review Due' | 'Completed' | 'Paused';
  adherence_status: 'Adherent' | 'Partial' | 'Non-Adherent' | 'Pending Review';
  last_reviewed: string;
  next_review: string;
  clinical_notes: string;
}

export interface RehabilitationSession {
  id: number;
  scheduled_date: string;
  completed_date?: string | null;
  therapist: string;
  session_type: string;
  status: 'Scheduled' | 'Completed' | 'Missed' | 'Cancelled';
  progress: string;
  notes?: string | null;
}

export interface RehabilitationPlan {
  id: number;
  patient_id: number;
  care_plan_id?: number;
  rehabilitation_type: string;
  assigned_specialist: string;
  start_date: string;
  expected_end_date: string;
  frequency: string;
  status: 'Not Required' | 'Assessment Required' | 'Planned' | 'In Progress' | 'Paused' | 'Completed' | 'Escalated';
  goals: string[];
  progress_percentage: number;
  next_session: string;
  sessions: RehabilitationSession[];
}

export interface PatientCoverage {
  id: number;
  patient_id: number;
  coverage_type: string;
  provider: string;
  policy_or_member_id: string;
  coverage_status: 'Active' | 'Pending Verification' | 'Expired' | 'Not Available' | 'Self-Pay';
  valid_from: string;
  valid_until: string;
  emergency_coverage: boolean;
  rehabilitation_coverage: boolean;
  medication_coverage: boolean;
  dietician_coverage: boolean;
  followup_coverage: boolean;
  emergency_support_eligibility: 'Eligible' | 'Potentially Eligible' | 'Not Eligible' | 'Verification Required' | 'Not Assessed';
  notes?: string | null;
}

export interface PatientContact {
  id: number;
  patient_id: number;
  date: string;
  contact_type: 'Phone Call' | 'Video Consultation' | 'In-Person Visit' | 'Home Visit' | 'Secure Message';
  staff_name: string;
  staff_role: string;
  outcome: string;
  notes: string;
  next_action: string;
}

export interface ReadmissionEvent {
  id: number;
  patient_id: number;
  previous_encounter_id: string;
  new_encounter_id: string;
  previous_discharge_date: string;
  readmission_date: string;
  days_since_discharge: number;
  within_30_days: boolean;
  readmission_type: string;
  primary_diagnosis: string;
  recorded_at: string;
}

export interface PostDischargeCarePlan {
  id: number;
  patient_id: number;
  mrn: string;
  patient_name: string;
  discharge_encounter_id: string;
  discharge_date: string;
  care_start_date: string;
  care_end_date: string;
  recovery_status: 'Stable' | 'Improving' | 'Needs Attention' | 'High Risk' | 'Escalated' | 'Readmitted' | 'Follow-Up Completed';
  risk_level_at_discharge: string;
  discharge_risk_score: number;
  current_risk_level: string;
  current_risk_score: number;
  assigned_physician: string;
  care_coordinator: string;
  assigned_dietician: string;
  assigned_rehab_specialist: string;
  follow_up_completion_rate: number;
  next_followup_date: string;
  follow_up_visits: FollowUpVisit[];
  medication_supplies: MedicationSupplyItem[];
  nutrition_plan?: NutritionPlan;
  rehabilitation_plan?: RehabilitationPlan;
  coverage?: PatientCoverage;
  contacts: PatientContact[];
  readmissions: ReadmissionEvent[];
  created_at: string;
  updated_at: string;
}

export interface PostDischargePatientSummary {
  patient_id: number;
  mrn: string;
  patient_name: string;
  age: number;
  sex: string;
  discharge_date: string;
  primary_diagnosis: string;
  discharge_risk_level: string;
  discharge_risk_score: number;
  current_risk_level: string;
  current_risk_score: number;
  recovery_status: 'Stable' | 'Improving' | 'Needs Attention' | 'High Risk' | 'Escalated' | 'Readmitted' | 'Follow-Up Completed';
  next_visit_date: string;
  next_visit_status: string;
  medication_supply_status: string;
  diet_plan_status: string;
  rehab_status: string;
  coverage_status: string;
  care_coordinator: string;
  action_required?: string;
  follow_up_completion_percent: number;
}
