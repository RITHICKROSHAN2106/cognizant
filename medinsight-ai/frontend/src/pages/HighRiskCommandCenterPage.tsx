import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ShieldAlert,
  Filter,
  Search,
  CheckCircle2,
  Clock,
  UserCheck,
  Building,
  Calendar,
  ExternalLink,
  Pill,
  Sparkles
} from 'lucide-react';
import { patientService } from '../services/patientService';
import { Patient } from '../types/clinical';

export const HighRiskCommandCenterPage: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filterType, setFilterType] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchHighRisk = async () => {
      setIsLoading(true);
      try {
        const data = await patientService.getHighRiskPatients(
          filterType === 'all' ? undefined : filterType
        );
        setPatients(data);
      } catch (err) {
        console.error('Failed to load high risk command center:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHighRisk();
  }, [filterType]);

  const filteredPatients = patients.filter((p) => {
    return (
      p.first_name.toLowerCase().includes(search.toLowerCase()) ||
      p.last_name.toLowerCase().includes(search.toLowerCase()) ||
      p.mrn.toLowerCase().includes(search.toLowerCase()) ||
      (p.primary_diagnosis && p.primary_diagnosis.toLowerCase().includes(search.toLowerCase()))
    );
  });

  const criticalCount = patients.filter((p) => p.risk_level === 'Critical').length;
  const highCount = patients.filter((p) => p.risk_level === 'High').length;

  return (
    <div className="space-y-6">
      {/* Header & Command Center Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-600" />
            High-Risk Patient Command Center
          </h1>
          <p className="text-xs text-slate-500">
            Dedicated multidisciplinary coordination triage for patients at acute risk of 30-day readmission.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-xs text-rose-800 font-bold">
            <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping"></span>
            {criticalCount} Critical Priority
          </div>
          <div className="px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-xs text-amber-800 font-bold">
            {highCount} High Priority
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="clinical-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70">
        <div className="flex items-center gap-2">
          <div className="relative w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search high-risk queue..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'all', label: 'All High/Critical' },
            { id: 'critical', label: 'Critical Only' },
            { id: 'high', label: 'High Only' },
            { id: 'discharging_today', label: 'Discharging Soon' },
            { id: 'med_rec_pending', label: 'Med Rec Pending' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilterType(f.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filterType === f.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-200/80 border border-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* High-Risk Command Table */}
      <div className="clinical-card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-500 animate-pulse">
            Loading high-risk clinical surveillance queue...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Patient & MRN</th>
                  <th className="py-3.5 px-4">Primary Diagnosis</th>
                  <th className="py-3.5 px-4">Ward / Room</th>
                  <th className="py-3.5 px-4">Risk Probability</th>
                  <th className="py-3.5 px-4">Main Risk Driver</th>
                  <th className="py-3.5 px-4">Expected Discharge</th>
                  <th className="py-3.5 px-4">Intervention Status</th>
                  <th className="py-3.5 px-4">Care Coordinator</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredPatients.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">
                        {p.first_name} {p.last_name}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500">
                        {p.mrn} • Age: {p.age}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800 max-w-[200px] truncate">
                      {p.primary_diagnosis}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      <div>{p.current_ward || 'Ward 5B'}</div>
                      <div className="text-[10px] text-slate-400">Rm {p.current_room || '5B-214'}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-black inline-flex items-center gap-1 ${
                          p.risk_level === 'Critical'
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}
                      >
                        <ShieldAlert className="w-3.5 h-3.5" />
                        {Math.round((p.risk_probability || 0) * 100)}% {p.risk_level}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded font-medium text-[11px]">
                        {p.main_risk_driver || 'Prior Inpatient Admissions'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {p.expected_discharge || 'Tomorrow, 14:00'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          p.intervention_status === 'Completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : p.intervention_status === 'In Progress'
                            ? 'bg-sky-100 text-sky-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {p.intervention_status || 'Pending'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">
                      {p.care_coordinator || 'Alex Rivera, MSW'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => navigate(`/ehr/${p.id}`)}
                        className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-bold text-xs shadow-xs transition-colors"
                      >
                        Review EHR
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
