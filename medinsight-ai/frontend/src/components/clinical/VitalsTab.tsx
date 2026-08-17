import React, { useState } from 'react';
import { Heart, Activity, Thermometer, Wind, Compass, Calendar } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Observation } from '../../types/clinical';

interface VitalsTabProps {
  vitals: Observation[];
}

export const VitalsTab: React.FC<VitalsTabProps> = ({ vitals }) => {
  const [selectedVital, setSelectedVital] = useState<'HR' | 'BP' | 'SPO2' | 'TEMP'>('HR');

  // Prepare trend data
  const chartData = [
    { time: 'Day 1 Admit', HR: 98, systolic: 158, diastolic: 94, SPO2: 96, TEMP: 37.4, RR: 20 },
    { time: 'Day 2', HR: 92, systolic: 152, diastolic: 90, SPO2: 97, TEMP: 37.1, RR: 18 },
    { time: 'Day 3', HR: 86, systolic: 148, diastolic: 88, SPO2: 97, TEMP: 36.9, RR: 18 },
    { time: 'Day 4', HR: 84, systolic: 142, diastolic: 88, SPO2: 98, TEMP: 36.8, RR: 16 },
    { time: 'Day 5', HR: 80, systolic: 138, diastolic: 84, SPO2: 98, TEMP: 36.7, RR: 16 },
    { time: 'Day 6', HR: 78, systolic: 136, diastolic: 82, SPO2: 98, TEMP: 36.6, RR: 16 },
    { time: 'Day 7 Current', HR: 76, systolic: 134, diastolic: 82, SPO2: 98, TEMP: 36.6, RR: 16 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900">Longitudinal Vital Signs & Observations</h2>
          <p className="text-xs text-slate-500">
            Real-time physiologic observations, continuous telemetry, and historical trend trajectories.
          </p>
        </div>
      </div>

      {/* Vital Selector Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
            76 <span className="text-xs font-normal text-slate-500">bpm</span>
          </div>
          <div className="text-[10px] text-emerald-600 font-semibold mt-1">Normal Sinus Rhythm</div>
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
            134/82 <span className="text-xs font-normal text-slate-500">mmHg</span>
          </div>
          <div className="text-[10px] text-slate-500 font-semibold mt-1">Stabilizing on Lisinopril</div>
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
            98 <span className="text-xs font-normal text-slate-500">%</span>
          </div>
          <div className="text-[10px] text-emerald-600 font-semibold mt-1">Room Air</div>
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
            36.6 <span className="text-xs font-normal text-slate-500">°C</span>
          </div>
          <div className="text-[10px] text-emerald-600 font-semibold mt-1">Afebrile</div>
        </button>
      </div>

      {/* Interactive Trend Chart */}
      <div className="clinical-card p-5">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200">
          <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Inpatient Longitudinal Trajectory: {selectedVital === 'HR' ? 'Heart Rate (bpm)' : selectedVital === 'BP' ? 'Blood Pressure (Systolic / Diastolic mmHg)' : selectedVital === 'SPO2' ? 'SpO2 Oxygen Saturation (%)' : 'Temperature (°C)'}
          </div>
          <span className="text-[11px] font-medium text-slate-500">7-Day Continuous Recording</span>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} domain={['auto', 'auto']} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderRadius: '0.5rem', fontSize: '12px' }}
              />
              {selectedVital === 'HR' && (
                <Line type="monotone" dataKey="HR" stroke="#e11d48" strokeWidth={2.5} dot={{ r: 4 }} name="Heart Rate (bpm)" />
              )}
              {selectedVital === 'BP' && (
                <>
                  <Line type="monotone" dataKey="systolic" stroke="#0284c7" strokeWidth={2.5} dot={{ r: 4 }} name="Systolic BP (mmHg)" />
                  <Line type="monotone" dataKey="diastolic" stroke="#0d9488" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 4 }} name="Diastolic BP (mmHg)" />
                </>
              )}
              {selectedVital === 'SPO2' && (
                <Line type="monotone" dataKey="SPO2" stroke="#0d9488" strokeWidth={2.5} dot={{ r: 4 }} name="SpO2 (%)" />
              )}
              {selectedVital === 'TEMP' && (
                <Line type="monotone" dataKey="TEMP" stroke="#d97706" strokeWidth={2.5} dot={{ r: 4 }} name="Temperature (°C)" />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
