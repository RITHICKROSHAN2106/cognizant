import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  Search,
  CheckCircle2,
  Clock,
  Calendar,
  Pill,
  Apple,
  Activity,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  HeartPulse,
  PhoneCall,
  AlertTriangle,
  FileCheck,
  TrendingDown,
  Building2,
  UserCheck,
  ChevronRight,
  ExternalLink,
  Flame,
  Plus
} from 'lucide-react';
import { patientService } from '../services/patientService';
import { postDischargeService } from '../services/postDischargeService';
import { Patient } from '../types/clinical';
import { PostDischargePatientSummary, PostDischargeCarePlan } from '../types/postDischarge';
import { useCopilot } from '../contexts/CopilotContext';

export const HighRiskCommandCenterPage: React.FC = () => {
  const navigate = useNavigate();
  const { openCopilot } = useCopilot();

  // Active Module Tab
  const [activeModule, setActiveModule] = useState<
    'inpatient_queue' | 'post_discharge' | 'weekly_visits' | 'med_supply' | 'nutrition' | 'rehabilitation' | 'insurance_er' | 'readmission_db'
  >('inpatient_queue');

  // Inpatient queue state
  const [inpatientList, setInpatientList] = useState<Patient[]>([]);
  const [inpatientFilter, setInpatientFilter] = useState<string>('all');
  const [inpatientSearch, setInpatientSearch] = useState('');
  const [inpatientLoading, setInpatientLoading] = useState(true);

  // Post-discharge cohort state
  const [postDischargeList, setPostDischargeList] = useState<PostDischargePatientSummary[]>([]);
  const [postDischargeFilter, setPostDischargeFilter] = useState<'all' | 'high_risk' | 'overdue' | 'medication_pending' | 'readmitted'>('all');
  const [postDischargeSearch, setPostDischargeSearch] = useState('');
  const [postDischargeLoading, setPostDischargeLoading] = useState(true);

  // Dynamic database counts
  const [counts, setCounts] = useState<Record<string, number>>({
    all: 500,
    high_risk: 250,
    overdue: 120,
    medication_pending: 180,
    readmitted: 95
  });

  // Selected patient for detail inspection / 1-click readmit
  const [selectedPatientPlan, setSelectedPatientPlan] = useState<PostDischargeCarePlan | null>(null);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [planLoading, setPlanLoading] = useState(false);

  // 1-Click Readmit Modal State (No need to re-register existing patient)
  const [readmissionModalOpen, setReadmissionModalOpen] = useState(false);
  const [targetPatient, setTargetPatient] = useState<{ id: number; name: string; mrn: string; diagnosis: string } | null>(null);
  const [readmitWard, setReadmitWard] = useState('Ward 4A');
  const [readmitRoom, setReadmitRoom] = useState('4A-108');
  const [readmitDiag, setReadmitDiag] = useState('Acute Recurrent Inpatient Readmission');
  const [recordingReadmission, setRecordingReadmission] = useState(false);
  const [readmissionSuccess, setReadmissionSuccess] = useState<string | null>(null);

  // Fetch KPI counts
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

  // Fetch Inpatient High-Risk Cohort
  useEffect(() => {
    const fetchInpatients = async () => {
      try {
        setInpatientLoading(true);
        const data = await patientService.getHighRiskPatients(
          inpatientFilter === 'all' ? undefined : inpatientFilter
        );
        setInpatientList(data);
      } catch (err) {
        console.error('Failed to load high risk inpatient queue:', err);
      } finally {
        setInpatientLoading(false);
      }
    };
    fetchInpatients();
  }, [inpatientFilter]);

  // Fetch Post-Discharge Population
  useEffect(() => {
    const fetchPostDischarge = async () => {
      try {
        setPostDischargeLoading(true);
        const data = await postDischargeService.getPostDischargePatients(
          postDischargeFilter,
          postDischargeSearch || undefined
        );
        setPostDischargeList(data);
      } catch (err) {
        console.error('Failed to load post-discharge queue:', err);
      } finally {
        setPostDischargeLoading(false);
      }
    };

    const debounce = setTimeout(fetchPostDischarge, 200);
    return () => clearTimeout(debounce);
  }, [postDischargeFilter, postDischargeSearch]);

  // View full detailed plan
  const handleInspectPlan = async (patientId: number) => {
    try {
      setPlanLoading(true);
      setPlanModalOpen(true);
      const plan = await postDischargeService.getPatientPostDischargePlan(patientId);
      setSelectedPatientPlan(plan);
    } catch (err) {
      console.error('Failed to inspect post-discharge plan:', err);
    } finally {
      setPlanLoading(false);
    }
  };

  // 1-Click Readmit for existing patient
  const handleOpenReadmitModal = (p: { id: number; name: string; mrn: string; diagnosis: string }) => {
    setTargetPatient(p);
    setReadmitDiag(`Recurrent Acute Admission for ${p.diagnosis || 'Type 2 Diabetes Mellitus'}`);
    setReadmissionModalOpen(true);
  };

  const handleRecordReadmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetPatient) return;

    try {
      setRecordingReadmission(true);
      const res = await postDischargeService.createReadmissionEncounter(targetPatient.id, {
        ward: readmitWard,
        room: readmitRoom,
        department: 'Internal Medicine',
        primary_diagnosis: readmitDiag,
        attending_physician: 'Dr. Sarah Mitchell, MD'
      });

      setReadmissionSuccess(res.message || 'Readmission encounter created successfully!');
      setTimeout(() => {
        setReadmissionModalOpen(false);
        setReadmissionSuccess(null);
        navigate(`/ehr/${targetPatient.id}`);
      }, 1200);
    } catch (err: any) {
      console.error('Failed to record readmission:', err);
    } finally {
      setRecordingReadmission(false);
    }
  };

  const filteredInpatients = inpatientList.filter((p) => {
    const s = inpatientSearch.toLowerCase();
    return (
      p.first_name.toLowerCase().includes(s) ||
      p.last_name.toLowerCase().includes(s) ||
      p.mrn.toLowerCase().includes(s) ||
      (p.primary_diagnosis && p.primary_diagnosis.toLowerCase().includes(s))
    );
  });

  const criticalInpatientCount = inpatientList.filter((p) => p.risk_level === 'Critical').length;
  const highInpatientCount = inpatientList.filter((p) => p.risk_level === 'High').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 text-slate-900">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black shadow-xs">
              <ShieldAlert className="w-5 h-5 text-rose-500" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
                Multidisciplinary Care Coordination Command Center
              </h1>
              <p className="text-xs text-slate-500">
                End-to-end clinical triage: Inpatient surveillance, 30-day post-hospitalization tracking, weekly visits, medication continuity, dieticians, rehabilitation, and 1-click readmission database.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="px-3 py-1.5 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-xs text-rose-800 font-bold">
            <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping"></span>
            {criticalInpatientCount} Critical Inpatients
          </div>
          <div className="px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-xs text-amber-800 font-bold">
            {highInpatientCount} High-Risk Surveillance
          </div>
          <button
            onClick={() =>
              openCopilot(
                'POST_DISCHARGE_CARE',
                'Analyze the care coordination queue and flag all high-risk patients with overdue visits, medication supply delays, or rehabilitation barriers.'
              )
            }
            className="px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-2xs"
          >
            <Sparkles className="w-4 h-4 text-sky-600" />
            <span>Copilot Care Review</span>
          </button>
        </div>
      </div>

      {/* 4 Executive KPI Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="clinical-card p-4 bg-white border border-slate-200 rounded-xl shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Monitored Cohort</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{counts.all.toLocaleString()}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">30-Day Continuous Surveillance</div>
        </div>

        <div className="clinical-card p-4 bg-white border border-slate-200 rounded-xl shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">High-Risk Free ER Qualified</div>
          <div className="text-2xl font-black text-rose-700 mt-1">{counts.high_risk.toLocaleString()}</div>
          <div className="text-[10px] text-rose-600 font-semibold mt-0.5">Priority Rapid Triage Pass</div>
        </div>

        <div className="clinical-card p-4 bg-white border border-slate-200 rounded-xl shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Weekly Visits Pending / Due</div>
          <div className="text-2xl font-black text-sky-800 mt-1">{counts.overdue.toLocaleString()}</div>
          <div className="text-[10px] text-sky-600 font-semibold mt-0.5">Assigned Clinician Protocol</div>
        </div>

        <div className="clinical-card p-4 bg-white border border-slate-200 rounded-xl shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Medication Supply Issues</div>
          <div className="text-2xl font-black text-amber-700 mt-1">{counts.medication_pending.toLocaleString()}</div>
          <div className="text-[10px] text-amber-600 font-semibold mt-0.5">Courier & Refill Coordination</div>
        </div>
      </div>

      {/* Main 8-Module Navigation Tabs */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2 overflow-x-auto select-none">
        {[
          { id: 'inpatient_queue', label: '1. Inpatient Surveillance', icon: ShieldAlert, count: inpatientList.length },
          { id: 'post_discharge', label: '2. Post-Hospitalization Tracking', icon: HeartPulse, count: counts.all },
          { id: 'weekly_visits', label: '3. Weekly Visits (W1–W4)', icon: Calendar, count: counts.overdue },
          { id: 'med_supply', label: '4. Medication Supply', icon: Pill, count: counts.medication_pending },
          { id: 'nutrition', label: '5. Diet Plan (Dedicated Dietician)', icon: Apple },
          { id: 'rehabilitation', label: '6. Rehabilitation Regimen', icon: Activity },
          { id: 'insurance_er', label: '7. Insurance & Free ER Access', icon: ShieldCheck },
          { id: 'readmission_db', label: '8. Readmission Database (Existing Patients)', icon: RotateCcw, count: counts.readmitted },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeModule === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveModule(tab.id as any)}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition whitespace-nowrap ${
                isActive
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-sky-400' : 'text-slate-500'}`} />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    isActive ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* MODULE 1: INPATIENT HIGH-RISK SURVEILLANCE QUEUE */}
      {activeModule === 'inpatient_queue' && (
        <div className="space-y-4">
          <div className="clinical-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70">
            <div className="relative w-72">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search high-risk inpatients..."
                value={inpatientSearch}
                onChange={(e) => setInpatientSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'all', label: 'All Inpatient Risk' },
                { id: 'critical', label: 'Critical Only (≥70%)' },
                { id: 'high', label: 'High Priority (50-69%)' },
                { id: 'discharging_today', label: 'Discharging Soon' },
                { id: 'med_rec_pending', label: 'Med Rec Pending' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setInpatientFilter(f.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    inpatientFilter === f.id
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="clinical-card overflow-hidden bg-white border border-slate-200 rounded-2xl shadow-xs">
            {inpatientLoading ? (
              <div className="p-8 text-center text-xs text-slate-500 animate-pulse">
                Loading acute inpatient surveillance queue...
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Patient & MRN</th>
                      <th className="py-3 px-4">Primary Diagnosis</th>
                      <th className="py-3 px-4">Ward / Room</th>
                      <th className="py-3 px-4">ML Readmission Risk</th>
                      <th className="py-3 px-4">Free ER Triage Protocol</th>
                      <th className="py-3 px-4">Care Coordinator</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredInpatients.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-500">
                          No patients found matching the surveillance filter.
                        </td>
                      </tr>
                    ) : (
                      filteredInpatients.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">
                              {p.first_name} {p.last_name}
                            </div>
                            <div className="text-[11px] font-mono text-slate-500">
                              {p.mrn} • Age: {p.age} • {p.sex}
                            </div>
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-800 max-w-[200px] truncate">
                            {p.primary_diagnosis || 'Type 2 Diabetes Mellitus'}
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            <div>{p.current_ward || 'Ward 5B'}</div>
                            <div className="text-[10px] text-slate-400">Rm {p.current_room || '5B-102'}</div>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2.5 py-1 rounded-full text-xs font-black inline-flex items-center gap-1 ${
                                p.risk_level === 'Critical'
                                  ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                  : 'bg-amber-100 text-amber-800 border border-amber-200'
                              }`}
                            >
                              <ShieldAlert className="w-3.5 h-3.5" />
                              {Math.round((p.risk_probability || 0.55) * 100)}% {p.risk_level || 'High'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {(p.risk_probability || 0) >= 0.45 ? (
                              <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-900 rounded text-[11px] font-bold inline-flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3 text-indigo-600" />
                                Free ER Fast-Track Pass
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-400">Standard Triage</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-700 font-medium">
                            {p.care_coordinator || 'Emma Davis, RN'}
                          </td>
                          <td className="py-3 px-4 text-right space-x-1.5">
                            <button
                              onClick={() => navigate(`/ehr/${p.id}`)}
                              className="px-2.5 py-1 bg-sky-700 hover:bg-sky-800 text-white rounded-lg font-bold text-xs shadow-2xs"
                            >
                              Review EHR
                            </button>
                            <button
                              onClick={() => handleInspectPlan(p.id)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-lg font-bold text-xs"
                            >
                              Plan
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODULE 2: POST-HOSPITALIZATION & 30-DAY PATIENT TRACKING */}
      {activeModule === 'post_discharge' && (
        <div className="space-y-4">
          <div className="clinical-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70">
            <div className="relative w-72">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search discharged patients..."
                value={postDischargeSearch}
                onChange={(e) => setPostDischargeSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'all', label: 'All Discharged' },
                { id: 'high_risk', label: 'High Risk Only' },
                { id: 'overdue', label: 'Visits Overdue' },
                { id: 'medication_pending', label: 'Med Issues' },
                { id: 'readmitted', label: 'Readmitted (<30d)' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setPostDischargeFilter(f.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    postDischargeFilter === f.id
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="clinical-card overflow-hidden bg-white border border-slate-200 rounded-2xl shadow-xs">
            {postDischargeLoading ? (
              <div className="p-8 text-center text-xs text-slate-500 animate-pulse">
                Loading post-discharge tracking registry...
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Patient & MRN</th>
                      <th className="py-3 px-4">Discharge Date</th>
                      <th className="py-3 px-4">Discharge Risk</th>
                      <th className="py-3 px-4">Recovery Trajectory</th>
                      <th className="py-3 px-4">Next Follow-Up</th>
                      <th className="py-3 px-4">Medication Delivery</th>
                      <th className="py-3 px-4">Assigned Dietician & Rehab</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {postDischargeList.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-500">
                          No post-discharge patients found in this surveillance filter.
                        </td>
                      </tr>
                    ) : (
                      postDischargeList.map((p) => (
                        <tr key={p.patient_id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">{p.patient_name}</div>
                            <div className="text-[11px] font-mono text-slate-500">
                              {p.mrn} • Age: {p.age} • {p.sex}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-600 font-mono">{p.discharge_date}</td>
                          <td className="py-3 px-4">
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
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                p.recovery_status === 'Improving'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : p.recovery_status === 'Readmitted'
                                  ? 'bg-purple-100 text-purple-900 border border-purple-300'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {p.recovery_status}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900">{p.next_visit_date}</div>
                            <div className="text-[10px] text-slate-500">{p.next_visit_status}</div>
                          </td>
                          <td className="py-3 px-4">
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
                          <td className="py-3 px-4 text-[11px] text-slate-600">
                            <div>Diet: {p.diet_plan_status}</div>
                            <div>Rehab: {p.rehab_status}</div>
                          </td>
                          <td className="py-3 px-4 text-right space-x-1.5">
                            <button
                              onClick={() => navigate(`/ehr/${p.patient_id}`)}
                              className="px-2.5 py-1 bg-sky-700 hover:bg-sky-800 text-white rounded-lg font-bold text-xs shadow-2xs"
                            >
                              EHR
                            </button>
                            <button
                              onClick={() => handleInspectPlan(p.patient_id)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-lg font-bold text-xs"
                            >
                              View Plan
                            </button>
                            <button
                              onClick={() =>
                                handleOpenReadmitModal({
                                  id: p.patient_id,
                                  name: p.patient_name,
                                  mrn: p.mrn,
                                  diagnosis: p.primary_diagnosis,
                                })
                              }
                              className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg font-bold text-xs"
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
            )}
          </div>
        </div>
      )}

      {/* MODULE 3: 4-WEEK FOLLOW-UP VISITS (COMPLETED / PENDING) */}
      {activeModule === 'weekly_visits' && (
        <div className="space-y-4">
          <div className="bg-sky-50 border border-sky-200 p-4 rounded-xl flex items-center justify-between text-xs text-sky-900">
            <div>
              <strong>4-Week Post-Discharge Clinical Visit Management</strong>
              <p className="text-slate-600 mt-0.5">
                Tracks Week 1 (Primary Care), Week 2 (Telehealth CDE), Week 3 (Endocrinology Review), and Week 4 (30-Day Assessment).
              </p>
            </div>
            <span className="px-3 py-1 bg-white border border-sky-300 rounded-lg font-bold">
              {counts.overdue} Visits Requiring Urgent Review
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {postDischargeList.slice(0, 8).map((p) => (
              <div key={p.patient_id} className="clinical-card p-4 bg-white border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div>
                    <div className="font-bold text-slate-900">{p.patient_name}</div>
                    <div className="text-[11px] font-mono text-slate-500">{p.mrn} • Discharged: {p.discharge_date}</div>
                  </div>
                  <button
                    onClick={() => handleInspectPlan(p.patient_id)}
                    className="text-xs text-sky-700 font-bold hover:underline"
                  >
                    View All 4 Weeks →
                  </button>
                </div>

                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <div className="text-[10px] font-bold text-emerald-800">Week 1</div>
                    <div className="text-[11px] font-semibold text-emerald-900">Completed</div>
                    <div className="text-[9px] text-emerald-700">PCP Review</div>
                  </div>
                  <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="text-[10px] font-bold text-amber-800">Week 2</div>
                    <div className="text-[11px] font-semibold text-amber-900">Pending</div>
                    <div className="text-[9px] text-amber-700">Telehealth</div>
                  </div>
                  <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg">
                    <div className="text-[10px] font-bold text-slate-700">Week 3</div>
                    <div className="text-[11px] text-slate-600">Scheduled</div>
                    <div className="text-[9px] text-slate-400">Endocrine</div>
                  </div>
                  <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg">
                    <div className="text-[10px] font-bold text-slate-700">Week 4</div>
                    <div className="text-[11px] text-slate-600">Scheduled</div>
                    <div className="text-[9px] text-slate-400">30-Day Check</div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
                  <div>Coordinator: <strong>{p.care_coordinator}</strong></div>
                  <button
                    onClick={() => navigate(`/ehr/${p.patient_id}`)}
                    className="px-2.5 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded-md text-[11px] font-bold"
                  >
                    Open Schedule
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODULE 4: MEDICATION SUPPLY & DELIVERY VERIFICATION */}
      {activeModule === 'med_supply' && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-center justify-between text-xs text-amber-900">
            <div>
              <strong>Post-Discharge Medication Supply & Pharmacy Courier Tracking</strong>
              <p className="text-slate-600 mt-0.5">
                Ensures patients have received 30-day supplies for Insulin, Metformin, and ACE/ARB regimens with confirmed delivery.
              </p>
            </div>
            <span className="px-3 py-1 bg-white border border-amber-300 rounded-lg font-bold">
              {counts.medication_pending} Medication Reconciliations Active
            </span>
          </div>

          <div className="clinical-card overflow-hidden bg-white border border-slate-200 rounded-2xl shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Patient</th>
                    <th className="py-3 px-4">Key Discharge Regimen</th>
                    <th className="py-3 px-4">Supply Status</th>
                    <th className="py-3 px-4">Courier / Pharmacy</th>
                    <th className="py-3 px-4">Adherence Check</th>
                    <th className="py-3 px-4">Next Refill Date</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {postDischargeList.slice(0, 10).map((p) => (
                    <tr key={p.patient_id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{p.patient_name}</div>
                        <div className="text-[11px] font-mono text-slate-500">{p.mrn}</div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        Insulin Glargine + Metformin 1000mg
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            p.medication_supply_status === 'Supplied'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {p.medication_supply_status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">Hospital Outpatient Pharmacy / Courier</td>
                      <td className="py-3 px-4">
                        <span className="text-emerald-700 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Confirmed Adherent
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-sky-800">2026-09-02</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleInspectPlan(p.patient_id)}
                          className="px-2.5 py-1 bg-sky-700 hover:bg-sky-800 text-white rounded-lg font-bold text-xs"
                        >
                          Verify Refills
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODULE 5: DIET PLAN WITH DEDICATED DIETICIAN */}
      {activeModule === 'nutrition' && (
        <div className="space-y-4">
          <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-center justify-between text-xs text-emerald-900">
            <div>
              <strong>Medical Nutrition Therapy (MNT) & Dedicated Dieticians</strong>
              <p className="text-slate-600 mt-0.5">
                Specialized diabetic, renal, and cardiac medical nutrition plans assigned to certified diabetes educators.
              </p>
            </div>
            <span className="px-3 py-1 bg-white border border-emerald-300 rounded-lg font-bold text-emerald-800">
              Elena Rostova, RD, CDE (Lead Dietician)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {postDischargeList.slice(0, 6).map((p) => (
              <div key={p.patient_id} className="clinical-card p-4 bg-white border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div>
                    <div className="font-bold text-slate-900">{p.patient_name}</div>
                    <div className="text-[11px] text-slate-500 font-mono">{p.mrn} • Primary: {p.primary_diagnosis}</div>
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[10px] font-bold">
                    Diet Active
                  </span>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1 text-xs">
                  <div className="font-bold text-slate-800">Prescribed Diet: Consistent Carbohydrate Diabetes Plan</div>
                  <div className="text-slate-600">Daily Target: 45–60g carbs per main meal • Sodium &lt; 2,000 mg/day</div>
                  <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                    Dietician: <strong>Elena Rostova, RD, CDE</strong> • Bedside education completed.
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Next MNT Review: In 7 Days</span>
                  <button
                    onClick={() => handleInspectPlan(p.patient_id)}
                    className="text-sky-700 font-bold hover:underline"
                  >
                    View Nutrition Goals →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODULE 6: REHABILITATION & MOBILITY PROGRAMS */}
      {activeModule === 'rehabilitation' && (
        <div className="space-y-4">
          <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-xl flex items-center justify-between text-xs text-indigo-900">
            <div>
              <strong>Post-Discharge Physical Rehabilitation & Mobility Support</strong>
              <p className="text-slate-600 mt-0.5">
                Gait training, lower extremity endurance, and fall prevention home programs.
              </p>
            </div>
            <span className="px-3 py-1 bg-white border border-indigo-300 rounded-lg font-bold text-indigo-800">
              David Chen, DPT (Physical Therapy Lead)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {postDischargeList.slice(0, 6).map((p) => (
              <div key={p.patient_id} className="clinical-card p-4 bg-white border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div>
                    <div className="font-bold text-slate-900">{p.patient_name}</div>
                    <div className="text-[11px] text-slate-500 font-mono">{p.mrn}</div>
                  </div>
                  <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded text-[10px] font-bold">
                    60% Progress
                  </span>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5 text-xs">
                  <div className="font-bold text-slate-800">Program: Physical Mobility & Gait Training</div>
                  <div className="text-slate-600">Frequency: 2 sessions / week with David Chen, DPT</div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div className="bg-indigo-600 h-full rounded-full" style={{ width: '60%' }}></div>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Goals: Independent transfer, 300ft ambulation, fall safety.
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Next Session: Tomorrow, 10:00 AM</span>
                  <button
                    onClick={() => handleInspectPlan(p.patient_id)}
                    className="text-sky-700 font-bold hover:underline"
                  >
                    View Rehab Log →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODULE 7: INSURANCE COVERAGE & FREE ER RAPID TRIAGE ACCESS */}
      {activeModule === 'insurance_er' && (
        <div className="space-y-4">
          <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-rose-900">
            <div>
              <div className="flex items-center gap-2 font-bold text-sm">
                <Flame className="w-4 h-4 text-rose-600" />
                <span>Institutional High-Risk Free ER Rapid-Response Protocol</span>
              </div>
              <p className="text-slate-600 mt-0.5">
                Patients stratified with Risk ≥45% are pre-authorized for hospital-sponsored emergency evaluation with zero co-pay at our ER triage to intercept acute decompensation.
              </p>
            </div>
            <div className="px-3 py-1.5 bg-rose-600 text-white rounded-lg font-bold text-center shrink-0">
              Hotline: (800) 555-ER-STAT
            </div>
          </div>

          <div className="clinical-card overflow-hidden bg-white border border-slate-200 rounded-2xl shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Patient & MRN</th>
                    <th className="py-3 px-4">Insurance Type & Policy</th>
                    <th className="py-3 px-4">Coverage Status</th>
                    <th className="py-3 px-4">Readmission Risk</th>
                    <th className="py-3 px-4">Free ER Fast-Track Eligibility</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {postDischargeList.slice(0, 10).map((p) => (
                    <tr key={p.patient_id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{p.patient_name}</div>
                        <div className="text-[11px] font-mono text-slate-500">{p.mrn}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        <div>Medicare Part A & B</div>
                        <div className="text-[10px] font-mono text-slate-400">MED-{p.patient_id.toString().padStart(7, '0')}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[10px] font-bold">
                          Active Verified
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {Math.round(p.discharge_risk_score * 100)}% ({p.discharge_risk_level})
                      </td>
                      <td className="py-3 px-4">
                        {p.discharge_risk_score >= 0.45 ? (
                          <span className="px-2.5 py-1 bg-rose-100 border border-rose-300 text-rose-900 rounded-lg text-xs font-bold inline-flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5 text-rose-600" />
                            Eligible — Free ER Pass Active
                          </span>
                        ) : (
                          <span className="text-slate-500 text-xs">Standard Benefits</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleInspectPlan(p.patient_id)}
                          className="px-2.5 py-1 bg-sky-700 hover:bg-sky-800 text-white rounded-lg font-bold text-xs"
                        >
                          Review Benefits
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODULE 8: READMISSION DATABASE (NO NEED TO RE-REGISTER EXISTING PATIENT) */}
      {activeModule === 'readmission_db' && (
        <div className="space-y-4">
          <div className="bg-purple-50 border border-purple-200 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-purple-900">
            <div>
              <div className="font-bold text-sm flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-purple-700" />
                <span>Existing Patient Readmission Database (Zero Duplicate Registration)</span>
              </div>
              <p className="text-slate-600 mt-0.5">
                Returning patients are already present in MongoDB. Click <strong>[Record Readmission]</strong> to create an encounter instantly on their permanent record without filling duplicate demographics!
              </p>
            </div>
            <span className="px-3 py-1 bg-purple-700 text-white rounded-lg font-bold">
              {counts.readmitted} Documented 30-Day Readmissions
            </span>
          </div>

          <div className="clinical-card overflow-hidden bg-white border border-slate-200 rounded-2xl shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Patient Master Record</th>
                    <th className="py-3 px-4">Previous Discharge</th>
                    <th className="py-3 px-4">Initial Diagnosis</th>
                    <th className="py-3 px-4">Readmission Status</th>
                    <th className="py-3 px-4">30-Day CMS Window</th>
                    <th className="py-3 px-4 text-right">Instant Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {postDischargeList.map((p) => (
                    <tr key={p.patient_id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{p.patient_name}</div>
                        <div className="text-[11px] font-mono text-slate-500">
                          {p.mrn} • ID: {p.patient_id}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-mono">{p.discharge_date}</td>
                      <td className="py-3 px-4 font-semibold text-slate-800">{p.primary_diagnosis}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            p.recovery_status === 'Readmitted'
                              ? 'bg-purple-100 text-purple-900 border border-purple-300'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {p.recovery_status === 'Readmitted' ? 'Active Readmission' : 'Post-Discharge'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-amber-800 font-semibold">Active 30-Day Surveillance</span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-1.5">
                        <button
                          onClick={() => navigate(`/ehr/${p.patient_id}`)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-lg font-bold text-xs"
                        >
                          History
                        </button>
                        <button
                          onClick={() =>
                            handleOpenReadmitModal({
                              id: p.patient_id,
                              name: p.patient_name,
                              mrn: p.mrn,
                              diagnosis: p.primary_diagnosis,
                            })
                          }
                          className="px-3 py-1 bg-purple-700 hover:bg-purple-800 text-white rounded-lg font-bold text-xs shadow-2xs inline-flex items-center gap-1"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Record Readmit</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 1-CLICK READMIT MODAL (NO RE-REGISTRATION) */}
      {readmissionModalOpen && targetPatient && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-purple-700" />
                <span>1-Click Readmission Intake (Existing Patient)</span>
              </div>
              <button
                onClick={() => setReadmissionModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {readmissionSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg text-xs font-bold">
                ✓ {readmissionSuccess} Redirecting to EHR...
              </div>
            )}

            <form onSubmit={handleRecordReadmit} className="space-y-4 text-xs">
              <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl space-y-1">
                <div className="font-bold text-purple-950">
                  {targetPatient.name} ({targetPatient.mrn})
                </div>
                <div className="text-slate-600">
                  Patient record exists in MongoDB. A new admission encounter will be linked without duplicating demographics.
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Admitting Ward</label>
                  <select
                    value={readmitWard}
                    onChange={(e) => setReadmitWard(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-semibold"
                  >
                    <option value="Ward 4A">Ward 4A (Telemetry)</option>
                    <option value="Ward 5B">Ward 5B (Endocrinology)</option>
                    <option value="Ward 3C">Ward 3C (Step-Down ICU)</option>
                    <option value="Ward 2E">Ward 2E (Observation)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Room / Bed</label>
                  <input
                    type="text"
                    value={readmitRoom}
                    onChange={(e) => setReadmitRoom(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Primary Readmission Diagnosis</label>
                <input
                  type="text"
                  value={readmitDiag}
                  onChange={(e) => setReadmitDiag(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-semibold"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setReadmissionModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-bold hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={recordingReadmission}
                  className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-lg font-bold shadow-xs flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{recordingReadmission ? 'Recording...' : 'Create Readmission Encounter'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PLAN INSPECTION MODAL */}
      {planModalOpen && selectedPatientPlan && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 shadow-2xl border border-slate-200 space-y-4 text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-slate-900">
                  {selectedPatientPlan.patient_name} ({selectedPatientPlan.mrn})
                </h3>
                <p className="text-xs text-slate-500">
                  Discharged: {selectedPatientPlan.discharge_date} • Coordinator: {selectedPatientPlan.care_coordinator}
                </p>
              </div>
              <button
                onClick={() => setPlanModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="font-bold text-slate-800 mb-1">4-Week Follow-Up Visits:</div>
                <div className="space-y-1">
                  {selectedPatientPlan.follow_up_visits.map((v) => (
                    <div key={v.id} className="flex items-center justify-between text-slate-700">
                      <span>Week {v.week_number}: {v.visit_type} ({v.assigned_clinician})</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${v.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                        {v.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {selectedPatientPlan.nutrition_plan && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <div className="font-bold text-emerald-900 mb-1">Medical Nutrition Therapy (Dietician):</div>
                  <div className="text-emerald-800">{selectedPatientPlan.nutrition_plan.diet_type}</div>
                  <div className="text-[11px] text-emerald-700 mt-1">
                    Assigned: {selectedPatientPlan.nutrition_plan.dietician_name} • Goals: {selectedPatientPlan.nutrition_plan.daily_goals.join(', ')}
                  </div>
                </div>
              )}

              {selectedPatientPlan.rehabilitation_plan && (
                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
                  <div className="font-bold text-indigo-900 mb-1">Rehabilitation & Mobility Program:</div>
                  <div className="text-indigo-800">{selectedPatientPlan.rehabilitation_plan.rehabilitation_type} ({selectedPatientPlan.rehabilitation_plan.progress_percentage}% Progress)</div>
                  <div className="text-[11px] text-indigo-700 mt-1">
                    Specialist: {selectedPatientPlan.rehabilitation_plan.assigned_specialist} • {selectedPatientPlan.rehabilitation_plan.frequency}
                  </div>
                </div>
              )}

              {selectedPatientPlan.coverage && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="font-bold text-rose-900">Insurance & Free ER Eligibility:</div>
                    <div className="text-rose-800">{selectedPatientPlan.coverage.coverage_type} ({selectedPatientPlan.coverage.policy_or_member_id})</div>
                  </div>
                  <span className="px-2.5 py-1 bg-rose-600 text-white rounded font-bold text-[11px]">
                    {selectedPatientPlan.coverage.emergency_support_eligibility}
                  </span>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                onClick={() => {
                  setPlanModalOpen(false);
                  navigate(`/ehr/${selectedPatientPlan.patient_id}`);
                }}
                className="px-4 py-2 bg-sky-700 hover:bg-sky-800 text-white rounded-lg font-bold text-xs shadow-xs"
              >
                Open Full Patient EHR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
