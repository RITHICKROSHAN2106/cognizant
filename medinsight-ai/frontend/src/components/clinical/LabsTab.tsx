import React, { useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, TrendingUp, Filter, Calendar, Sparkles } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { LabResult } from '../../types/clinical';
import { useCopilot } from '../../contexts/CopilotContext';

interface LabsTabProps {
  labs: LabResult[];
}

export const LabsTab: React.FC<LabsTabProps> = ({ labs }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const { openCopilot } = useCopilot();

  const categories = ['All', 'Diabetes Monitoring', 'Renal Function', 'Chemistry', 'Hematology', 'Liver Function'];

  const filteredLabs = selectedCategory === 'All'
    ? labs
    : labs.filter((l) => l.category === selectedCategory);

  // Longitudinal glucose trend data
  const glucoseTrend = [
    { day: 'Day 1 Admit', value: 320, ref: 99 },
    { day: 'Day 2', value: 285, ref: 99 },
    { day: 'Day 3', value: 240, ref: 99 },
    { day: 'Day 4', value: 228, ref: 99 },
    { day: 'Day 5', value: 218, ref: 99 },
    { day: 'Day 6', value: 215, ref: 99 },
    { day: 'Day 7 Current', value: 214, ref: 99 },
  ];

  return (
    <div className="space-y-6">
      {/* Header & Category Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">Laboratory Results & Diagnostic Biomarkers</h2>
          <p className="text-xs text-slate-500">
            Categorized diagnostic laboratory panels, reference intervals, and longitudinal trends.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => openCopilot('LABS', 'Synthesize the diagnostic lab results, glycemic control status, and kidney function markers.')}
            className="px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-300 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition"
          >
            <Sparkles className="w-3.5 h-3.5 text-sky-600" />
            <span>Ask Copilot Labs Review</span>
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 bg-slate-200/70 p-1 rounded-lg">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1 text-xs font-bold rounded-md transition ${
              selectedCategory === cat
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>


      {/* Glucose Glycemic Inpatient Trend Card */}
      <div className="clinical-card p-5">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200">
          <div>
            <div className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Glycemic Control Trend: Serum Fasting Glucose (mg/dL)
            </div>
            <div className="text-[11px] text-slate-500">
              Target Reference: 70 - 99 mg/dL • High Glycemic Readmission Risk
            </div>
          </div>
          <span className="text-xs font-bold px-2 py-0.5 bg-rose-100 text-rose-800 rounded">
            Latest: 214 mg/dL (Critical)
          </span>
        </div>

        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={glucoseTrend} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} domain={[0, 360]} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderRadius: '0.5rem', fontSize: '12px' }}
              />
              <Line type="monotone" dataKey="value" stroke="#e11d48" strokeWidth={2.5} dot={{ r: 4 }} name="Serum Glucose (mg/dL)" />
              <Line type="monotone" dataKey="ref" stroke="#10b981" strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="Upper Reference (99 mg/dL)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Laboratory Results Table */}
      <div className="clinical-card overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <th className="py-3 px-4">Test Name</th>
              <th className="py-3 px-4">Category</th>
              <th className="py-3 px-4">Result</th>
              <th className="py-3 px-4">Reference Interval</th>
              <th className="py-3 px-4">Flag</th>
              <th className="py-3 px-4">Previous Value</th>
              <th className="py-3 px-4">Collected Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {filteredLabs.map((l) => (
              <tr key={l.id} className="hover:bg-slate-50/80 transition-colors">
                <td className="py-3 px-4">
                  <div className="font-bold text-slate-900">{l.test_name}</div>
                  <div className="text-[10px] font-mono text-slate-400">LOINC: {l.test_code}</div>
                </td>
                <td className="py-3 px-4 text-slate-600">
                  {l.category}
                </td>
                <td className="py-3 px-4 font-black text-slate-900">
                  {l.value} <span className="font-normal text-slate-500 text-[11px]">{l.unit}</span>
                </td>
                <td className="py-3 px-4 text-slate-500">
                  {l.reference_min ?? '-'} – {l.reference_max ?? '-'} {l.unit}
                </td>
                <td className="py-3 px-4">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      l.flag === 'Critical'
                        ? 'bg-rose-100 text-rose-800 border border-rose-200'
                        : l.flag === 'High'
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : l.flag === 'Low'
                        ? 'bg-sky-100 text-sky-800 border border-sky-200'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {l.flag}
                  </span>
                </td>
                <td className="py-3 px-4 text-slate-500">
                  {l.previous_value ? `${l.previous_value} ${l.unit}` : '—'}
                </td>
                <td className="py-3 px-4 text-slate-500">
                  {new Date(l.collected_at).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
