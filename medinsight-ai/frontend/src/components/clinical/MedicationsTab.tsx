import React, { useState } from 'react';
import { Pill, AlertTriangle, CheckCircle, Clock, ShieldCheck, User } from 'lucide-react';
import { Medication } from '../../types/clinical';

interface MedicationsTabProps {
  medications: Medication[];
}

export const MedicationsTab: React.FC<MedicationsTabProps> = ({ medications }) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'held'>('all');

  const filteredMeds = medications.filter((m) => {
    if (activeFilter === 'active') return m.is_active;
    if (activeFilter === 'held') return !m.is_active || m.status === 'Held';
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Header & Medication Summary Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">Medication Regimen & Reconciliation</h2>
          <p className="text-xs text-slate-500">
            Active prescriptions, insulin dosage titrations, and held inpatient therapies.
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-200/70 p-1 rounded-lg">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
              activeFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All ({medications.length})
          </button>
          <button
            onClick={() => setActiveFilter('active')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
              activeFilter === 'active' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Active ({medications.filter((m) => m.is_active).length})
          </button>
          <button
            onClick={() => setActiveFilter('held')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
              activeFilter === 'held' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Held / Discontinued ({medications.filter((m) => !m.is_active || m.status === 'Held').length})
          </button>
        </div>
      </div>

      {/* Polypharmacy Notice */}
      {medications.filter((m) => m.is_active).length >= 8 && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong className="font-bold">Polypharmacy Alert:</strong> Patient is prescribed {medications.filter((m) => m.is_active).length} concurrent active medications. High priority for pharmacist discharge reconciliation.
            </span>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-200 text-amber-900 rounded">
            Care Coordinator Flagged
          </span>
        </div>
      )}

      {/* Medications Table */}
      <div className="clinical-card overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <th className="py-3 px-4">Medication Name</th>
              <th className="py-3 px-4">Dosage</th>
              <th className="py-3 px-4">Route</th>
              <th className="py-3 px-4">Frequency</th>
              <th className="py-3 px-4">Insulin Status</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Prescriber</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {filteredMeds.map((m) => (
              <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                <td className="py-3 px-4">
                  <div className="font-bold text-slate-900">{m.medication_name}</div>
                  <div className="text-[11px] text-slate-400">Started: {new Date(m.start_date).toLocaleDateString()}</div>
                </td>
                <td className="py-3 px-4 font-semibold text-slate-800">
                  {m.dose}
                </td>
                <td className="py-3 px-4 text-slate-600">
                  {m.route}
                </td>
                <td className="py-3 px-4 text-slate-600">
                  {m.frequency}
                </td>
                <td className="py-3 px-4">
                  {m.insulin_status !== 'None' ? (
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        m.insulin_status === 'Increased'
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : m.insulin_status === 'Steady'
                          ? 'bg-sky-100 text-sky-800 border border-sky-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {m.insulin_status}
                    </span>
                  ) : (
                    <span className="text-slate-400 text-[11px]">N/A</span>
                  )}
                </td>
                <td className="py-3 px-4">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      m.status === 'Active'
                        ? 'bg-emerald-100 text-emerald-800'
                        : m.status === 'Held'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {m.status}
                  </span>
                </td>
                <td className="py-3 px-4 text-slate-700">
                  {m.prescriber}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
