import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  UserPlus, Save, ArrowLeft, ArrowRight, AlertCircle, CheckCircle2,
  ShieldAlert, HeartPulse, Building2, User, Phone, MapPin, Pill,
  Activity, ShieldCheck, FileCheck, Check, AlertTriangle, UserCheck, Flame
} from 'lucide-react';
import { patientService } from '../services/patientService';
import { apiClient } from '../services/api';
import { PatientCreatePayload } from '../types/clinical';

export const AddPatientPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [duplicateMatches, setDuplicateMatches] = useState<any[]>([]);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);

  // Form State
  const [formData, setFormData] = useState<PatientCreatePayload & {
    middle_name?: string;
    gender_identity?: string;
    national_id?: string;
    preferred_language?: string;
    marital_status?: string;
    alt_phone?: string;
    address_line_2?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
    next_of_kin_same?: boolean;
    next_of_kin_name?: string;
    next_of_kin_relation?: string;
    next_of_kin_phone?: string;
    allergy_severity?: string;
    has_diabetes?: boolean;
    diabetes_type?: string;
    year_diagnosed?: string;
    insulin_use?: string;
    latest_a1c?: string;
    latest_glucose?: string;
    has_hypertension?: boolean;
    has_ckd?: boolean;
    has_cvd?: boolean;
    encounter_type?: string;
    admission_type?: string;
    admission_source?: string;
    department?: string;
    attending_physician?: string;
    payer_type?: string;
    insurance_provider?: string;
    policy_number?: string;
    consent_treatment?: boolean;
    consent_data?: boolean;
    consent_cds?: boolean;
  }>({
    first_name: '',
    middle_name: '',
    last_name: '',
    dob: '',
    age: 62,
    sex: 'Male',
    gender_identity: 'Male',
    national_id: '',
    preferred_language: 'English',
    marital_status: 'Married',
    phone: '',
    alt_phone: '',
    email: '',
    address: '',
    address_line_2: '',
    city: 'Springfield',
    state: 'IL',
    postal_code: '62701',
    country: 'United States',
    emergency_contact: '',
    next_of_kin_same: true,
    blood_group: 'O+',
    race: 'Caucasian',
    ethnicity: 'Non-Hispanic',
    current_ward: 'Ward 5B',
    current_room: '5B-101',
    admission_status: 'Inpatient',
    encounter_type: 'Inpatient Admission',
    admission_type: 'Emergency',
    admission_source: 'Emergency Room',
    department: 'Internal Medicine',
    attending_physician: 'Dr. Sarah Mitchell',
    primary_diagnosis: 'Type 2 Diabetes Mellitus with Hyperglycemia (ICD-9 250.02)',
    medical_history: 'Hypertension, Dyslipidemia',
    known_allergies: 'Penicillin (Severe Rash)',
    allergy_severity: 'Moderate',
    active_medications: 'Metformin 1000mg BID, Lisinopril 10mg Daily',
    has_diabetes: true,
    diabetes_type: 'Type 2',
    year_diagnosed: '2016',
    insulin_use: 'Steady',
    latest_a1c: '8.4%',
    latest_glucose: '178 mg/dL',
    has_hypertension: true,
    has_ckd: false,
    has_cvd: true,
    payer_type: 'Medicare',
    insurance_provider: 'Medicare Part A & B',
    policy_number: 'MED-9948201',
    consent_treatment: true,
    consent_data: true,
    consent_cds: true,
    safety_badges: ['DIABETES', 'PENICILLIN ALLERGY', 'FALL RISK']
  });

  // Calculate age when DOB changes
  const handleDobChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dobVal = e.target.value;
    let calculatedAge = formData.age;
    if (dobVal) {
      const birth = new Date(dobVal);
      const now = new Date();
      let age = now.getFullYear() - birth.getFullYear();
      const m = now.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
        age--;
      }
      calculatedAge = Math.max(0, age);
    }
    setFormData(prev => ({ ...prev, dob: dobVal, age: calculatedAge }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: name === 'age' ? parseInt(value) || 0 : value
      }));
    }
  };

  const handleBadgeToggle = (badge: string) => {
    setFormData(prev => {
      const current = prev.safety_badges || [];
      const updated = current.includes(badge)
        ? current.filter(b => b !== badge)
        : [...current, badge];
      return { ...prev, safety_badges: updated };
    });
  };

  // Check duplicates on Step 1 -> Step 2 transition
  const handleCheckDuplicatesAndNext = async () => {
    setError(null);
    if (!formData.first_name.trim() || !formData.last_name.trim()) {
      setError('Please provide patient first and last name.');
      return;
    }
    if (!formData.dob) {
      setError('Please provide date of birth.');
      return;
    }

    try {
      const resp = await apiClient.post('/patients/check-duplicate', {
        first_name: formData.first_name,
        last_name: formData.last_name,
        dob: formData.dob,
        phone: formData.phone
      });
      const matches = resp.data?.data || [];
      if (matches.length > 0 && currentStep === 1) {
        setDuplicateMatches(matches);
        setShowDuplicateModal(true);
        return;
      }
    } catch (err) {
      console.warn('Duplicate check skipped:', err);
    }
    setCurrentStep(prev => Math.min(prev + 1, 8));
  };

  const handleEmergencyRegistration = async () => {
    const tempYear = new Date().getFullYear();
    const tempId = Math.floor(1000 + Math.random() * 9000);
    const tempPayload: PatientCreatePayload = {
      mrn: `TEMP-${tempYear}-${tempId}`,
      first_name: 'Unknown / Emergency',
      last_name: `Patient #${tempId}`,
      dob: '1970-01-01',
      age: 55,
      sex: 'Male',
      phone: '+1 (555) 000-0000',
      current_ward: 'ICU Step-down',
      current_room: 'ICU-04',
      admission_status: 'Inpatient',
      primary_diagnosis: 'Emergency Trauma / Unidentified Patient',
      safety_badges: ['IDENTITY VERIFICATION PENDING', 'FALL RISK']
    };

    try {
      setLoading(true);
      const res = await patientService.createPatient(tempPayload);
      setSuccess(`Emergency temporary patient record created (MRN: ${res.mrn})!`);
      setTimeout(() => navigate(`/ehr/${res.id}`), 1200);
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || err?.message || 'Failed emergency registration');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      setLoading(true);
      const created = await patientService.createPatient(formData);
      
      // Auto-verify persistence in MongoDB
      try {
        const verified = await patientService.getPatientById(created.id);
        if (!verified || !verified.mrn) {
          throw new Error("Patient registration could not be verified in database.");
        }
      } catch (verifyErr) {
        throw new Error("Patient registration could not be verified in database.");
      }


      // Invalidate TanStack query cache for instant synchronization across all clinical pages
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.invalidateQueries({ queryKey: ['dataset_patients'] });
      queryClient.invalidateQueries({ queryKey: ['high_risk_patients'] });
      queryClient.invalidateQueries({ queryKey: ['patient', created.id] });

      setSuccess(`Patient ${created.first_name} ${created.last_name} (${created.mrn}) successfully registered in database!`);
      setTimeout(() => {
        navigate(`/ehr/${created.id}`);
      }, 1200);
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || err?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEncounterForExisting = async (existingId: number) => {
    try {
      setLoading(true);
      await apiClient.post(`/patients/${existingId}/encounters`, {
        admission_type: formData.admission_type || 'Urgent',
        admission_source: formData.admission_source || 'Emergency Room',
        encounter_type: formData.encounter_type || 'Inpatient Admission',
        department: formData.department || 'Internal Medicine',
        ward: formData.current_ward || 'Ward 5B',
        room: formData.current_room || '5B-101',
        primary_diagnosis: formData.primary_diagnosis || 'Inpatient Clinical Readmission',
        attending_physician: formData.attending_physician || 'Dr. Sarah Mitchell'
      });
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.invalidateQueries({ queryKey: ['patient', existingId] });
      setSuccess(`New clinical encounter successfully attached to existing patient!`);
      setShowDuplicateModal(false);
      setTimeout(() => navigate(`/ehr/${existingId}`), 1000);
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || err?.message || 'Failed to create encounter for existing patient');
    } finally {
      setLoading(false);
    }
  };


  const steps = [
    { num: 1, label: 'Identity' },
    { num: 2, label: 'Demographics' },
    { num: 3, label: 'Contact' },
    { num: 4, label: 'Emergency' },
    { num: 5, label: 'Alerts & Allergies' },
    { num: 6, label: 'Medical History' },
    { num: 7, label: 'Admission' },
    { num: 8, label: 'Review & Confirm' }
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16 text-slate-900">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-sky-700" />
            New Patient Registration
          </h1>
          <p className="text-xs text-slate-500">
            Create a new electronic patient record, clinical safety profile, and initial inpatient encounter.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleEmergencyRegistration}
            disabled={loading}
            className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
            <span>Emergency / Unknown Patient</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2 font-medium">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{success} Redirecting to EHR...</span>
        </div>
      )}

      {/* Wizard Progress Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between overflow-x-auto gap-2">
          {steps.map((s) => {
            const isActive = currentStep === s.num;
            const isCompleted = currentStep > s.num;
            return (
              <button
                key={s.num}
                type="button"
                onClick={() => setCurrentStep(s.num)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                  isActive
                    ? 'bg-sky-700 text-white shadow-xs'
                    : isCompleted
                    ? 'bg-sky-50 text-sky-800 border border-sky-200'
                    : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                  isActive ? 'bg-white text-sky-800 font-black' : isCompleted ? 'bg-sky-700 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {isCompleted ? <Check className="w-3 h-3" /> : s.num}
                </span>
                <span>{s.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Wizard Form Body */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Patient Identity */}
        {currentStep === 1 && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-5">
            <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-2">
              1. Patient Identification & Demographics
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">First Name *</label>
                <input
                  type="text"
                  name="first_name"
                  required
                  value={formData.first_name}
                  onChange={handleChange}
                  placeholder="e.g. Robert"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600 focus:bg-white text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Middle Name</label>
                <input
                  type="text"
                  name="middle_name"
                  value={formData.middle_name || ''}
                  onChange={handleChange}
                  placeholder="e.g. William"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600 focus:bg-white text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Last Name *</label>
                <input
                  type="text"
                  name="last_name"
                  required
                  value={formData.last_name}
                  onChange={handleChange}
                  placeholder="e.g. Jenkins"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600 focus:bg-white text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Date of Birth *</label>
                <input
                  type="date"
                  name="dob"
                  required
                  value={formData.dob}
                  onChange={handleDobChange}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600 focus:bg-white text-slate-900 font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Calculated Age</label>
                <div className="px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg font-bold text-slate-800">
                  {formData.age} years old
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Sex at Birth *</label>
                <select
                  name="sex"
                  value={formData.sex}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600 focus:bg-white text-slate-900"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Blood Group</label>
                <select
                  name="blood_group"
                  value={formData.blood_group}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600 focus:bg-white text-slate-900"
                >
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">National ID / Passport #</label>
                <input
                  type="text"
                  name="national_id"
                  value={formData.national_id || ''}
                  onChange={handleChange}
                  placeholder="e.g. 982-14-XXXX"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600 focus:bg-white text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Preferred Language</label>
                <select
                  name="preferred_language"
                  value={formData.preferred_language || 'English'}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600 focus:bg-white text-slate-900"
                >
                  <option value="English">English</option>
                  <option value="Spanish">Spanish (Español)</option>
                  <option value="Mandarin">Mandarin (中文)</option>
                  <option value="Arabic">Arabic (العربية)</option>
                  <option value="French">French</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Demographics */}
        {currentStep === 2 && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-5">
            <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-2">
              2. Demographic Profile & Sociodemographics
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Race</label>
                <select
                  name="race"
                  value={formData.race}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600 focus:bg-white text-slate-900"
                >
                  <option value="Caucasian">Caucasian</option>
                  <option value="AfricanAmerican">African American</option>
                  <option value="Hispanic">Hispanic</option>
                  <option value="Asian">Asian</option>
                  <option value="Other">Other / Multiracial</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Ethnicity</label>
                <select
                  name="ethnicity"
                  value={formData.ethnicity}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600 focus:bg-white text-slate-900"
                >
                  <option value="Non-Hispanic">Non-Hispanic or Latino</option>
                  <option value="Hispanic">Hispanic or Latino</option>
                  <option value="Declined">Declined to State</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Marital Status</label>
                <select
                  name="marital_status"
                  value={formData.marital_status || 'Married'}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600 focus:bg-white text-slate-900"
                >
                  <option value="Married">Married</option>
                  <option value="Single">Single</option>
                  <option value="Divorced">Divorced</option>
                  <option value="Widowed">Widowed</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Contact & Address */}
        {currentStep === 3 && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-5">
            <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-2">
              3. Contact Information & Residential Address
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Primary Phone *</label>
                <input
                  type="text"
                  name="phone"
                  required
                  value={formData.phone || ''}
                  onChange={handleChange}
                  placeholder="+1 (555) 234-5678"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600 focus:bg-white text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Alternative Phone</label>
                <input
                  type="text"
                  name="alt_phone"
                  value={formData.alt_phone || ''}
                  onChange={handleChange}
                  placeholder="+1 (555) 876-5432"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600 focus:bg-white text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Email Address</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email || ''}
                  onChange={handleChange}
                  placeholder="patient@example.com"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600 focus:bg-white text-slate-900"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-slate-700 font-bold mb-1">Address Line 1 *</label>
                <input
                  type="text"
                  name="address"
                  required
                  value={formData.address || ''}
                  onChange={handleChange}
                  placeholder="123 Clinical Way"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600 focus:bg-white text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Address Line 2</label>
                <input
                  type="text"
                  name="address_line_2"
                  value={formData.address_line_2 || ''}
                  onChange={handleChange}
                  placeholder="Apt 4B"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600 focus:bg-white text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">City *</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city || 'Springfield'}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600 focus:bg-white text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">State / Province</label>
                <input
                  type="text"
                  name="state"
                  value={formData.state || 'IL'}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600 focus:bg-white text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Postal Code</label>
                <input
                  type="text"
                  name="postal_code"
                  value={formData.postal_code || '62701'}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600 focus:bg-white text-slate-900"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Emergency Contact & Next of Kin */}
        {currentStep === 4 && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-5">
            <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-2">
              4. Emergency Contact & Next of Kin
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Emergency Contact Name & Relation *</label>
                <input
                  type="text"
                  name="emergency_contact"
                  required
                  value={formData.emergency_contact || ''}
                  onChange={handleChange}
                  placeholder="e.g. Laura Jenkins (Spouse) - +1 (555) 998-1122"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600 focus:bg-white text-slate-900"
                />
              </div>

              <div className="flex items-center gap-2 pt-6">
                <input
                  type="checkbox"
                  id="next_of_kin_same"
                  name="next_of_kin_same"
                  checked={formData.next_of_kin_same}
                  onChange={handleChange}
                  className="w-4 h-4 rounded text-sky-600 border-slate-300"
                />
                <label htmlFor="next_of_kin_same" className="text-slate-700 font-bold">
                  Use emergency contact as Primary Next of Kin
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Alerts & Allergies */}
        {currentStep === 5 && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-5">
            <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-2">
              5. Clinical Alerts & Known Drug Allergies
            </h2>
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Known Drug Allergies</label>
                  <input
                    type="text"
                    name="known_allergies"
                    value={formData.known_allergies || ''}
                    onChange={handleChange}
                    placeholder="e.g. Penicillin, Sulfa"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600 focus:bg-white text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Allergy Severity</label>
                  <select
                    name="allergy_severity"
                    value={formData.allergy_severity || 'Moderate'}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600 focus:bg-white text-slate-900"
                  >
                    <option value="Mild">Mild (Localized rash / itching)</option>
                    <option value="Moderate">Moderate (Urticaria / angioedema)</option>
                    <option value="Severe">Severe (Anaphylaxis risk)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-2">Hospital Safety Badges</label>
                <div className="flex flex-wrap gap-2">
                  {['FALL RISK', 'PENICILLIN ALLERGY', 'DIABETES', 'HIGH READMISSION RISK', 'ISOLATION / CONTACT', 'ASPIRATION RISK'].map(b => {
                    const sel = formData.safety_badges?.includes(b);
                    return (
                      <button
                        type="button"
                        key={b}
                        onClick={() => handleBadgeToggle(b)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition flex items-center gap-1.5 ${
                          sel ? 'bg-rose-50 text-rose-800 border-rose-300' : 'bg-slate-50 text-slate-600 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        <ShieldAlert className="w-3.5 h-3.5" />
                        {b}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 6: Medical History */}
        {currentStep === 6 && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-5">
            <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-2">
              6. Medical History & Diabetic Profile
            </h2>
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Primary Admitting Diagnosis *</label>
                  <input
                    type="text"
                    name="primary_diagnosis"
                    required
                    value={formData.primary_diagnosis || ''}
                    onChange={handleChange}
                    placeholder="e.g. Type 2 Diabetes Mellitus with Ketoacidosis"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600 focus:bg-white text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Active Prescribed Medications</label>
                  <input
                    type="text"
                    name="active_medications"
                    value={formData.active_medications || ''}
                    onChange={handleChange}
                    placeholder="e.g. Metformin 1000mg, Lisinopril 10mg"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600 focus:bg-white text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Past Medical History</label>
                  <input
                    type="text"
                    name="medical_history"
                    value={formData.medical_history || ''}
                    onChange={handleChange}
                    placeholder="e.g. Hypertension, CAD, CKD"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600 focus:bg-white text-slate-900"
                  />
                </div>
              </div>

              {/* Diabetes Detailed Panel */}
              <div className="p-4 bg-sky-50 rounded-xl border border-sky-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-sky-900 text-xs flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-sky-700" />
                    Diabetes Glycemic History (Model Feature Inputs)
                  </div>
                  <span className="text-[10px] font-mono text-sky-700">diabetic_data.csv schema</span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Insulin Regimen</label>
                    <select
                      name="insulin_use"
                      value={formData.insulin_use || 'Steady'}
                      onChange={handleChange}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-slate-900"
                    >
                      <option value="No">No Insulin</option>
                      <option value="Steady">Steady Regimen</option>
                      <option value="Up">Increased (Up)</option>
                      <option value="Down">Decreased (Down)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Recent HbA1c</label>
                    <input
                      type="text"
                      name="latest_a1c"
                      value={formData.latest_a1c || '8.4%'}
                      onChange={handleChange}
                      placeholder="e.g. 8.4%"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Peak Blood Glucose</label>
                    <input
                      type="text"
                      name="latest_glucose"
                      value={formData.latest_glucose || '178 mg/dL'}
                      onChange={handleChange}
                      placeholder="e.g. 178 mg/dL"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Year Diagnosed</label>
                    <input
                      type="text"
                      name="year_diagnosed"
                      value={formData.year_diagnosed || '2016'}
                      onChange={handleChange}
                      placeholder="e.g. 2016"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-slate-900"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 7: Admission / Initial Encounter */}
        {currentStep === 7 && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-5">
            <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-2">
              7. Inpatient Bed Assignment & Encounter Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Assigned Ward *</label>
                <select
                  name="current_ward"
                  value={formData.current_ward}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600 focus:bg-white text-slate-900 font-medium"
                >
                  <option value="Ward 5B">Ward 5B (Internal Medicine)</option>
                  <option value="Ward 4A">Ward 4A (Cardiology)</option>
                  <option value="Ward 3B">Ward 3B (Pulmonology)</option>
                  <option value="Ward 5A">Ward 5A (General Inpatient)</option>
                  <option value="ICU Step-down">ICU Step-down Unit</option>
                  <option value="Surgical 2B">Surgical 2B</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Room / Bed Assignment *</label>
                <input
                  type="text"
                  name="current_room"
                  required
                  value={formData.current_room || ''}
                  onChange={handleChange}
                  placeholder="e.g. 5B-214"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600 focus:bg-white text-slate-900 font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Attending Physician</label>
                <select
                  name="attending_physician"
                  value={formData.attending_physician || 'Dr. Sarah Mitchell'}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600 focus:bg-white text-slate-900"
                >
                  <option value="Dr. Sarah Mitchell">Dr. Sarah Mitchell (Internal Medicine)</option>
                  <option value="Dr. Robert Vance">Dr. Robert Vance (Cardiology)</option>
                  <option value="Dr. Marcus Chen">Dr. Marcus Chen (Endocrinology)</option>
                  <option value="Dr. Elena Rostova">Dr. Elena Rostova (Critical Care)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Step 8: Review & Confirm */}
        {currentStep === 8 && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6">
            <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-2">
              8. Registration Review & Consent Confirmation
            </h2>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <div className="font-bold text-slate-900 uppercase text-[11px]">Patient Identification</div>
                <div>Name: <span className="font-bold">{formData.first_name} {formData.middle_name} {formData.last_name}</span></div>
                <div>DOB / Age: <span className="font-semibold">{formData.dob} ({formData.age}yo) • {formData.sex}</span></div>
                <div>Blood Group: <span className="font-semibold">{formData.blood_group}</span></div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <div className="font-bold text-slate-900 uppercase text-[11px]">Location & Diagnosis</div>
                <div>Bed: <span className="font-bold">{formData.current_ward}, Room {formData.current_room}</span></div>
                <div>Primary Diagnosis: <span className="font-semibold">{formData.primary_diagnosis}</span></div>
                <div>Attending: <span className="font-semibold">{formData.attending_physician}</span></div>
              </div>
            </div>

            {/* Clinical Consent Checkboxes */}
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 space-y-2.5 text-xs">
              <div className="font-bold text-emerald-900 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                Hospital Regulatory & CDS Consents
              </div>
              <div className="space-y-1.5 text-slate-700">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="consent_treatment"
                    checked={formData.consent_treatment}
                    onChange={handleChange}
                    className="w-4 h-4 rounded text-sky-600"
                  />
                  <span>General Consent to Inpatient Medical Treatment signed and on file</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="consent_data"
                    checked={formData.consent_data}
                    onChange={handleChange}
                    className="w-4 h-4 rounded text-sky-600"
                  />
                  <span>HIPAA Notice of Privacy Practices acknowledged by patient / surrogate</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="consent_cds"
                    checked={formData.consent_cds}
                    onChange={handleChange}
                    className="w-4 h-4 rounded text-sky-600"
                  />
                  <span>Authorize Clinical Decision Support (CDS) 30-day readmission risk surveillance</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
          <div>
            {currentStep > 1 && (
              <button
                type="button"
                onClick={() => setCurrentStep(prev => prev - 1)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 font-bold text-xs flex items-center gap-1.5 transition"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Previous Step</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/patients')}
              className="px-4 py-2 text-slate-600 hover:text-slate-900 font-semibold text-xs transition"
            >
              Cancel
            </button>

            {currentStep < 8 ? (
              <button
                type="button"
                onClick={handleCheckDuplicatesAndNext}
                className="px-5 py-2 bg-sky-700 hover:bg-sky-800 text-white font-bold text-xs rounded-lg shadow-xs flex items-center gap-1.5 transition"
              >
                <span>Continue to {steps[currentStep].label}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-lg shadow-sm flex items-center gap-2 transition disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{loading ? 'Creating Record in MongoDB...' : 'Complete Patient Registration'}</span>
              </button>
            )}
          </div>
        </div>
      </form>

      {/* Duplicate Patient Alert Modal */}
      {showDuplicateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-300">
            <div className="flex items-center gap-2 text-amber-800 border-b border-slate-200 pb-3">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <h3 className="font-extrabold text-sm">Potential Duplicate Patient Found</h3>
            </div>

            <p className="text-xs text-slate-600">
              The Master Patient Index found {duplicateMatches.length} existing record(s) matching this name or date of birth:
            </p>

            <div className="space-y-2 max-h-56 overflow-y-auto">
              {duplicateMatches.map((m, idx) => {
                const targetId = m.id || m.patient_id;
                return (
                  <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="font-bold text-slate-900">{m.name || `${m.first_name} ${m.last_name}`}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{m.mrn} • DOB: {m.dob} • Risk: {m.risk_level || 'Moderate'}</div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => { setShowDuplicateModal(false); navigate(`/ehr/${targetId}`); }}
                        className="px-2.5 py-1 bg-slate-700 hover:bg-slate-800 text-white rounded text-[11px] font-bold"
                      >
                        Open Patient
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCreateEncounterForExisting(targetId)}
                        className="px-2.5 py-1 bg-sky-700 hover:bg-sky-800 text-white rounded text-[11px] font-bold"
                      >
                        Create New Encounter
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowDuplicateModal(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-100"
              >
                Review Details
              </button>
              <button
                type="button"
                onClick={() => { setShowDuplicateModal(false); setCurrentStep(2); }}
                className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-bold hover:bg-slate-900"
              >
                Continue Registration (Override)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
