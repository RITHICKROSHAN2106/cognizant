import React from 'react';
import {
  Activity,
  Calendar,
  Clock,
  Heart,
  Stethoscope,
  ShieldAlert,
  Pill,
  FileText,
  Thermometer,
  Wind,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { Patient, Encounter, Diagnosis, Observation, LabResult, Medication } from '../../types/clinical';

interface SummaryTabProps {
  patient: Patient;
  encounters: Encounter[];
  diagnoses: Diagnosis[];
  vitals: Observation[];
  labs: LabResult[];
  medications: Medication[];
  onNavigateTab: (tabId: string) => void;
}

export const SummaryTab: React.FC<SummaryTabProps> = ({
  patient,
  encounters,
  diagnoses,
  vitals,
  labs,
  medications,
  onNavigateTab,
}) => {
  const currentEnc = encounters.find((e) => e.is_current) || encounters[0];
  const activeMeds = medications.filter((m) => m.is_active);
  const criticalLabs = labs.filter((l) => l.flag === 'Critical' || l.flag === 'High');

  // Helper to find latest vital by code
  const getVital = (code: string) => {
    return vitals.find((v) => v.code === code);
  };

  const hr = getVital('HR');
  const bp = getVital('BP');
  const spo2 = getVital('SPO2');
  const temp = getVital('TEMP');
  const rr = getVital('RR');
  const bmi = getVital('BMI');

  return (
    <div className="space-y-6">
      {/* Top Clinical Alert & Risk Banner */}
      <div className="bg-gradient-to-r from-rose-50 to-amber-50 rounded-xl p-4 border border-rose-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-rose-600 text-white rounded-lg shrink-0 mt-0.5">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-rose-800 flex items-center gap-2">
              <span>Readmission Risk Assessment</span>
              <span className="px-2 py-0.5 bg-rose-200/80 text-rose-900 rounded font-black text-[10px]">
                {Math.round((patient.risk_probability || 0.72) * 100)}% CRITICAL RISK
              </span>
            </div>
            <p className="text-xs text-slate-700 mt-1">
              Top risk drivers: <span className="font-semibold">{patient.main_risk_driver || 'Prior Inpatient Admissions'}</span>, insulin titration, and elevated HbA1c (9.2%). Recommended for targeted transitional care coordination.
            </p>
          </div>
        </div>
        <button
          onClick={() => onNavigateTab('risk')}
          className="px-3.5 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-semibold shrink-0 transition-colors shadow-xs"
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
              {currentEnc?.encounter_id || 'ENC-2026-008412'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <div className="text-[11px] text-slate-400 font-medium uppercase">Admitted</div>
              <div className="font-semibold text-slate-800 mt-0.5">
                {currentEnc?.admission_date ? new Date(currentEnc.admission_date).toLocaleDateString() : '7 days ago'}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400 font-medium uppercase">Admission Source</div>
              <div className="font-semibold text-slate-800 mt-0.5">
                {currentEnc?.admission_source || 'Emergency Department'}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400 font-medium uppercase">Length of Stay</div>
              <div className="font-semibold text-slate-800 mt-0.5">
                {currentEnc?.length_of_stay || patient.length_of_stay || 7} Days
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400 font-medium uppercase">Department / Ward</div>
              <div className="font-semibold text-slate-800 mt-0.5">
                {currentEnc?.department || 'Internal Medicine'} ({currentEnc?.ward || 'Ward 5B'})
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400 font-medium uppercase">Room / Bed</div>
              <div className="font-semibold text-slate-800 mt-0.5">
                Room {currentEnc?.room || patient.current_room || '5B-214'}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400 font-medium uppercase">Expected Discharge</div>
              <div className="font-semibold text-slate-800 mt-0.5 text-sky-700">
                {patient.expected_discharge || 'Tomorrow, 14:00'}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="text-[11px] text-slate-400 font-medium uppercase mb-1">Primary Admitting Diagnosis</div>
            <div className="text-xs font-bold text-slate-900">
              {currentEnc?.primary_diagnosis || patient.primary_diagnosis || 'Type 2 Diabetes Mellitus with Hyperglycemia'}
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
                {hr?.value || 76} <span className="text-[10px] font-normal text-slate-500">{hr?.unit || 'bpm'}</span>
              </div>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
              <div className="text-[10px] uppercase font-bold text-slate-400">Blood Pressure</div>
              <div className="text-base font-bold text-slate-800 mt-0.5">
                {bp?.value_string || '134/82'} <span className="text-[10px] font-normal text-slate-500">mmHg</span>
              </div>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
              <div className="text-[10px] uppercase font-bold text-slate-400">SpO2 Saturation</div>
              <div className="text-base font-bold text-slate-800 mt-0.5">
                {spo2?.value || 98} <span className="text-[10px] font-normal text-slate-500">%</span>
              </div>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
              <div className="text-[10px] uppercase font-bold text-slate-400">Temperature</div>
              <div className="text-base font-bold text-slate-800 mt-0.5">
                {temp?.value || 36.6} <span className="text-[10px] font-normal text-slate-500">°C</span>
              </div>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
              <div className="text-[10px] uppercase font-bold text-slate-400">Resp Rate</div>
              <div className="text-base font-bold text-slate-800 mt-0.5">
                {rr?.value || 16} <span className="text-[10px] font-normal text-slate-500">/min</span>
              </div>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
              <div className="text-[10px] uppercase font-bold text-slate-400">BMI</div>
              <div className="text-base font-bold text-slate-800 mt-0.5">
                {bmi?.value || 31.2} <span className="text-[10px] font-normal text-slate-500">kg/m²</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Active Diagnoses, Abnormal Labs, Active Medications */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Diagnoses Card */}
        <div className="clinical-card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-sky-600" />
                Active Diagnoses ({diagnoses.length})
              </h3>
              <button onClick={() => onNavigateTab('diagnoses')} className="text-xs text-sky-600 font-semibold">
                All →
              </button>
            </div>
            <div className="space-y-2">
              {diagnoses.slice(0, 4).map((d) => (
                <div key={d.id} className="p-2 rounded-md bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-sky-700">{d.icd_code}</span>
                    <span className="text-[10px] font-semibold px-1.5 py-0.2 bg-slate-200 text-slate-700 rounded">
                      {d.diagnosis_type}
                    </span>
                  </div>
                  <div className="text-xs text-slate-800 font-medium mt-0.5 truncate">{d.description}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* High / Critical Labs Card */}
        <div className="clinical-card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Key Lab Results ({criticalLabs.length} Flagged)
              </h3>
              <button onClick={() => onNavigateTab('labs')} className="text-xs text-sky-600 font-semibold">
                All →
              </button>
            </div>
            <div className="space-y-2">
              {labs.slice(0, 4).map((l) => (
                <div key={l.id} className="p-2 rounded-md bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-slate-800">{l.test_name}</div>
                    <div className="text-[11px] text-slate-500">Ref: {l.reference_min ?? '-'}-{l.reference_max ?? '-'} {l.unit}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-slate-900">{l.value} {l.unit}</div>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      l.flag === 'Critical' ? 'bg-rose-100 text-rose-800' : l.flag === 'High' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {l.flag}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Active Medications Card */}
        <div className="clinical-card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Pill className="w-4 h-4 text-teal-600" />
                Active Regimen ({activeMeds.length} Meds)
              </h3>
              <button onClick={() => onNavigateTab('medications')} className="text-xs text-sky-600 font-semibold">
                All →
              </button>
            </div>
            <div className="space-y-2">
              {activeMeds.slice(0, 4).map((m) => (
                <div key={m.id} className="p-2 rounded-md bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 truncate">{m.medication_name}</span>
                    {m.insulin_status !== 'None' && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 bg-rose-100 text-rose-700 rounded">
                        Insulin: {m.insulin_status}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {m.dose} • {m.route} • {m.frequency}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
