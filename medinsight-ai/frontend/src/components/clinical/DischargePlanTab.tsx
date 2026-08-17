import React, { useState, useEffect } from 'react';
import {
  ClipboardCheck,
  CheckCircle2,
  Clock,
  Plus,
  AlertCircle,
  Sparkles,
  UserCheck,
  Building,
  Calendar,
  Pill,
  ShieldAlert,
  X
} from 'lucide-react';
import { Patient, DischargePlan, Recommendation } from '../../types/clinical';
import { recommendationService } from '../../services/recommendationService';

interface DischargePlanTabProps {
  patient: Patient;
}

export const DischargePlanTab: React.FC<DischargePlanTabProps> = ({ patient }) => {
  const [plan, setPlan] = useState<DischargePlan | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // New recommendation form state
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState('High');
  const [newReason, setNewReason] = useState('');
  const [newTeam, setNewTeam] = useState('Care Coordination');

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [planData, recsData] = await Promise.all([
          recommendationService.getDischargePlan(patient.id),
          recommendationService.getRecommendations(patient.id),
        ]);
        setPlan(planData);
        setRecommendations(recsData);
      } catch (err) {
        console.error('Failed to load discharge data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [patient.id]);

  const handleToggleChecklist = async (field: keyof DischargePlan) => {
    if (!plan) return;
    const updatedVal = !plan[field];
    const newPlan = { ...plan, [field]: updatedVal };
    setPlan(newPlan);

    try {
      const saved = await recommendationService.updateDischargePlan(patient.id, {
        [field]: updatedVal,
      });
      setPlan(saved);
    } catch (err) {
      console.error('Error updating checklist item:', err);
    }
  };

  const handleToggleRecommendation = async (recId: number) => {
    try {
      const updated = await recommendationService.toggleRecommendation(recId);
      setRecommendations((prev) =>
        prev.map((r) => (r.id === recId ? updated : r))
      );
    } catch (err) {
      console.error('Error toggling recommendation:', err);
    }
  };

  const handleAddRecommendation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      const created = await recommendationService.addRecommendation(patient.id, {
        title: newTitle,
        priority: newPriority,
        reason: newReason || 'Clinician directed discharge care transition order.',
        responsible_team: newTeam,
        due_date: 'Prior to discharge',
      });
      setRecommendations((prev) => [created, ...prev]);
      setShowAddModal(false);
      setNewTitle('');
      setNewReason('');
    } catch (err) {
      console.error('Error adding recommendation:', err);
    }
  };

  const readiness = plan?.readiness_score || 78.0;

  const checklistItems: Array<{ key: keyof DischargePlan; label: string; subtext: string }> = [
    { key: 'medication_reconciliation', label: 'Pharmacist Medication Reconciliation', subtext: 'Review active polypharmacy and insulin titrations' },
    { key: 'follow_up_appointment', label: '7-Day Post-Discharge Clinical Follow-up', subtext: 'In-person primary care clinic slot reserved' },
    { key: 'diabetes_education', label: 'Certified Diabetes Educator Consultation', subtext: 'Self-management, insulin technique, and hypoglycemia training' },
    { key: 'pending_tests_cleared', label: 'Diagnostic Test Results & Labs Cleared', subtext: 'Renal panel and microbiology blood cultures verified' },
    { key: 'transport_arranged', label: 'Patient Transportation Confirmed', subtext: 'Safe transit to residence coordinated with caregiver/spouse' },
    { key: 'home_monitoring_setup', label: 'Cellular Remote Glucose/BP Telemetry Kit', subtext: 'Dispatch continuous monitoring hardware for home use' },
    { key: 'care_coordinator_assigned', label: 'Dedicated Transitional Care Coordinator Assigned', subtext: 'Alex Rivera, MSW assigned for 48h & 7d outreach calls' },
    { key: 'patient_education_completed', label: 'Discharge Instructions & Red Flags Reviewed', subtext: 'Warning signs for emergency return explained to patient' },
    { key: 'high_risk_review_completed', label: 'Multidisciplinary High-Risk Review Completed', subtext: 'Attending physician clinical sign-off on discharge safety' },
  ];

  return (
    <div className="space-y-6">
      {/* Header & Readiness Hero Card */}
      <div className="clinical-card p-6 bg-gradient-to-r from-sky-900 to-slate-900 text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-sky-400 text-xs font-bold uppercase tracking-wider mb-1">
              <ClipboardCheck className="w-4 h-4" />
              Transitional Care Planning
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white">
              Discharge Readiness & Care Transition Protocol
            </h2>
            <p className="text-xs text-slate-300 max-w-xl mt-1">
              Systematic safety checklist and personalized prevention interventions to prevent avoidable 30-day hospital readmissions.
            </p>
          </div>

          {/* Readiness Score Progress */}
          <div className="bg-slate-800/90 p-4 rounded-xl border border-slate-700 text-right shrink-0 min-w-[200px]">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Discharge Readiness Score
            </div>
            <div className="text-3xl font-black text-emerald-400 mt-0.5">
              {readiness}%
            </div>
            {/* Progress bar */}
            <div className="w-full bg-slate-700 h-2 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-emerald-500 h-full transition-all duration-500 rounded-full"
                style={{ width: `${readiness}%` }}
              ></div>
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              {readiness >= 80 ? 'Ready for Attending Sign-Off' : 'Pending Critical Checklist Items'}
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Checklist & Prevention Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Discharge Safety Checklist */}
        <div className="lg:col-span-6 clinical-card p-5">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Required Discharge Checklist
            </h3>
            <span className="text-[11px] font-semibold text-slate-500">
              {plan ? Object.values(plan).filter((v) => v === true).length : 6} of 9 Complete
            </span>
          </div>

          <div className="space-y-2.5">
            {checklistItems.map((item) => {
              const isChecked = plan ? !!plan[item.key] : false;
              return (
                <label
                  key={item.key}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    isChecked
                      ? 'bg-emerald-50/60 border-emerald-300 text-slate-800'
                      : 'bg-white border-slate-200 hover:border-sky-300 text-slate-700'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleToggleChecklist(item.key)}
                    className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                  />
                  <div className="text-xs">
                    <div className={`font-bold ${isChecked ? 'text-emerald-950' : 'text-slate-900'}`}>
                      {item.label}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {item.subtext}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Personalized Clinical Prevention Recommendations */}
        <div className="lg:col-span-6 clinical-card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-sky-600" />
                  Targeted Prevention Orders
                </h3>
                <p className="text-[11px] text-slate-500">
                  AI-recommended and clinician-added transitional interventions.
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-2.5 py-1.5 bg-sky-50 text-sky-700 hover:bg-sky-100 rounded-md text-xs font-bold border border-sky-200 flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Order
              </button>
            </div>

            <div className="space-y-3">
              {recommendations.map((r) => (
                <div
                  key={r.id}
                  className={`p-3.5 rounded-lg border text-xs transition-all ${
                    r.is_completed
                      ? 'bg-slate-50 border-slate-200 opacity-70'
                      : r.priority === 'Urgent'
                      ? 'bg-rose-50/80 border-rose-300'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      <input
                        type="checkbox"
                        checked={r.is_completed}
                        onChange={() => handleToggleRecommendation(r.id)}
                        className="mt-0.5 rounded text-sky-600 focus:ring-sky-500 w-4 h-4"
                      />
                      <div>
                        <div className="font-bold text-slate-900 flex items-center gap-2">
                          <span className={r.is_completed ? 'line-through text-slate-500' : ''}>
                            {r.title}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                              r.priority === 'Urgent'
                                ? 'bg-rose-100 text-rose-800'
                                : r.priority === 'High'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {r.priority}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-1">{r.reason}</p>
                        <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-2">
                          <span>Team: <strong className="text-slate-600">{r.responsible_team}</strong></span>
                          <span>•</span>
                          <span>Source: <strong className="text-slate-600">{r.source}</strong></span>
                          {r.due_date && (
                            <>
                              <span>•</span>
                              <span>Due: {r.due_date}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Add Recommendation Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
              <h3 className="text-sm font-bold text-slate-900">Add Clinical Prevention Order</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddRecommendation} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Order Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Schedule Home Health Nurse Wound Dressing Review"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Priority</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500"
                  >
                    <option value="Urgent">Urgent</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Responsible Team</label>
                  <select
                    value={newTeam}
                    onChange={(e) => setNewTeam(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500"
                  >
                    <option value="Care Coordination">Care Coordination</option>
                    <option value="Clinical Pharmacy">Clinical Pharmacy</option>
                    <option value="Endocrinology">Endocrinology</option>
                    <option value="Social Work">Social Work</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Clinical Justification / Reason</label>
                <textarea
                  rows={3}
                  placeholder="State risk justification or specific follow-up protocol..."
                  value={newReason}
                  onChange={(e) => setNewReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-sky-600 text-white rounded-lg hover:bg-sky-700 font-semibold shadow-xs"
                >
                  Create Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
