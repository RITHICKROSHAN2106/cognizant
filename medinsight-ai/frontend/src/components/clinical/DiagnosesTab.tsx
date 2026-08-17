import React, { useState } from 'react';
import { FileText, Search, Plus, Filter, AlertCircle, Calendar } from 'lucide-react';
import { Diagnosis } from '../../types/clinical';

interface DiagnosesTabProps {
  diagnoses: Diagnosis[];
}

export const DiagnosesTab: React.FC<DiagnosesTabProps> = ({ diagnoses }) => {
  const [filterType, setFilterType] = useState<string>('All');
  const [search, setSearch] = useState('');

  const filtered = diagnoses.filter((d) => {
    const matchesFilter = filterType === 'All' || d.diagnosis_type === filterType;
    const matchesSearch =
      d.description.toLowerCase().includes(search.toLowerCase()) ||
      d.icd_code.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-4">
      {/* Header & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">Clinical Diagnoses & Problem List</h2>
          <p className="text-xs text-slate-500">
            Standardized ICD-10 clinical diagnoses and chronic condition tracking.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Filter ICD / description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="text-xs bg-white border border-slate-300 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-sky-500 text-slate-700"
          >
            <option value="All">All Types</option>
            <option value="Primary">Primary</option>
            <option value="Secondary">Secondary</option>
            <option value="Chronic">Chronic</option>
          </select>
        </div>
      </div>

      {/* Diagnoses Table */}
      <div className="clinical-card overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <th className="py-3 px-4">ICD-10 Code</th>
              <th className="py-3 px-4">Diagnosis Description</th>
              <th className="py-3 px-4">Type</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Diagnosed Date</th>
              <th className="py-3 px-4">Diagnosing Clinician</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {filtered.map((d) => (
              <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                <td className="py-3 px-4 font-mono font-bold text-sky-700">
                  {d.icd_code}
                </td>
                <td className="py-3 px-4 font-semibold text-slate-800">
                  {d.description}
                </td>
                <td className="py-3 px-4">
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                      d.diagnosis_type === 'Primary'
                        ? 'bg-sky-100 text-sky-800'
                        : d.diagnosis_type === 'Chronic'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {d.diagnosis_type}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    {d.status}
                  </span>
                </td>
                <td className="py-3 px-4 text-slate-500">
                  {new Date(d.diagnosed_at).toLocaleDateString()}
                </td>
                <td className="py-3 px-4 text-slate-700">
                  {d.clinician}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
