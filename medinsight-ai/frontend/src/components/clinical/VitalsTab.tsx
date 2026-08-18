import React, { useState } from 'react';
import { Heart, Activity, Thermometer, Wind, Compass, Calendar, Sparkles, Droplet } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Observation } from '../../types/clinical';
import { useCopilot } from '../../contexts/CopilotContext';

interface VitalsTabProps {
  vitals: Observation[];
}

export const VitalsTab: React.FC<VitalsTabProps> = ({ vitals }) => {
  const [selectedVital, setSelectedVital] = useState<'HR' | 'BP' | 'SPO2' | 'TEMP' | 'GLU'>('HR');
  const { openCopilot } = useCopilot();

  const getVital = (code: string) => vitals.find((v) => v.code === code || v.observation_type === code);

  const hr = getVital('HR') || getVital('heart_rate');
  const bp = getVital('BP') || getVital('blood_pressure');
  const spo2 = getVital('SPO2') || getVital('oxygen_saturation');
  const temp = getVital('TEMP') || getVital('temperature');
  const glu = getVital('GLU') || getVital('blood_glucose');

  const hasAnyVitals = vitals && vitals.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-slate-900">Bedside Vital Signs & Clinical Observations</h2>
          <p className="text-xs text-slate-500">
            Recorded clinical observations stored in MongoDB. (Note: historical dataset contains laboratory metrics; bedside vitals are captured via clinical entry).
          </p>
        </div>
        <button
          onClick={() => openCopilot('VITALS', 'Summarize recent inpatient vital signs, highlight abnormal values, and assess hemodynamic stability.')}
          className="px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-300 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs self-start sm:self-auto transition"
        >
          <Sparkles className="w-3.5 h-3.5 text-sky-600" />
          <span>Ask Copilot Vitals Review</span>
        </button>
      </div>

      {/* Vital Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <button
          onClick={() => setSelectedVital('HR')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            selectedVital === 'HR'
              ? 'bg-sky-50 border-sky-400 ring-2 ring-sky-200'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Heart Rate</span>
            <Heart className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-xl font-black text-slate-900 mt-1">
            {hr?.value ? (
              <>
                {hr.value} <span className="text-xs font-normal text-slate-500">{hr.unit || 'bpm'}</span>
              </>
            ) : (
              <span className="text-xs text-slate-400 font-normal italic">Not Recorded</span>
            )}
          </div>
          <div className="text-[10px] text-slate-500 font-medium mt-1">
            {hr?.status || 'Observation source'}
          </div>
        </button>

        <button
          onClick={() => setSelectedVital('BP')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            selectedVital === 'BP'
              ? 'bg-sky-50 border-sky-400 ring-2 ring-sky-200'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Blood Pressure</span>
            <Activity className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-xl font-black text-slate-900 mt-1">
            {bp?.value_string || (bp?.value ? `${bp.value} mmHg` : <span className="text-xs text-slate-400 font-normal italic">Not Recorded</span>)}
          </div>
          <div className="text-[10px] text-slate-500 font-medium mt-1">
            {bp?.status || 'Observation source'}
          </div>
        </button>

        <button
          onClick={() => setSelectedVital('SPO2')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            selectedVital === 'SPO2'
              ? 'bg-sky-50 border-sky-400 ring-2 ring-sky-200'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase">SpO2 Oxygen</span>
            <Wind className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-xl font-black text-slate-900 mt-1">
            {spo2?.value ? (
              <>
                {spo2.value} <span className="text-xs font-normal text-slate-500">%</span>
              </>
            ) : (
              <span className="text-xs text-slate-400 font-normal italic">Not Recorded</span>
            )}
          </div>
          <div className="text-[10px] text-slate-500 font-medium mt-1">
            {spo2?.status || 'Pulse Oximeter'}
          </div>
        </button>

        <button
          onClick={() => setSelectedVital('TEMP')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            selectedVital === 'TEMP'
              ? 'bg-sky-50 border-sky-400 ring-2 ring-sky-200'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Temperature</span>
            <Thermometer className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-black text-slate-900 mt-1">
            {temp?.value ? (
              <>
                {temp.value} <span className="text-xs font-normal text-slate-500">{temp.unit || '°F'}</span>
              </>
            ) : (
              <span className="text-xs text-slate-400 font-normal italic">Not Recorded</span>
            )}
          </div>
          <div className="text-[10px] text-slate-500 font-medium mt-1">
            {temp?.status || 'Thermometry'}
          </div>
        </button>

        <button
          onClick={() => setSelectedVital('GLU')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            selectedVital === 'GLU'
              ? 'bg-sky-50 border-sky-400 ring-2 ring-sky-200'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Blood Glucose</span>
            <Droplet className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-xl font-black text-slate-900 mt-1">
            {glu?.value ? (
              <>
                {glu.value} <span className="text-xs font-normal text-slate-500">{glu.unit || 'mg/dL'}</span>
              </>
            ) : (
              <span className="text-xs text-slate-400 font-normal italic">Not Recorded</span>
            )}
          </div>
          <div className="text-[10px] text-slate-500 font-medium mt-1">
            {glu?.status || 'POC Blood Glucose'}
          </div>
        </button>
      </div>

      {/* Observation History Table */}
      <div className="clinical-card p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Clinical Observation History (MongoDB Source)
          </h3>
          <span className="text-[11px] text-slate-500 font-medium">{vitals.length} recorded entries</span>
        </div>

        {vitals.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px]">
                <tr>
                  <th className="px-3 py-2">Observation / Vital</th>
                  <th className="px-3 py-2">Value</th>
                  <th className="px-3 py-2">Unit</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Source</th>
                  <th className="px-3 py-2">Recorded At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {vitals.map((v, i) => (
                  <tr key={v.id || i} className="hover:bg-slate-50/60">
                    <td className="px-3 py-2 font-bold text-slate-900">{v.name || v.observation_type || v.code}</td>
                    <td className="px-3 py-2 font-mono">{v.value !== undefined && v.value !== null ? v.value : v.value_string}</td>
                    <td className="px-3 py-2 text-slate-500">{v.unit}</td>
                    <td className="px-3 py-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border">
                        {v.status || 'Recorded'}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-[10px] text-sky-800">{v.source || 'MANUAL_ENTRY'}</td>
                    <td className="px-3 py-2 text-slate-500 text-[11px]">
                      {v.recorded_at ? new Date(v.recorded_at).toLocaleString() : 'Recent'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-slate-400 space-y-1">
            <p className="text-xs font-semibold text-slate-600">No bedside vital observations recorded for this patient yet.</p>
            <p className="text-[11px] text-slate-400">
              The historical diabetic dataset provides laboratory data. Bedside telemetry can be recorded using the "Record Vitals" button in the overview panel.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
