import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HeartPulse,
  Users,
  Search,
  Calendar,
  Pill,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ChevronRight,
  TrendingDown,
  Building2,
  Activity,
  PhoneCall,
  RotateCcw,
  Clock,
  Plus
} from 'lucide-react';
import { postDischargeService } from '../services/postDischargeService';
import { PostDischargePatientSummary } from '../types/postDischarge';
import { PostDischargeDashboardSkeleton } from '../components/common/PostDischargeSkeletons';
import { useCopilot } from '../contexts/CopilotContext';


export const PostDischargePage: React.FC = () => {
  const navigate = useNavigate();
  const { openCopilot } = useCopilot();

  const [patients, setPatients] = useState<PostDischargePatientSummary[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({
    all: 0,
    high_risk: 0,
    overdue: 0,
    medication_pending: 0,
    readmitted: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'high_risk' | 'overdue' | 'medication_pending' | 'readmitted'>('all');
  const [selectedReadmissionPatient, setSelectedReadmissionPatient] = useState<PostDischargePatientSummary | null>(null);
  const [readmissionModalOpen, setReadmissionModalOpen] = useState(false);
  const [readmissionWard, setReadmissionWard] = useState('Ward 4A');
  const [readmissionDiag, setReadmissionDiag] = useState('Acute Hyperglycemic Crisis / Recurrent Admission');
  const [recordingReadmission, setRecordingReadmission] = useState(false);
  const [readmissionSuccess, setReadmissionSuccess] = useState<string | null>(null);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const c = await postDischargeService.getPostDischargeCounts();
        if (c) setCounts(c);
      } catch (err) {
        console.error('Failed to load post-discharge counts:', err);
      }
    };
    fetchCounts();
  }, []);

  useEffect(() => {
    const fetchCohort = async () => {
      try {
        setLoading(true);
        const data = await postDischargeService.getPostDischargePatients(activeFilter, searchQuery || undefined);
        setPatients(data);
      } catch (err) {
        console.error('Failed to load post-discharge cohort:', err);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(() => {
      fetchCohort();
    }, 200);

    return () => clearTimeout(debounce);
  }, [activeFilter, searchQuery]);

  const handleOpenReadmissionModal = (p: PostDischargePatientSummary) => {
    setSelectedReadmissionPatient(p);
    setReadmissionDiag(`Recurrent Inpatient Admission for ${p.primary_diagnosis}`);
    setReadmissionModalOpen(true);
  };

  const handleRecordReadmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReadmissionPatient) return;

    try {
      setRecordingReadmission(true);
      const res = await postDischargeService.createReadmissionEncounter(selectedReadmissionPatient.patient_id, {
        previous_discharge_date: selectedReadmissionPatient.discharge_date,
        ward: readmissionWard,
        room: '4A-201',
        department: 'Internal Medicine',
        primary_diagnosis: readmissionDiag,
        attending_physician: 'Dr. Sarah Mitchell, MD'
      });

      setReadmissionSuccess(res.message);
      setTimeout(() => {
        setReadmissionModalOpen(false);
        navigate(`/ehr/${selectedReadmissionPatient.patient_id}`);
      }, 1400);
    } catch (err: any) {
      console.error('Failed to record readmission:', err);
    } finally {
      setRecordingReadmission(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 text-slate-900">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2.5">
            <HeartPulse className="w-6 h-6 text-sky-700" />
            Post-Discharge Recovery & Continuity of Care
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Multidisciplinary follow-up command center tracking 30-day recovery timelines, medication continuity, nutrition, and rehabilitation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => openCopilot('POST_DISCHARGE_CARE', 'Summarize the active post-discharge monitoring queue and flag patients with overdue visits or medication delays.')}
            className="px-3.5 py-2 bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-300 rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-2xs"
          >
            <Sparkles className="w-4 h-4 text-sky-600" />
            <span>Copilot Population Review</span>
          </button>
        </div>
      </div>

      {/* 4 KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="clinical-card p-4 bg-white border border-slate-200 rounded-xl shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active Recovery Cohort</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{counts.all.toLocaleString()}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">30-Day Follow-Up Active</div>
        </div>

        <div className="clinical-card p-4 bg-white border border-slate-200 rounded-xl shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">High-Risk Surveillance</div>
          <div className="text-2xl font-black text-rose-700 mt-1">{counts.high_risk.toLocaleString()}</div>
          <div className="text-[10px] text-rose-600 font-semibold mt-0.5">Assigned Care Coordinator</div>
        </div>

        <div className="clinical-card p-4 bg-white border border-slate-200 rounded-xl shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Visits Due / Overdue</div>
          <div className="text-2xl font-black text-sky-800 mt-1">{counts.overdue.toLocaleString()}</div>
          <div className="text-[10px] text-sky-600 font-semibold mt-0.5">Urgent Follow-Up</div>
        </div>

        <div className="clinical-card p-4 bg-white border border-slate-200 rounded-xl shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Medication Issues</div>
          <div className="text-2xl font-black text-amber-700 mt-1">{counts.medication_pending.toLocaleString()}</div>
          <div className="text-[10px] text-amber-600 font-semibold mt-0.5">Reconciliation Required</div>
        </div>
      </div>

      {/* Controls & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search discharged patient name, MRN, diagnosis..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:border-sky-500"
          />
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {[
            { id: 'all', label: 'All Discharged', count: counts.all },
            { id: 'high_risk', label: 'High Risk', count: counts.high_risk },
            { id: 'overdue', label: 'Visits Due', count: counts.overdue },
            { id: 'medication_pending', label: 'Med Issues', count: counts.medication_pending },
            { id: 'readmitted', label: 'Readmitted', count: counts.readmitted }
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                activeFilter === f.id
                  ? 'bg-sky-700 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <span>{f.label}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                activeFilter === f.id ? 'bg-sky-900 text-white' : 'bg-slate-200 text-slate-600'
              }`}>
                {f.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Patient Queue Table */}
      {loading ? (
        <PostDischargeDashboardSkeleton />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold uppercase text-[10px]">
                  <th className="p-3.5">Patient Details</th>
                  <th className="p-3.5">Discharge Date</th>
                  <th className="p-3.5">Risk Score</th>
                  <th className="p-3.5">Recovery Status</th>
                  <th className="p-3.5">Next Follow-Up</th>
                  <th className="p-3.5">Medication</th>
                  <th className="p-3.5">Nutrition / Rehab</th>
                  <th className="p-3.5">Care Coordinator</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {patients.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-500">
                      No patients match the selected post-discharge criteria.
                    </td>
                  </tr>
                ) : (
                  patients.map((p) => (
                    <tr key={p.patient_id} className="hover:bg-slate-50/80 transition">
                      <td className="p-3.5 font-bold text-slate-900">
                        <button
                          onClick={() => navigate(`/ehr/${p.patient_id}`)}
                          className="hover:text-sky-700 text-left font-bold"
                        >
                          <div>{p.patient_name}</div>
                          <div className="text-[10px] text-slate-400 font-mono font-normal">
                            {p.mrn} • {p.age}y {p.sex}
                          </div>
                        </button>
                      </td>
                      <td className="p-3.5 text-slate-600 font-mono">{p.discharge_date}</td>
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            p.discharge_risk_level === 'Critical'
                              ? 'bg-rose-100 text-rose-800'
                              : p.discharge_risk_level === 'High'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {Math.round(p.discharge_risk_score * 100)}% {p.discharge_risk_level}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            p.recovery_status === 'Improving'
                              ? 'bg-emerald-100 text-emerald-800'
                              : p.recovery_status === 'Readmitted'
                              ? 'bg-purple-100 text-purple-900 font-bold border border-purple-300'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {p.recovery_status}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <div className="font-semibold text-slate-900">{p.next_visit_date}</div>
                        <div className="text-[10px] text-slate-500">{p.next_visit_status}</div>
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            p.medication_supply_status === 'Supplied'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {p.medication_supply_status}
                        </span>
                      </td>
                      <td className="p-3.5 text-[11px] text-slate-600">
                        <div>Diet: {p.diet_plan_status}</div>
                        <div>Rehab: {p.rehab_status}</div>
                      </td>
                      <td className="p-3.5 text-slate-700 font-medium">{p.care_coordinator}</td>
                      <td className="p-3.5 text-right space-x-1.5">
                        <button
                          onClick={() => navigate(`/ehr/${p.patient_id}`)}
                          className="px-2.5 py-1 bg-sky-700 hover:bg-sky-800 text-white rounded-lg text-xs font-bold transition shadow-2xs"
                        >
                          EHR
                        </button>
                        <button
                          onClick={() => handleOpenReadmissionModal(p)}
                          className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold transition"
                          title="Record Readmission Encounter"
                        >
                          Readmit
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Record Readmission Encounter Modal */}
      {readmissionModalOpen && selectedReadmissionPatient && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-amber-600" />
                <span>Record Readmission Encounter (Existing Patient)</span>
              </div>
              <button
                onClick={() => setReadmissionModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            {readmissionSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg text-xs font-bold">
                ✓ {readmissionSuccess} Redirecting to EHR...
              </div>
            )}

            <form onSubmit={handleRecordReadmission} className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <div className="font-bold text-slate-900">
                  {selectedReadmissionPatient.patient_name} ({selectedReadmissionPatient.mrn})
                </div>
                <div className="text-slate-500">
                  Previous Discharge Date: <strong>{selectedReadmissionPatient.discharge_date}</strong>
                </div>
                <div className="text-amber-800 font-semibold">
                  ⚠️ System will auto-evaluate if readmission is within the 30-day CMS window.
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Admitting Ward & Room</label>
                <input
                  type="text"
                  value={readmissionWard}
                  onChange={(e) => setReadmissionWard(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Readmission Chief Complaint / Diagnosis</label>
                <textarea
                  rows={2}
                  value={readmissionDiag}
                  onChange={(e) => setReadmissionDiag(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReadmissionModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={recordingReadmission}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{recordingReadmission ? 'Recording...' : 'Confirm Readmission'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
