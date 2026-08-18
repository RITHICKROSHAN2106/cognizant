import React from 'react';
import {
  ShieldAlert,
  Activity,
  Heart,
  FileText,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  User,
  ArrowRight,
  Pill,
  FileCheck
} from 'lucide-react';
import {
  Patient,
  Encounter,
  Diagnosis,
  Observation,
  LabResult,
  Medication,
  ClinicalNote,
  DischargePlan,
  Recommendation
} from '../../types/clinical';

interface SummaryTabProps {
  patient: Patient;
  encounters?: Encounter[];
  diagnoses: Diagnosis[];
  vitals: Observation[];
  labs: LabResult[];
  medications: Medication[];
  notes?: ClinicalNote[];
  dischargePlan?: DischargePlan | null;
  recommendations?: Recommendation[];
  onNavigateTab: (tabId: string) => void;
}

export const SummaryTab: React.FC<SummaryTabProps> = ({
  patient,
  encounters = [],
  diagnoses,
  vitals,
  labs,
  medications,
  notes = [],
  dischargePlan = null,
  recommendations = [],
  onNavigateTab
}) => {
  const getVital = (code: string) => vitals.find((v) => v.code === code || v.observation_type === code);

  const hr = getVital('HR') || getVital('heart_rate');
  const bp = getVital('BP') || getVital('blood_pressure');
  const spo2 = getVital('SPO2') || getVital('oxygen_saturation');
  const temp = getVital('TEMP') || getVital('temperature');
  const rr = getVital('RR') || getVital('respiratory_rate');
  const glu = getVital('GLU') || getVital('blood_glucose');

  const hasRisk = typeof patient.risk_probability === 'number';
  const riskPercent = hasRisk ? Math.round(patient.risk_probability! * 100) : null;
  const riskLevel = patient.risk_level || (hasRisk ? (patient.risk_probability! >= 0.7 ? 'Critical' : patient.risk_probability! >= 0.45 ? 'High' : patient.risk_probability! >= 0.25 ? 'Moderate' : 'Low') : 'Not Assessed');

  return (
    <div className="space-y-6">
      {/* Top Clinical Alert & Risk Banner */}
      <div className={`rounded-xl p-4 border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
        riskLevel === 'Critical'
          ? 'bg-rose-50 border-rose-200'
          : riskLevel === 'High'
          ? 'bg-amber-50 border-amber-200'
          : riskLevel === 'Moderate'
          ? 'bg-blue-50 border-blue-200'
          : 'bg-emerald-50 border-emerald-200'
      }`}>
        <div className="flex items-start gap-3">
          <div className={`p-2 text-white rounded-lg shrink-0 mt-0.5 ${
            riskLevel === 'Critical' ? 'bg-rose-600' : riskLevel === 'High' ? 'bg-amber-600' : 'bg-sky-600'
          }`}>
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <span>Readmission Risk Assessment</span>
              <span className={`px-2 py-0.5 rounded font-black text-[10px] uppercase ${
                riskLevel === 'Critical'
                  ? 'bg-rose-200 text-rose-900'
                  : riskLevel === 'High'
                  ? 'bg-amber-200 text-amber-900'
                  : 'bg-slate-200 text-slate-800'
              }`}>
                {riskPercent !== null ? `${riskPercent}% ${riskLevel} Risk` : 'Not Assessed'}
              </span>
            </div>
            <p className="text-xs text-slate-700 mt-1">
              Top risk driver: <span className="font-semibold">{patient.main_risk_driver || 'Historical Inpatient Utilization'}</span>. Assessment powered by LightGBM + XGBoost ensemble pipeline.
            </p>
          </div>
        </div>
        <button
          onClick={() => onNavigateTab('risk')}
          className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shrink-0 transition-colors shadow-xs"
        >
          View Full AI Risk Analysis
        </button>
      </div>

      {/* Grid: Current Admission & Quick Vitals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Current Admission Summary Card */}
        <div className="lg:col-span-2 clinical-card p-5">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-sky-600" />
              Current Inpatient Admission
            </h3>
            <span className="text-xs font-mono font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 rounded">
              {patient.current_encounter_id || `ENC-${patient.id}`}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <div className="text-slate-400 font-semibold">Primary Diagnosis</div>
              <div className="font-bold text-slate-900 mt-0.5 truncate" title={patient.primary_diagnosis}>
                {patient.primary_diagnosis || 'Type 2 Diabetes Mellitus'}
              </div>
            </div>
            <div>
              <div className="text-slate-400 font-semibold">Admission Status</div>
              <div className="font-bold text-slate-900 mt-0.5">{patient.admission_status || 'Inpatient'}</div>
            </div>
            <div>
              <div className="text-slate-400 font-semibold">Current Location</div>
              <div className="font-bold text-slate-900 mt-0.5">
                {patient.current_ward || 'Inpatient Ward'} ({patient.current_room || 'Bed 102'})
              </div>
            </div>
            <div>
              <div className="text-slate-400 font-semibold">Length of Stay</div>
              <div className="font-bold text-slate-900 mt-0.5">{patient.length_of_stay || 1} Days</div>
            </div>
          </div>
        </div>

        {/* Vital Signs Grid Card */}
        <div className="clinical-card p-5">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Heart className="w-4 h-4 text-rose-500" />
              Latest Vitals
            </h3>
            <button
              onClick={() => onNavigateTab('vitals')}
              className="text-xs text-sky-600 hover:text-sky-800 font-semibold"
            >
              Trends →
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
              <div className="text-[10px] uppercase font-bold text-slate-400">Heart Rate</div>
              <div className="text-base font-bold text-slate-800 mt-0.5">
                {hr?.value ? (
                  <>
                    {hr.value} <span className="text-[10px] font-normal text-slate-500">{hr.unit || 'bpm'}</span>
                  </>
                ) : (
                  <span className="text-xs text-slate-400 font-normal italic">Not Recorded</span>
                )}
              </div>
            </div>

            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
              <div className="text-[10px] uppercase font-bold text-slate-400">Blood Pressure</div>
              <div className="text-base font-bold text-slate-800 mt-0.5">
                {bp?.value_string || (bp?.value ? `${bp.value} mmHg` : <span className="text-xs text-slate-400 font-normal italic">Not Recorded</span>)}
              </div>
            </div>

            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
              <div className="text-[10px] uppercase font-bold text-slate-400">SpO2 Saturation</div>
              <div className="text-base font-bold text-slate-800 mt-0.5">
                {spo2?.value ? (
                  <>
                    {spo2.value} <span className="text-[10px] font-normal text-slate-500">%</span>
                  </>
                ) : (
                  <span className="text-xs text-slate-400 font-normal italic">Not Recorded</span>
                )}
              </div>
            </div>

            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
              <div className="text-[10px] uppercase font-bold text-slate-400">Temperature</div>
              <div className="text-base font-bold text-slate-800 mt-0.5">
                {temp?.value ? (
                  <>
                    {temp.value} <span className="text-[10px] font-normal text-slate-500">{temp.unit || '°F'}</span>
                  </>
                ) : (
                  <span className="text-xs text-slate-400 font-normal italic">Not Recorded</span>
                )}
              </div>
            </div>

            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
              <div className="text-[10px] uppercase font-bold text-slate-400">Resp Rate</div>
              <div className="text-base font-bold text-slate-800 mt-0.5">
                {rr?.value ? (
                  <>
                    {rr.value} <span className="text-[10px] font-normal text-slate-500">/min</span>
                  </>
                ) : (
                  <span className="text-xs text-slate-400 font-normal italic">Not Recorded</span>
                )}
              </div>
            </div>

            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
              <div className="text-[10px] uppercase font-bold text-slate-400">Blood Glucose</div>
              <div className="text-base font-bold text-slate-800 mt-0.5">
                {glu?.value ? (
                  <>
                    {glu.value} <span className="text-[10px] font-normal text-slate-500">{glu.unit || 'mg/dL'}</span>
                  </>
                ) : (
                  <span className="text-xs text-slate-400 font-normal italic">Not Recorded</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Active Diagnoses, Abnormal Labs, Active Medications */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Diagnoses Card */}
        <div className="clinical-card p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-sky-600" />
              Active Diagnoses
            </h3>
            <span className="text-xs font-semibold text-slate-500">{diagnoses.length} active</span>
          </div>

          <div className="space-y-2">
            {diagnoses.length > 0 ? (
              diagnoses.slice(0, 4).map((diag) => (
                <div key={diag.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-slate-700 text-[11px]">{diag.icd_code}</span>
                    <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 bg-slate-200 rounded text-slate-700">
                      {diag.diagnosis_type}
                    </span>
                  </div>
                  <div className="font-medium text-slate-900 mt-1 truncate" title={diag.description}>
                    {diag.description}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-xs text-slate-400 italic py-4 text-center">No active diagnoses recorded</div>
            )}
          </div>
        </div>

        {/* Labs Card */}
        <div className="clinical-card p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-purple-600" />
              Laboratory Values
            </h3>
            <span className="text-xs font-semibold text-slate-500">{labs.length} tests</span>
          </div>

          <div className="space-y-2">
            {labs.length > 0 ? (
              labs.slice(0, 4).map((lab) => (
                <div key={lab.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900">{lab.test_name}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      lab.flag === 'High' ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {lab.flag}
                    </span>
                  </div>
                  <div className="text-slate-600 mt-1 font-mono text-[11px]">
                    {lab.value} {lab.unit}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-xs text-slate-400 italic py-4 text-center">No laboratory results recorded</div>
            )}
          </div>
        </div>

        {/* Medications Card */}
        <div className="clinical-card p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Pill className="w-4 h-4 text-emerald-600" />
              Active Medications
            </h3>
            <span className="text-xs font-semibold text-slate-500">{medications.length} active</span>
          </div>

          <div className="space-y-2">
            {medications.length > 0 ? (
              medications.slice(0, 4).map((med) => (
                <div key={med.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                  <div className="font-bold text-slate-900">{med.medication_name}</div>
                  <div className="text-slate-600 text-[11px] mt-0.5">
                    {med.dose} • {med.frequency}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-xs text-slate-400 italic py-4 text-center">No active medications recorded</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
