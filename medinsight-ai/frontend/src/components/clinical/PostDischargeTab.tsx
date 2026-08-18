import React, { useState, useEffect } from 'react';
import {
  HeartPulse,
  Calendar,
  Pill,
  Apple,
  Activity,
  ShieldCheck,
  PhoneCall,
  RotateCcw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Sparkles,
  ChevronRight,
  UserCheck,
  FileCheck,
  TrendingDown,
  Building2,
  AlertCircle
} from 'lucide-react';
import { postDischargeService } from '../../services/postDischargeService';
import { PostDischargeCarePlan } from '../../types/postDischarge';
import { PostDischargeDashboardSkeleton } from '../common/PostDischargeSkeletons';
import { useCopilot } from '../../contexts/CopilotContext';

interface PostDischargeTabProps {
  patientId: number;
}

export const PostDischargeTab: React.FC<PostDischargeTabProps> = ({ patientId }) => {
  const [plan, setPlan] = useState<PostDischargeCarePlan | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'timeline' | 'medication' | 'nutrition' | 'rehabilitation' | 'coverage' | 'readmissions'>('timeline');
  const [completingVisitId, setCompletingVisitId] = useState<number | null>(null);
  const { openCopilot } = useCopilot();

  useEffect(() => {
    const fetchPlan = async () => {
      try {
        setLoading(true);
        const data = await postDischargeService.getPatientPostDischargePlan(patientId);
        setPlan(data);
      } catch (err: any) {
        console.error('Failed to load post-discharge plan:', err);
        setError('Unable to load post-discharge recovery plan.');
      } finally {
        setLoading(false);
      }
    };

    fetchPlan();
  }, [patientId]);

  const handleMarkVisitComplete = async (visitId: number) => {
    if (!plan) return;
    try {
      setCompletingVisitId(visitId);
      const updatedVisits = plan.follow_up_visits.map(v =>
        v.id === visitId
          ? { ...v, status: 'Completed' as const, completed_date: new Date().toISOString().split('T')[0] }
          : v
      );
      setPlan({ ...plan, follow_up_visits: updatedVisits, follow_up_completion_rate: Math.min(100, plan.follow_up_completion_rate + 25) });
    } catch (err) {
      console.error('Failed to update visit:', err);
    } finally {
      setCompletingVisitId(null);
    }
  };

  if (loading) return <PostDischargeDashboardSkeleton />;

  if (error || !plan) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-center gap-2 font-medium">
        <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
        <span>{error || 'Post-discharge recovery plan not initialized.'}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Post-Discharge Status Executive Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-700 text-white flex items-center justify-center font-bold">
              <HeartPulse className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                  Post-Discharge Recovery & Care Continuity
                </h2>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    plan.recovery_status === 'Improving'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : plan.recovery_status === 'High Risk'
                      ? 'bg-rose-100 text-rose-800 border border-rose-300'
                      : 'bg-amber-100 text-amber-800 border border-amber-300'
                  }`}
                >
                  {plan.recovery_status}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Discharged on {plan.discharge_date} ({plan.discharge_encounter_id}) • 30-Day Follow-Up Active
              </p>
            </div>
          </div>

          {/* Contextual Ask Copilot Action */}
          <button
            onClick={() => openCopilot('POST_DISCHARGE_CARE', 'Summarize this patient’s post-discharge recovery status and upcoming follow-ups.')}
            className="px-3.5 py-2 bg-sky-50 hover:bg-sky-100/80 text-sky-900 border border-sky-300 rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-2xs self-start sm:self-auto"
          >
            <Sparkles className="w-4 h-4 text-sky-600" />
            <span>Ask Copilot Recovery Review</span>
          </button>
        </div>

        {/* 4 Summary Metric Indicators */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Readmission Risk Trend</div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm font-black text-slate-900">
                {Math.round(plan.discharge_risk_score * 100)}%
              </span>
              <span className="text-slate-400">→</span>
              <span className="text-sm font-black text-emerald-700 flex items-center">
                <TrendingDown className="w-3.5 h-3.5 inline mr-0.5" />
                {Math.round(plan.current_risk_score * 100)}%
              </span>
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Discharge vs Current</div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Follow-Up Completion</div>
            <div className="text-sm font-black text-slate-900 mt-1">
              {plan.follow_up_completion_rate}%
            </div>
            <div className="w-full bg-slate-200 h-1.5 rounded-full mt-1 overflow-hidden">
              <div
                className="bg-sky-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${plan.follow_up_completion_rate}%` }}
              />
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Care Coordinator</div>
            <div className="text-xs font-bold text-slate-900 mt-1 truncate">
              {plan.care_coordinator}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Primary Transition Lead</div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Next Scheduled Review</div>
            <div className="text-xs font-bold text-sky-800 mt-1">
              {plan.next_followup_date}
            </div>
            <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">Confirmed on Schedule</div>
          </div>
        </div>
      </div>

      {/* Continuity Sub-Navigation Bar */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        {[
          { id: 'timeline', label: '4-Week Follow-Up Timeline', icon: Calendar },
          { id: 'medication', label: 'Medication Continuity', icon: Pill },
          { id: 'nutrition', label: 'Diet & Nutrition Plan', icon: Apple },
          { id: 'rehabilitation', label: 'Rehabilitation Regimen', icon: Activity },
          { id: 'coverage', label: 'Coverage & Financial Support', icon: ShieldCheck },
          { id: 'readmissions', label: 'Readmission History', icon: RotateCcw }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSection === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition whitespace-nowrap ${
                isActive
                  ? 'bg-sky-700 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Section 1: 4-Week Follow-Up Timeline */}
      {activeSection === 'timeline' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">4-Week Post-Discharge Follow-Up Schedule</h3>
              <p className="text-xs text-slate-500">
                Scheduled primary care, endocrinology, and transitional visits to prevent 30-day readmissions.
              </p>
            </div>
            <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
              {plan.follow_up_visits.filter(v => v.status === 'Completed').length} of {plan.follow_up_visits.length} Completed
            </span>
          </div>

          <div className="space-y-3">
            {plan.follow_up_visits.map((visit) => (
              <div
                key={visit.id}
                className={`p-4 rounded-xl border transition ${
                  visit.status === 'Completed'
                    ? 'bg-emerald-50/50 border-emerald-200'
                    : visit.status === 'Pending'
                    ? 'bg-amber-50/40 border-amber-200'
                    : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                        visit.status === 'Completed'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      W{visit.week_number}
                    </div>
                    <div>
                      <div className="font-bold text-xs text-slate-900 flex items-center gap-2">
                        <span>{visit.visit_type}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                            visit.status === 'Completed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : visit.status === 'Pending'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {visit.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Scheduled: <strong>{visit.scheduled_date}</strong> • Clinician: {visit.assigned_clinician}
                      </div>
                      {visit.notes && (
                        <div className="text-xs text-slate-700 bg-white p-2 rounded-md border border-slate-200/80 mt-2 font-mono">
                          {visit.notes}
                        </div>
                      )}
                    </div>
                  </div>

                  {visit.status !== 'Completed' && (
                    <button
                      onClick={() => handleMarkVisitComplete(visit.id)}
                      disabled={completingVisitId === visit.id}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 self-start sm:self-auto shadow-2xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Mark Complete</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 2: Medication Continuity */}
      {activeSection === 'medication' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Post-Discharge Medication Continuity</h3>
              <p className="text-xs text-slate-500">
                Verification that prescribed discharge medications were supplied and are actively adhered to.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-bold uppercase text-[10px]">
                  <th className="p-3">Medication & Dosage</th>
                  <th className="p-3">Frequency</th>
                  <th className="p-3">Supply Status</th>
                  <th className="p-3">Adherence</th>
                  <th className="p-3">Supplier</th>
                  <th className="p-3">Next Refill</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {plan.medication_supplies.map((med) => (
                  <tr key={med.id} className="hover:bg-slate-50 transition">
                    <td className="p-3 font-bold text-slate-900">
                      <div>{med.medication_name}</div>
                      <div className="text-[10px] text-slate-500 font-normal">{med.dosage}</div>
                    </td>
                    <td className="p-3 text-slate-700">{med.frequency}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          med.status === 'Supplied'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {med.status}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="text-emerald-700 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {med.adherence_status}
                      </span>
                    </td>
                    <td className="p-3 text-slate-600">{med.supplier}</td>
                    <td className="p-3 font-mono font-bold text-sky-800">{med.next_refill_date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Section 3: Nutrition Plan */}
      {activeSection === 'nutrition' && plan.nutrition_plan && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Medical Nutrition Therapy & Diabetes Diet Plan</h3>
              <p className="text-xs text-slate-500">
                Assigned Registered Dietician: <strong>{plan.nutrition_plan.dietician_name}</strong>
              </p>
            </div>
            <span className="px-2.5 py-1 bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs font-bold rounded-lg">
              Status: {plan.nutrition_plan.status}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="text-xs font-bold text-slate-900 uppercase tracking-wider">Prescribed Meal Plan</div>
              <div className="text-xs text-slate-700 font-semibold">{plan.nutrition_plan.diet_type}</div>
              <div className="text-[11px] text-slate-600 pt-2 border-t border-slate-200">
                {plan.nutrition_plan.clinical_notes}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="text-xs font-bold text-slate-900 uppercase tracking-wider">Daily Carbohydrate Goals</div>
              <ul className="text-xs text-slate-700 space-y-1 list-disc list-inside">
                {plan.nutrition_plan.daily_goals.map((g, idx) => (
                  <li key={idx}>{g}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Section 4: Rehabilitation */}
      {activeSection === 'rehabilitation' && plan.rehabilitation_plan && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Physical Rehabilitation & Mobility Program</h3>
              <p className="text-xs text-slate-500">
                Assigned Specialist: <strong>{plan.rehabilitation_plan.assigned_specialist}</strong> ({plan.rehabilitation_plan.frequency})
              </p>
            </div>
            <span className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-lg">
              {plan.rehabilitation_plan.status} ({plan.rehabilitation_plan.progress_percentage}%)
            </span>
          </div>

          <div className="space-y-3">
            <div className="text-xs font-bold text-slate-800">Target Rehabilitation Goals:</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {plan.rehabilitation_plan.goals.map((goal, idx) => (
                <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700">
                  ✓ {goal}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Section 5: Coverage & Emergency Support */}
      {activeSection === 'coverage' && plan.coverage && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Coverage, Insurance & High-Risk Emergency Support</h3>
              <p className="text-xs text-slate-500">
                Institutional programme qualification and benefits verification.
              </p>
            </div>
            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-900 text-xs font-bold rounded-lg border border-emerald-300">
              {plan.coverage.coverage_status}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
              <div className="font-bold text-slate-900">Primary Insurance Plan</div>
              <div>Type: <strong>{plan.coverage.coverage_type}</strong></div>
              <div>Provider: {plan.coverage.provider}</div>
              <div>Policy ID: <span className="font-mono">{plan.coverage.policy_or_member_id}</span></div>
            </div>

            <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2 text-xs">
              <div className="font-bold text-indigo-950 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                High-Risk Readmission Support Eligibility
              </div>
              <div className="text-indigo-900">
                Status: <strong className="text-emerald-700">{plan.coverage.emergency_support_eligibility}</strong>
              </div>
              <p className="text-[11px] text-indigo-800">
                {plan.coverage.notes || 'Patient qualifies for hospital-sponsored transitional care medication support.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Section 6: Readmission History */}
      {activeSection === 'readmissions' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900">Longitudinal Readmission Event History</h3>
            <p className="text-xs text-slate-500">
              Audited 30-day early vs late re-admission events linked to this patient master record.
            </p>
          </div>

          {plan.readmissions.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
              No unplanned 30-day readmissions recorded for this patient.
            </div>
          ) : (
            <div className="space-y-3">
              {plan.readmissions.map((r) => (
                <div key={r.id} className="p-4 bg-rose-50/50 border border-rose-200 rounded-xl text-xs space-y-1.5">
                  <div className="font-bold text-rose-900 flex items-center justify-between">
                    <span>{r.readmission_type}</span>
                    <span className="px-2 py-0.5 bg-rose-200 text-rose-900 rounded text-[10px] font-black">
                      {r.days_since_discharge} Days Post-Discharge
                    </span>
                  </div>
                  <div className="text-slate-700">
                    Previous Encounter: <strong>{r.previous_encounter_id}</strong> → Readmitted as: <strong>{r.new_encounter_id}</strong>
                  </div>
                  <div className="text-slate-600">
                    Primary Readmission Diagnosis: <strong>{r.primary_diagnosis}</strong>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
