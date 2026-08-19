import React, { useState, useEffect } from 'react';
import {
  HeartPulse,
  Calendar,
  Pill,
  Apple,
  Activity,
  ShieldCheck,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  TrendingDown,
  AlertCircle,
  Plus,
  Trash2,
  Edit3,
  X,
  Loader2,
  Check
} from 'lucide-react';
import { postDischargeService } from '../../services/postDischargeService';
import {
  PostDischargeCarePlan,
  FollowUpVisit,
  MedicationSupplyItem,
  NutritionPlan,
  RehabilitationPlan,
  PatientCoverage,
  ReadmissionEvent
} from '../../types/postDischarge';
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
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isSubmittingSection, setIsSubmittingSection] = useState<boolean>(false);

  // 1. Follow-up Visit Modals State
  const [editingVisit, setEditingVisit] = useState<FollowUpVisit | null>(null);
  const [savingEdit, setSavingEdit] = useState<boolean>(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [newVisitWeek, setNewVisitWeek] = useState<number>(5);
  const [newVisitType, setNewVisitType] = useState<string>('Primary Care Follow-Up (In-Person)');
  const [newVisitDate, setNewVisitDate] = useState<string>(new Date(Date.now() + 21 * 86400000).toISOString().split('T')[0]);
  const [newVisitClinician, setNewVisitClinician] = useState<string>('Dr. Sarah Mitchell, MD');
  const [newVisitNotes, setNewVisitNotes] = useState<string>('');
  const [addingVisit, setAddingVisit] = useState<boolean>(false);

  // 2. Medication Modal State
  const [editingMedication, setEditingMedication] = useState<MedicationSupplyItem | null>(null);
  const [isMedModalOpen, setIsMedModalOpen] = useState<boolean>(false);
  const [medForm, setMedForm] = useState<{
    medication_name: string;
    dosage: string;
    frequency: string;
    status: MedicationSupplyItem['status'];
    adherence_status: MedicationSupplyItem['adherence_status'];
    supplier: string;
    next_refill_date: string;
  }>({
    medication_name: '',
    dosage: '',
    frequency: 'Daily (Morning)',
    status: 'Supplied',
    adherence_status: 'Confirmed',
    supplier: 'Hospital Outpatient Pharmacy',
    next_refill_date: new Date(Date.now() + 28 * 86400000).toISOString().split('T')[0]
  });

  // 3. Nutrition Modal State
  const [isNutritionModalOpen, setIsNutritionModalOpen] = useState<boolean>(false);
  const [nutritionForm, setNutritionForm] = useState<{
    diet_type: string;
    dietician_name: string;
    status: NutritionPlan['status'];
    adherence_status: NutritionPlan['adherence_status'];
    clinical_notes: string;
    daily_goals_text: string;
    restrictions_text: string;
  }>({
    diet_type: '',
    dietician_name: '',
    status: 'Assigned',
    adherence_status: 'Adherent',
    clinical_notes: '',
    daily_goals_text: '',
    restrictions_text: ''
  });

  // 4. Rehabilitation Modal State
  const [isRehabModalOpen, setIsRehabModalOpen] = useState<boolean>(false);
  const [rehabForm, setRehabForm] = useState<{
    rehabilitation_type: string;
    assigned_specialist: string;
    frequency: string;
    status: RehabilitationPlan['status'];
    progress_percentage: number;
    goals_text: string;
  }>({
    rehabilitation_type: '',
    assigned_specialist: '',
    frequency: '',
    status: 'In Progress',
    progress_percentage: 40,
    goals_text: ''
  });

  // 5. Coverage Modal State
  const [isCoverageModalOpen, setIsCoverageModalOpen] = useState<boolean>(false);
  const [coverageForm, setCoverageForm] = useState<{
    coverage_type: string;
    provider: string;
    policy_or_member_id: string;
    coverage_status: PatientCoverage['coverage_status'];
    emergency_support_eligibility: PatientCoverage['emergency_support_eligibility'];
    notes: string;
  }>({
    coverage_type: '',
    provider: '',
    policy_or_member_id: '',
    coverage_status: 'Active',
    emergency_support_eligibility: 'Eligible',
    notes: ''
  });

  // 6. Readmission Modal State
  const [isReadmissionModalOpen, setIsReadmissionModalOpen] = useState<boolean>(false);
  const [readmissionForm, setReadmissionForm] = useState<{
    readmission_type: string;
    days_since_discharge: number;
    previous_encounter_id: string;
    new_encounter_id: string;
    primary_diagnosis: string;
  }>({
    readmission_type: '',
    days_since_discharge: 1,
    previous_encounter_id: '',
    new_encounter_id: '',
    primary_diagnosis: ''
  });

  const { openCopilot } = useCopilot();

  useEffect(() => {
    const fetchPlan = async () => {
      try {
        setLoading(true);
        const data = await postDischargeService.getPatientPostDischargePlan(patientId);
        setPlan(data);
        if (data?.follow_up_visits?.length) {
          setNewVisitWeek(data.follow_up_visits.length + 1);
        }
      } catch (err: any) {
        console.error('Failed to load post-discharge plan:', err);
        setError('Unable to load post-discharge recovery plan.');
      } finally {
        setLoading(false);
      }
    };

    fetchPlan();
  }, [patientId]);

  const showFeedback = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMessage({ text, type });
    setTimeout(() => setFeedbackMessage(null), 3500);
  };

  // Toggle completion: Complete <-> Reopened / Scheduled
  const handleToggleVisitCompletion = async (visit: FollowUpVisit) => {
    if (!plan) return;
    const isCompleted = visit.status === 'Completed';
    const nextStatus = isCompleted ? 'Scheduled' : 'Completed';
    const completedDate = isCompleted ? null : new Date().toISOString().split('T')[0];

    try {
      setActionLoadingId(visit.id);
      const res = await postDischargeService.updateFollowUp(
        visit.id,
        { status: nextStatus as any, completed_date: completedDate as any },
        patientId
      );

      const updatedVisits = plan.follow_up_visits.map(v =>
        v.id === visit.id
          ? { ...v, status: nextStatus as any, completed_date: completedDate }
          : v
      );
      const totalVisits = updatedVisits.length;
      const completedCount = updatedVisits.filter(v => v.status === 'Completed').length;
      const newRate = totalVisits > 0 ? Math.round((completedCount / totalVisits) * 100) : 0;

      setPlan({
        ...plan,
        follow_up_visits: updatedVisits,
        follow_up_completion_rate: res?.completion_rate ?? newRate
      });

      showFeedback(
        isCompleted
          ? `Visit W${visit.week_number} status reopened to ${nextStatus}.`
          : `Visit W${visit.week_number} marked as Completed!`
      );
    } catch (err: any) {
      console.error('Failed to update visit status:', err);
      showFeedback('Failed to update visit status.', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Quick status change dropdown
  const handleStatusChange = async (visitId: number, newStatus: string) => {
    if (!plan) return;
    try {
      setActionLoadingId(visitId);
      const completedDate = newStatus === 'Completed' ? new Date().toISOString().split('T')[0] : null;
      const res = await postDischargeService.updateFollowUp(
        visitId,
        { status: newStatus as any, completed_date: completedDate as any },
        patientId
      );

      const updatedVisits = plan.follow_up_visits.map(v =>
        v.id === visitId
          ? { ...v, status: newStatus as any, completed_date: completedDate }
          : v
      );
      const totalVisits = updatedVisits.length;
      const completedCount = updatedVisits.filter(v => v.status === 'Completed').length;
      const newRate = totalVisits > 0 ? Math.round((completedCount / totalVisits) * 100) : 0;

      setPlan({
        ...plan,
        follow_up_visits: updatedVisits,
        follow_up_completion_rate: res?.completion_rate ?? newRate
      });

      showFeedback(`Visit status changed to ${newStatus}.`);
    } catch (err: any) {
      console.error('Failed to change status:', err);
      showFeedback('Failed to update visit status.', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Save changes from Edit Visit Modal
  const handleSaveEditVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plan || !editingVisit) return;

    try {
      setSavingEdit(true);
      const res = await postDischargeService.updateFollowUp(
        editingVisit.id,
        {
          visit_type: editingVisit.visit_type,
          scheduled_date: editingVisit.scheduled_date,
          assigned_clinician: editingVisit.assigned_clinician,
          status: editingVisit.status,
          completed_date: editingVisit.status === 'Completed' ? (editingVisit.completed_date || new Date().toISOString().split('T')[0]) : null,
          notes: editingVisit.notes,
          outcome: editingVisit.outcome
        },
        patientId
      );

      const updatedVisits = plan.follow_up_visits.map(v =>
        v.id === editingVisit.id ? { ...editingVisit } : v
      );
      const totalVisits = updatedVisits.length;
      const completedCount = updatedVisits.filter(v => v.status === 'Completed').length;
      const newRate = totalVisits > 0 ? Math.round((completedCount / totalVisits) * 100) : 0;

      setPlan({
        ...plan,
        follow_up_visits: updatedVisits,
        follow_up_completion_rate: res?.completion_rate ?? newRate
      });

      setEditingVisit(null);
      showFeedback('Follow-up visit details saved successfully.');
    } catch (err: any) {
      console.error('Failed to save visit changes:', err);
      showFeedback('Failed to save visit changes.', 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  // Delete / Cancel a visit
  const handleDeleteVisit = async (visitId: number) => {
    if (!plan) return;
    if (!window.confirm('Are you sure you want to remove this follow-up visit from the schedule?')) {
      return;
    }

    try {
      setActionLoadingId(visitId);
      const res = await postDischargeService.deleteFollowUp(visitId, patientId);
      const updatedVisits = plan.follow_up_visits.filter(v => v.id !== visitId);
      const totalVisits = updatedVisits.length;
      const completedCount = updatedVisits.filter(v => v.status === 'Completed').length;
      const newRate = totalVisits > 0 ? Math.round((completedCount / totalVisits) * 100) : 0;

      setPlan({
        ...plan,
        follow_up_visits: updatedVisits,
        follow_up_completion_rate: res?.completion_rate ?? newRate
      });
      showFeedback('Follow-up visit removed from schedule.');
    } catch (err: any) {
      console.error('Failed to remove visit:', err);
      showFeedback('Failed to remove follow-up visit.', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Add new visit
  const handleAddVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plan) return;

    try {
      setAddingVisit(true);
      const newVisitPayload = {
        week_number: newVisitWeek,
        visit_type: newVisitType,
        scheduled_date: newVisitDate,
        assigned_clinician: newVisitClinician,
        status: 'Scheduled' as const,
        notes: newVisitNotes || 'Routine scheduled continuity follow-up.',
        outcome: null
      };

      const res = await postDischargeService.addFollowUp(patientId, newVisitPayload);
      const createdVisit = res?.visit || {
        ...newVisitPayload,
        id: Date.now()
      };

      const updatedVisits = [...plan.follow_up_visits, createdVisit];
      const totalVisits = updatedVisits.length;
      const completedCount = updatedVisits.filter(v => v.status === 'Completed').length;
      const newRate = totalVisits > 0 ? Math.round((completedCount / totalVisits) * 100) : 0;

      setPlan({
        ...plan,
        follow_up_visits: updatedVisits,
        follow_up_completion_rate: res?.completion_rate ?? newRate
      });

      setIsAddModalOpen(false);
      setNewVisitNotes('');
      setNewVisitWeek(updatedVisits.length + 1);
      showFeedback('New follow-up visit successfully added to schedule!');
    } catch (err: any) {
      console.error('Failed to add follow-up visit:', err);
      showFeedback('Failed to schedule new follow-up visit.', 'error');
    } finally {
      setAddingVisit(false);
    }
  };

  // Quick Medication Status Change
  const handleQuickMedStatusChange = async (medId: number, newStatus: MedicationSupplyItem['status']) => {
    if (!plan) return;
    try {
      const updatedMeds = plan.medication_supplies.map(m => m.id === medId ? { ...m, status: newStatus } : m);
      const updatedPlan = { ...plan, medication_supplies: updatedMeds };
      setPlan(updatedPlan);
      await postDischargeService.updatePostDischargePlan(patientId, { medication_supplies: updatedMeds });
      showFeedback(`Medication status updated to ${newStatus}.`);
    } catch (err) {
      showFeedback('Failed to update medication status.', 'error');
    }
  };

  // Quick Medication Adherence Change
  const handleQuickMedAdherenceChange = async (medId: number, newAdherence: MedicationSupplyItem['adherence_status']) => {
    if (!plan) return;
    try {
      const updatedMeds = plan.medication_supplies.map(m => m.id === medId ? { ...m, adherence_status: newAdherence } : m);
      const updatedPlan = { ...plan, medication_supplies: updatedMeds };
      setPlan(updatedPlan);
      await postDischargeService.updatePostDischargePlan(patientId, { medication_supplies: updatedMeds });
      showFeedback('Adherence status updated.');
    } catch (err) {
      showFeedback('Failed to update adherence status.', 'error');
    }
  };

  // Save Medication (Add / Edit)
  const handleSaveMedication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plan) return;
    try {
      setIsSubmittingSection(true);
      let updatedMeds: MedicationSupplyItem[];
      if (editingMedication) {
        updatedMeds = plan.medication_supplies.map(m =>
          m.id === editingMedication.id
            ? { ...m, ...medForm }
            : m
        );
      } else {
        const newMed: MedicationSupplyItem = {
          id: Date.now(),
          patient_id: patientId,
          prescription_date: new Date().toISOString().split('T')[0],
          expected_supply_date: new Date().toISOString().split('T')[0],
          quantity_status: '30-Day Supply',
          last_verified: new Date().toISOString().split('T')[0],
          verified_by: 'Staff Pharmacist',
          ...medForm
        };
        updatedMeds = [...plan.medication_supplies, newMed];
      }
      setPlan({ ...plan, medication_supplies: updatedMeds });
      await postDischargeService.updatePostDischargePlan(patientId, { medication_supplies: updatedMeds });
      setIsMedModalOpen(false);
      showFeedback(editingMedication ? 'Medication supply updated.' : 'New medication added to supply.');
    } catch (err) {
      showFeedback('Failed to save medication.', 'error');
    } finally {
      setIsSubmittingSection(false);
    }
  };

  // Delete Medication
  const handleDeleteMedication = async (medId: number) => {
    if (!plan) return;
    if (!window.confirm('Remove this medication supply item?')) return;
    try {
      const updatedMeds = plan.medication_supplies.filter(m => m.id !== medId);
      setPlan({ ...plan, medication_supplies: updatedMeds });
      await postDischargeService.updatePostDischargePlan(patientId, { medication_supplies: updatedMeds });
      showFeedback('Medication removed from schedule.');
    } catch (err) {
      showFeedback('Failed to remove medication.', 'error');
    }
  };

  // Save Nutrition Plan
  const handleSaveNutrition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plan) return;
    try {
      setIsSubmittingSection(true);
      const updatedNutrition: NutritionPlan = {
        ...(plan.nutrition_plan || {
          id: Date.now(),
          patient_id: patientId,
          plan_start_date: new Date().toISOString().split('T')[0],
          last_reviewed: new Date().toISOString().split('T')[0],
          next_review: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
          restrictions: []
        }),
        diet_type: nutritionForm.diet_type,
        dietician_name: nutritionForm.dietician_name,
        status: nutritionForm.status,
        adherence_status: nutritionForm.adherence_status,
        clinical_notes: nutritionForm.clinical_notes,
        daily_goals: nutritionForm.daily_goals_text.split('\n').map(s => s.trim()).filter(Boolean),
        restrictions: nutritionForm.restrictions_text.split('\n').map(s => s.trim()).filter(Boolean),
        last_reviewed: new Date().toISOString().split('T')[0]
      };
      setPlan({ ...plan, nutrition_plan: updatedNutrition });
      await postDischargeService.updatePostDischargePlan(patientId, { nutrition_plan: updatedNutrition });
      setIsNutritionModalOpen(false);
      showFeedback('Nutrition & Diet Plan saved successfully.');
    } catch (err) {
      showFeedback('Failed to update nutrition plan.', 'error');
    } finally {
      setIsSubmittingSection(false);
    }
  };

  // Save Rehabilitation Regimen
  const handleSaveRehab = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plan) return;
    try {
      setIsSubmittingSection(true);
      const updatedRehab: RehabilitationPlan = {
        ...(plan.rehabilitation_plan || {
          id: Date.now(),
          patient_id: patientId,
          start_date: new Date().toISOString().split('T')[0],
          expected_end_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
          next_session: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
          sessions: []
        }),
        rehabilitation_type: rehabForm.rehabilitation_type,
        assigned_specialist: rehabForm.assigned_specialist,
        frequency: rehabForm.frequency,
        status: rehabForm.status,
        progress_percentage: rehabForm.progress_percentage,
        goals: rehabForm.goals_text.split('\n').map(s => s.trim()).filter(Boolean)
      };
      setPlan({ ...plan, rehabilitation_plan: updatedRehab });
      await postDischargeService.updatePostDischargePlan(patientId, { rehabilitation_plan: updatedRehab });
      setIsRehabModalOpen(false);
      showFeedback('Rehabilitation regimen saved successfully.');
    } catch (err) {
      showFeedback('Failed to update rehabilitation regimen.', 'error');
    } finally {
      setIsSubmittingSection(false);
    }
  };

  // Save Coverage & Support
  const handleSaveCoverage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plan) return;
    try {
      setIsSubmittingSection(true);
      const updatedCoverage: PatientCoverage = {
        ...(plan.coverage || {
          id: Date.now(),
          patient_id: patientId,
          valid_from: '2025-01-01',
          valid_until: '2026-12-31',
          emergency_coverage: true,
          rehabilitation_coverage: true,
          medication_coverage: true,
          dietician_coverage: true,
          followup_coverage: true
        }),
        coverage_type: coverageForm.coverage_type,
        provider: coverageForm.provider,
        policy_or_member_id: coverageForm.policy_or_member_id,
        coverage_status: coverageForm.coverage_status,
        emergency_support_eligibility: coverageForm.emergency_support_eligibility,
        notes: coverageForm.notes
      };
      setPlan({ ...plan, coverage: updatedCoverage });
      await postDischargeService.updatePostDischargePlan(patientId, { coverage: updatedCoverage });
      setIsCoverageModalOpen(false);
      showFeedback('Coverage details saved successfully.');
    } catch (err) {
      showFeedback('Failed to update coverage details.', 'error');
    } finally {
      setIsSubmittingSection(false);
    }
  };

  // Save / Record Readmission Event
  const handleSaveReadmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plan) return;
    try {
      setIsSubmittingSection(true);
      const newReadmission: ReadmissionEvent = {
        id: Date.now(),
        patient_id: patientId,
        previous_encounter_id: readmissionForm.previous_encounter_id,
        new_encounter_id: readmissionForm.new_encounter_id,
        previous_discharge_date: plan.discharge_date,
        readmission_date: new Date().toISOString().split('T')[0],
        days_since_discharge: readmissionForm.days_since_discharge,
        within_30_days: readmissionForm.days_since_discharge <= 30,
        readmission_type: readmissionForm.readmission_type,
        primary_diagnosis: readmissionForm.primary_diagnosis,
        recorded_at: new Date().toISOString()
      };
      const updatedReadmissions = [...plan.readmissions, newReadmission];
      setPlan({ ...plan, readmissions: updatedReadmissions, recovery_status: 'Readmitted' });
      await postDischargeService.updatePostDischargePlan(patientId, {
        readmissions: updatedReadmissions,
        recovery_status: 'Readmitted'
      });
      setIsReadmissionModalOpen(false);
      showFeedback('Readmission event recorded.');
    } catch (err) {
      showFeedback('Failed to record readmission event.', 'error');
    } finally {
      setIsSubmittingSection(false);
    }
  };

  // Delete Readmission Event
  const handleDeleteReadmission = async (readmissionId: number) => {
    if (!plan) return;
    if (!window.confirm('Delete this readmission event record?')) return;
    try {
      const updatedReadmissions = plan.readmissions.filter(r => r.id !== readmissionId);
      const newRecoveryStatus = updatedReadmissions.length > 0 ? 'Readmitted' : 'Improving';
      setPlan({ ...plan, readmissions: updatedReadmissions, recovery_status: newRecoveryStatus });
      await postDischargeService.updatePostDischargePlan(patientId, {
        readmissions: updatedReadmissions,
        recovery_status: newRecoveryStatus
      });
      showFeedback('Readmission event removed.');
    } catch (err) {
      showFeedback('Failed to remove readmission record.', 'error');
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
      {/* Toast Notification Banner */}
      {feedbackMessage && (
        <div
          className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
              : 'bg-rose-50 text-rose-900 border border-rose-300'
          }`}
        >
          {feedbackMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{feedbackMessage.text}</span>
        </div>
      )}

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
                      ? 'bg-emerald-100 text-emerald-800'
                      : plan.recovery_status === 'Readmitted'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {plan.recovery_status}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                30-Day Longitudinal Surveillance • Primary Care & Multidisciplinary Coordination
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => openCopilot('POST_DISCHARGE_CARE', 'Review post-discharge recovery milestones, medication supplies, and upcoming follow-ups.')}
              className="px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-sky-600" />
              <span>Copilot Care Advice</span>
            </button>
          </div>
        </div>

        {/* Executive Metrics Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Current Risk Status</div>
            <div className="text-sm font-black text-slate-900 mt-1 flex items-center gap-1.5">
              <span>{Math.round(plan.current_risk_score * 100)}%</span>
              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                plan.current_risk_level === 'Critical' ? 'bg-rose-100 text-rose-800' :
                plan.current_risk_level === 'Moderate' ? 'bg-amber-100 text-amber-800' :
                'bg-emerald-100 text-emerald-800'
              }`}>
                {plan.current_risk_level}
              </span>
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
              <TrendingDown className="w-3 h-3 text-emerald-600" />
              <span>Reduced from {Math.round(plan.discharge_risk_score * 100)}% at discharge</span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Visits Completed</div>
            <div className="text-sm font-black text-slate-900 mt-1">
              {plan.follow_up_completion_rate}% ({plan.follow_up_visits.filter(v => v.status === 'Completed').length}/{plan.follow_up_visits.length})
            </div>
            <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
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
          { id: 'timeline', label: 'Follow-Up Schedule', icon: Calendar },
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
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer ${
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Post-Discharge Follow-Up Timeline & Clinical Encounters</h3>
              <p className="text-xs text-slate-500">
                Scheduled primary care, endocrinology, and transitional visits to prevent 30-day readmissions. All items are fully editable and reversible.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                {plan.follow_up_visits.filter(v => v.status === 'Completed').length} of {plan.follow_up_visits.length} Completed ({plan.follow_up_completion_rate}%)
              </span>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="px-3 py-1.5 bg-sky-700 hover:bg-sky-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Schedule New Visit</span>
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {plan.follow_up_visits.map((visit) => {
              const isCompleted = visit.status === 'Completed';
              const isLoading = actionLoadingId === visit.id;

              return (
                <div
                  key={visit.id}
                  className={`p-4 rounded-xl border transition ${
                    isCompleted
                      ? 'bg-emerald-50/40 border-emerald-200'
                      : visit.status === 'Pending'
                      ? 'bg-amber-50/40 border-amber-200'
                      : visit.status === 'Rescheduled'
                      ? 'bg-indigo-50/40 border-indigo-200'
                      : visit.status === 'Missed'
                      ? 'bg-rose-50/40 border-rose-200'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    {/* Visit Info Left */}
                    <div className="flex items-start gap-3 flex-1">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                          isCompleted
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        W{visit.week_number}
                      </div>

                      <div className="space-y-1 flex-1">
                        <div className="font-bold text-xs text-slate-900 flex items-center gap-2 flex-wrap">
                          <span className="text-slate-950 font-extrabold">{visit.visit_type}</span>

                          {/* Quick Status Selector Dropdown */}
                          <select
                            value={visit.status}
                            onChange={(e) => handleStatusChange(visit.id, e.target.value)}
                            disabled={isLoading}
                            className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border focus:outline-none cursor-pointer ${
                              isCompleted
                                ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                : visit.status === 'Pending'
                                ? 'bg-amber-100 text-amber-900 border-amber-300'
                                : visit.status === 'Rescheduled'
                                ? 'bg-indigo-100 text-indigo-900 border-indigo-300'
                                : visit.status === 'Missed'
                                ? 'bg-rose-100 text-rose-900 border-rose-300'
                                : 'bg-slate-100 text-slate-800 border-slate-300'
                            }`}
                          >
                            <option value="Scheduled">Scheduled</option>
                            <option value="Completed">Completed</option>
                            <option value="Pending">Pending</option>
                            <option value="Rescheduled">Rescheduled</option>
                            <option value="Missed">Missed / No-Show</option>
                            <option value="Cancelled">Cancelled</option>
                          </select>
                        </div>

                        <div className="text-[11px] text-slate-600 flex items-center gap-2 flex-wrap">
                          <span>
                            Scheduled Date: <strong className="text-slate-900">{visit.scheduled_date}</strong>
                          </span>
                          <span>•</span>
                          <span>Clinician: <strong className="text-slate-800">{visit.assigned_clinician}</strong></span>
                          {visit.completed_date && (
                            <>
                              <span>•</span>
                              <span className="text-emerald-700 font-bold">
                                Completed on: {visit.completed_date}
                              </span>
                            </>
                          )}
                        </div>

                        {visit.notes && (
                          <div className="text-xs text-slate-700 bg-white/90 p-2.5 rounded-lg border border-slate-200/80 mt-1.5 leading-relaxed">
                            <span className="font-bold text-slate-900 mr-1">Clinical Note:</span>
                            {visit.notes}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Controls Right */}
                    <div className="flex items-center gap-2 shrink-0 self-start md:self-center flex-wrap">
                      {/* Mark Complete or Reopen Button */}
                      {isCompleted ? (
                        <button
                          type="button"
                          onClick={() => handleToggleVisitCompletion(visit)}
                          disabled={isLoading}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          title="Undo completion and reopen this visit"
                        >
                          {isLoading ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-500" />
                          ) : (
                            <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                          )}
                          <span>Reopen Visit</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleToggleVisitCompletion(visit)}
                          disabled={isLoading}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                          title="Mark this visit as completed"
                        >
                          {isLoading ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                          )}
                          <span>Mark Complete</span>
                        </button>
                      )}

                      {/* Edit Button */}
                      <button
                        type="button"
                        onClick={() => setEditingVisit({ ...visit })}
                        disabled={isLoading}
                        className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        title="Edit visit date, clinician, or clinical notes"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                        <span>Edit</span>
                      </button>

                      {/* Delete Button */}
                      <button
                        type="button"
                        onClick={() => handleDeleteVisit(visit.id)}
                        disabled={isLoading}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                        title="Remove visit from schedule"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Section 2: Medication Continuity */}
      {activeSection === 'medication' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Post-Discharge Medication Continuity & Adherence Surveillance</h3>
              <p className="text-xs text-slate-500">
                Verification that prescribed discharge medications were supplied, tracked for refills, and actively adhered to.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditingMedication(null);
                setMedForm({
                  medication_name: '',
                  dosage: '',
                  frequency: 'Daily (Morning)',
                  status: 'Supplied',
                  adherence_status: 'Confirmed',
                  supplier: 'Hospital Outpatient Pharmacy',
                  next_refill_date: new Date(Date.now() + 28 * 86400000).toISOString().split('T')[0]
                });
                setIsMedModalOpen(true);
              }}
              className="px-3 py-1.5 bg-sky-700 hover:bg-sky-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Medication Supply</span>
            </button>
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
                  <th className="p-3 text-right">Actions</th>
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
                      <select
                        value={med.status}
                        onChange={(e) => handleQuickMedStatusChange(med.id, e.target.value as any)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border focus:outline-none cursor-pointer ${
                          med.status === 'Supplied'
                            ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                            : med.status === 'Partially Supplied' || med.status === 'Pending'
                            ? 'bg-amber-100 text-amber-900 border-amber-300'
                            : 'bg-rose-100 text-rose-900 border-rose-300'
                        }`}
                      >
                        <option value="Supplied">Supplied</option>
                        <option value="Partially Supplied">Partially Supplied</option>
                        <option value="Pending">Pending</option>
                        <option value="Delayed">Delayed</option>
                        <option value="Unavailable">Unavailable</option>
                        <option value="Patient Declined">Patient Declined</option>
                      </select>
                    </td>
                    <td className="p-3">
                      <select
                        value={med.adherence_status}
                        onChange={(e) => handleQuickMedAdherenceChange(med.id, e.target.value as any)}
                        className="px-2 py-0.5 rounded text-[10px] font-bold border border-slate-300 bg-white text-slate-800 focus:outline-none cursor-pointer"
                      >
                        <option value="Confirmed">Confirmed Adherent</option>
                        <option value="Possible Issue">Possible Issue</option>
                        <option value="Unknown">Unknown / Monitoring</option>
                      </select>
                    </td>
                    <td className="p-3 text-slate-600">{med.supplier}</td>
                    <td className="p-3 font-mono font-bold text-sky-800">{med.next_refill_date}</td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingMedication(med);
                            setMedForm({
                              medication_name: med.medication_name,
                              dosage: med.dosage,
                              frequency: med.frequency,
                              status: med.status,
                              adherence_status: med.adherence_status,
                              supplier: med.supplier,
                              next_refill_date: med.next_refill_date
                            });
                            setIsMedModalOpen(true);
                          }}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                          title="Edit Medication Details"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteMedication(med.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                          title="Remove Medication"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Section 3: Nutrition Plan */}
      {activeSection === 'nutrition' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Medical Nutrition Therapy & Diabetes Diet Plan</h3>
              <p className="text-xs text-slate-500">
                Assigned Registered Dietician: <strong>{plan.nutrition_plan?.dietician_name || 'Elena Rostova, RD, LDN'}</strong>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs font-bold rounded-lg">
                Status: {plan.nutrition_plan?.status || 'Assigned'}
              </span>
              <button
                type="button"
                onClick={() => {
                  setNutritionForm({
                    diet_type: plan.nutrition_plan?.diet_type || 'Consistent Carbohydrate Diabetes Meal Plan (1800 kcal/day)',
                    dietician_name: plan.nutrition_plan?.dietician_name || 'Elena Rostova, RD, LDN',
                    status: plan.nutrition_plan?.status || 'In Progress',
                    adherence_status: plan.nutrition_plan?.adherence_status || 'Adherent',
                    clinical_notes: plan.nutrition_plan?.clinical_notes || 'Focus on complex carbohydrates, high soluble fiber, and consistent meal timing.',
                    daily_goals_text: (plan.nutrition_plan?.daily_goals || ['Carbohydrate Target: 45-60g per meal', 'Dietary Fiber: ≥ 30g daily', 'Hydration: 2.0 - 2.5 Liters daily water intake']).join('\n'),
                    restrictions_text: (plan.nutrition_plan?.restrictions || ['Avoid sugar-sweetened beverages & fruit juices', 'Limit sodium < 2000 mg/day']).join('\n')
                  });
                  setIsNutritionModalOpen(true);
                }}
                className="px-3 py-1.5 bg-sky-700 hover:bg-sky-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Nutrition Plan</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="text-xs font-bold text-slate-900 uppercase tracking-wider">Prescribed Meal Plan</div>
              <div className="text-xs text-slate-800 font-bold">{plan.nutrition_plan?.diet_type || 'Consistent Carbohydrate Diabetes Meal Plan (1800 kcal/day)'}</div>
              <div className="text-[11px] text-slate-600 pt-2 border-t border-slate-200 leading-relaxed">
                {plan.nutrition_plan?.clinical_notes || 'Personalized medical nutrition therapy emphasizing postprandial glycemic control.'}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="text-xs font-bold text-slate-900 uppercase tracking-wider">Daily Nutritional Goals</div>
              <ul className="text-xs text-slate-700 space-y-1 list-disc list-inside">
                {(plan.nutrition_plan?.daily_goals || [
                  'Carbohydrate Target: 45-60g per meal',
                  'Dietary Fiber: ≥ 30g daily',
                  'Hydration: 2.0 - 2.5 Liters daily water intake'
                ]).map((g, idx) => (
                  <li key={idx}>{g}</li>
                ))}
              </ul>
            </div>
          </div>

          {plan.nutrition_plan?.restrictions && plan.nutrition_plan.restrictions.length > 0 && (
            <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl text-xs space-y-1">
              <span className="font-bold text-amber-900">Dietary Restrictions & Cautions:</span>
              <div className="flex items-center gap-2 flex-wrap mt-1">
                {plan.nutrition_plan.restrictions.map((r, idx) => (
                  <span key={idx} className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded font-medium text-[11px] border border-amber-300">
                    ⚠ {r}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Section 4: Rehabilitation */}
      {activeSection === 'rehabilitation' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Physical Rehabilitation & Mobility Regimen</h3>
              <p className="text-xs text-slate-500">
                Assigned Specialist: <strong>{plan.rehabilitation_plan?.assigned_specialist || 'David Chen, DPT'}</strong> ({plan.rehabilitation_plan?.frequency || '2 sessions / week'})
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-lg">
                {plan.rehabilitation_plan?.status || 'In Progress'} ({plan.rehabilitation_plan?.progress_percentage ?? 40}%)
              </span>
              <button
                type="button"
                onClick={() => {
                  setRehabForm({
                    rehabilitation_type: plan.rehabilitation_plan?.rehabilitation_type || 'Diabetic Mobility & Strength Conditioning',
                    assigned_specialist: plan.rehabilitation_plan?.assigned_specialist || 'David Chen, DPT',
                    frequency: plan.rehabilitation_plan?.frequency || '2 sessions / week',
                    status: plan.rehabilitation_plan?.status || 'In Progress',
                    progress_percentage: plan.rehabilitation_plan?.progress_percentage ?? 40,
                    goals_text: (plan.rehabilitation_plan?.goals || [
                      'Independent home transfers and balance stability',
                      '30-minute structured daily aerobic walking',
                      'Diabetic lower-limb neuropathy fall prevention protocol'
                    ]).join('\n')
                  });
                  setIsRehabModalOpen(true);
                }}
                className="px-3 py-1.5 bg-sky-700 hover:bg-sky-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Rehabilitation</span>
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-xs font-bold text-slate-800">Target Rehabilitation Milestones:</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {(plan.rehabilitation_plan?.goals || [
                'Independent home transfers and balance stability',
                '30-minute structured daily aerobic walking',
                'Diabetic lower-limb neuropathy fall prevention protocol'
              ]).map((goal, idx) => (
                <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 font-medium">
                  ✓ {goal}
                </div>
              ))}
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1">
                <span>Program Completion Progress</span>
                <span className="text-sky-800">{plan.rehabilitation_plan?.progress_percentage ?? 40}%</span>
              </div>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${plan.rehabilitation_plan?.progress_percentage ?? 40}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section 5: Coverage & Emergency Support */}
      {activeSection === 'coverage' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Coverage, Insurance & High-Risk Emergency Assistance</h3>
              <p className="text-xs text-slate-500">
                Institutional programme qualification, copay assistance, and emergency transition funding.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 bg-emerald-100 text-emerald-900 text-xs font-bold rounded-lg border border-emerald-300">
                {plan.coverage?.coverage_status || 'Active'}
              </span>
              <button
                type="button"
                onClick={() => {
                  setCoverageForm({
                    coverage_type: plan.coverage?.coverage_type || 'Medicare Part B / Dual Advantage',
                    provider: plan.coverage?.provider || 'Blue Cross Blue Shield Medicare Advantage',
                    policy_or_member_id: plan.coverage?.policy_or_member_id || 'MED-902488102',
                    coverage_status: plan.coverage?.coverage_status || 'Active',
                    emergency_support_eligibility: plan.coverage?.emergency_support_eligibility || 'Eligible',
                    notes: plan.coverage?.notes || 'Patient qualifies for hospital-sponsored transitional care medication and remote monitoring support.'
                  });
                  setIsCoverageModalOpen(true);
                }}
                className="px-3 py-1.5 bg-sky-700 hover:bg-sky-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Coverage</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
              <div className="font-bold text-slate-900">Primary Insurance Plan</div>
              <div>Type: <strong>{plan.coverage?.coverage_type || 'Medicare Part B'}</strong></div>
              <div>Provider: {plan.coverage?.provider || 'Blue Cross Blue Shield'}</div>
              <div>Policy ID: <span className="font-mono font-bold text-slate-800">{plan.coverage?.policy_or_member_id || 'MED-902488102'}</span></div>
            </div>

            <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2 text-xs">
              <div className="font-bold text-indigo-950 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                High-Risk Readmission Support Eligibility
              </div>
              <div className="text-indigo-900">
                Status: <strong className="text-emerald-700">{plan.coverage?.emergency_support_eligibility || 'Eligible'}</strong>
              </div>
              <p className="text-[11px] text-indigo-800 leading-relaxed">
                {plan.coverage?.notes || 'Patient qualifies for hospital-sponsored transitional care medication support.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Section 6: Readmission History */}
      {activeSection === 'readmissions' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Longitudinal Readmission Event History</h3>
              <p className="text-xs text-slate-500">
                Audited 30-day early vs late re-admission events linked to this patient master record.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setReadmissionForm({
                  readmission_type: 'Early Unplanned 30-Day Readmission',
                  days_since_discharge: 12,
                  previous_encounter_id: `ENC-${patientId}-PREV`,
                  new_encounter_id: `ENC-${patientId}-READMIT`,
                  primary_diagnosis: 'Acute Hyperglycemic Crisis / Non-Ketotic Decompensation'
                });
                setIsReadmissionModalOpen(true);
              }}
              className="px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record Readmission Event</span>
            </button>
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
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-rose-200 text-rose-900 rounded text-[10px] font-black">
                        {r.days_since_discharge} Days Post-Discharge
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteReadmission(r.id)}
                        className="p-1 text-slate-400 hover:text-rose-700 transition cursor-pointer"
                        title="Delete Record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
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

      {/* MODAL 0: Edit Follow-Up Visit Modal */}
      {editingVisit && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-sky-700" />
                <h3 className="text-sm font-extrabold text-slate-900">
                  Edit Follow-Up Visit (Week {editingVisit.week_number})
                </h3>
              </div>
              <button
                onClick={() => setEditingVisit(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditVisit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Visit Title / Type</label>
                <input
                  type="text"
                  required
                  value={editingVisit.visit_type}
                  onChange={(e) => setEditingVisit({ ...editingVisit, visit_type: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Scheduled Date</label>
                  <input
                    type="date"
                    required
                    value={editingVisit.scheduled_date}
                    onChange={(e) => setEditingVisit({ ...editingVisit, scheduled_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Visit Status</label>
                  <select
                    value={editingVisit.status}
                    onChange={(e) => setEditingVisit({ ...editingVisit, status: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  >
                    <option value="Scheduled">Scheduled</option>
                    <option value="Completed">Completed</option>
                    <option value="Pending">Pending</option>
                    <option value="Rescheduled">Rescheduled</option>
                    <option value="Missed">Missed / No-Show</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Assigned Clinician</label>
                <input
                  type="text"
                  required
                  value={editingVisit.assigned_clinician}
                  onChange={(e) => setEditingVisit({ ...editingVisit, assigned_clinician: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Clinical Progress & Notes</label>
                <textarea
                  rows={3}
                  value={editingVisit.notes || ''}
                  onChange={(e) => setEditingVisit({ ...editingVisit, notes: e.target.value })}
                  placeholder="Enter clinical observations, vitals, medication adherence review..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingVisit(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold cursor-pointer transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-4 py-2 bg-sky-700 hover:bg-sky-800 text-white rounded-lg font-bold flex items-center gap-1.5 cursor-pointer transition disabled:opacity-50"
                >
                  {savingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 0B: Add New Follow-Up Visit Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-sky-700" />
                <h3 className="text-sm font-extrabold text-slate-900">
                  Schedule New Follow-Up Visit
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddVisit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-slate-700 font-bold mb-1">Week #</label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    required
                    value={newVisitWeek}
                    onChange={(e) => setNewVisitWeek(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-slate-700 font-bold mb-1">Scheduled Date</label>
                  <input
                    type="date"
                    required
                    value={newVisitDate}
                    onChange={(e) => setNewVisitDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Visit Type</label>
                <select
                  value={newVisitType}
                  onChange={(e) => setNewVisitType(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500"
                >
                  <option value="Primary Care Follow-Up (In-Person)">Primary Care Follow-Up (In-Person)</option>
                  <option value="Certified Diabetes Educator (Telehealth)">Certified Diabetes Educator (Telehealth)</option>
                  <option value="Endocrinology Glycemic Review">Endocrinology Glycemic Review</option>
                  <option value="Cardiology Continuity Review">Cardiology Continuity Review</option>
                  <option value="Clinical Pharmacist Med Rec">Clinical Pharmacist Med Rec</option>
                  <option value="Home Health Nurse Assessment">Home Health Nurse Assessment</option>
                  <option value="30-Day Transition Assessment">30-Day Transition Assessment</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Assigned Clinician</label>
                <input
                  type="text"
                  required
                  value={newVisitClinician}
                  onChange={(e) => setNewVisitClinician(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Initial Clinical Instructions / Notes</label>
                <textarea
                  rows={3}
                  value={newVisitNotes}
                  onChange={(e) => setNewVisitNotes(e.target.value)}
                  placeholder="Specify clinical objectives, required diagnostic labs, or patient reminders..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold cursor-pointer transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingVisit}
                  className="px-4 py-2 bg-sky-700 hover:bg-sky-800 text-white rounded-lg font-bold flex items-center gap-1.5 cursor-pointer transition disabled:opacity-50"
                >
                  {addingVisit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>Schedule Visit</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 1: Add/Edit Medication Supply */}
      {isMedModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Pill className="w-4 h-4 text-sky-700" />
                <span>{editingMedication ? 'Edit Medication Supply' : 'Add Medication Supply'}</span>
              </h3>
              <button onClick={() => setIsMedModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMedication} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Medication Name</label>
                  <input
                    type="text"
                    required
                    value={medForm.medication_name}
                    onChange={(e) => setMedForm({ ...medForm, medication_name: e.target.value })}
                    placeholder="e.g. Insulin Glargine"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Dosage</label>
                  <input
                    type="text"
                    required
                    value={medForm.dosage}
                    onChange={(e) => setMedForm({ ...medForm, dosage: e.target.value })}
                    placeholder="e.g. 24 units subcutaneous"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Frequency</label>
                  <input
                    type="text"
                    required
                    value={medForm.frequency}
                    onChange={(e) => setMedForm({ ...medForm, frequency: e.target.value })}
                    placeholder="e.g. Once daily at bedtime"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Supply Status</label>
                  <select
                    value={medForm.status}
                    onChange={(e) => setMedForm({ ...medForm, status: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  >
                    <option value="Supplied">Supplied</option>
                    <option value="Partially Supplied">Partially Supplied</option>
                    <option value="Pending">Pending</option>
                    <option value="Delayed">Delayed</option>
                    <option value="Unavailable">Unavailable</option>
                    <option value="Patient Declined">Patient Declined</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Adherence Status</label>
                  <select
                    value={medForm.adherence_status}
                    onChange={(e) => setMedForm({ ...medForm, adherence_status: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  >
                    <option value="Confirmed">Confirmed</option>
                    <option value="Possible Issue">Possible Issue</option>
                    <option value="Unknown">Unknown</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Next Refill Date</label>
                  <input
                    type="date"
                    required
                    value={medForm.next_refill_date}
                    onChange={(e) => setMedForm({ ...medForm, next_refill_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Supplier / Pharmacy</label>
                <input
                  type="text"
                  required
                  value={medForm.supplier}
                  onChange={(e) => setMedForm({ ...medForm, supplier: e.target.value })}
                  placeholder="e.g. Hospital Outpatient Pharmacy"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsMedModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingSection}
                  className="px-4 py-2 bg-sky-700 hover:bg-sky-800 text-white rounded-lg font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingSection ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Save Medication</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Edit Nutrition Plan */}
      {isNutritionModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Apple className="w-4 h-4 text-sky-700" />
                <span>Edit Nutrition & Diet Plan</span>
              </h3>
              <button onClick={() => setIsNutritionModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNutrition} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Prescribed Meal Plan / Diet Type</label>
                <input
                  type="text"
                  required
                  value={nutritionForm.diet_type}
                  onChange={(e) => setNutritionForm({ ...nutritionForm, diet_type: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Assigned Dietician</label>
                  <input
                    type="text"
                    required
                    value={nutritionForm.dietician_name}
                    onChange={(e) => setNutritionForm({ ...nutritionForm, dietician_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Status</label>
                  <select
                    value={nutritionForm.status}
                    onChange={(e) => setNutritionForm({ ...nutritionForm, status: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  >
                    <option value="Assigned">Assigned</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Review Due">Review Due</option>
                    <option value="Completed">Completed</option>
                    <option value="Paused">Paused</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Daily Carbohydrate & Dietary Goals (one per line)</label>
                <textarea
                  rows={3}
                  value={nutritionForm.daily_goals_text}
                  onChange={(e) => setNutritionForm({ ...nutritionForm, daily_goals_text: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Dietary Restrictions (one per line)</label>
                <textarea
                  rows={2}
                  value={nutritionForm.restrictions_text}
                  onChange={(e) => setNutritionForm({ ...nutritionForm, restrictions_text: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Clinical Instructions & Notes</label>
                <textarea
                  rows={2}
                  value={nutritionForm.clinical_notes}
                  onChange={(e) => setNutritionForm({ ...nutritionForm, clinical_notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNutritionModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingSection}
                  className="px-4 py-2 bg-sky-700 hover:bg-sky-800 text-white rounded-lg font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingSection ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Save Nutrition Plan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Edit Rehabilitation Plan */}
      {isRehabModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-sky-700" />
                <span>Edit Rehabilitation Regimen</span>
              </h3>
              <button onClick={() => setIsRehabModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRehab} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Rehabilitation Regimen Title</label>
                <input
                  type="text"
                  required
                  value={rehabForm.rehabilitation_type}
                  onChange={(e) => setRehabForm({ ...rehabForm, rehabilitation_type: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Assigned Specialist</label>
                  <input
                    type="text"
                    required
                    value={rehabForm.assigned_specialist}
                    onChange={(e) => setRehabForm({ ...rehabForm, assigned_specialist: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Frequency</label>
                  <input
                    type="text"
                    required
                    value={rehabForm.frequency}
                    onChange={(e) => setRehabForm({ ...rehabForm, frequency: e.target.value })}
                    placeholder="e.g. 2 sessions / week"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Status</label>
                  <select
                    value={rehabForm.status}
                    onChange={(e) => setRehabForm({ ...rehabForm, status: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  >
                    <option value="Planned">Planned</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="Paused">Paused</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Progress Percentage (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    required
                    value={rehabForm.progress_percentage}
                    onChange={(e) => setRehabForm({ ...rehabForm, progress_percentage: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Rehabilitation Goals (one per line)</label>
                <textarea
                  rows={3}
                  value={rehabForm.goals_text}
                  onChange={(e) => setRehabForm({ ...rehabForm, goals_text: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRehabModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingSection}
                  className="px-4 py-2 bg-sky-700 hover:bg-sky-800 text-white rounded-lg font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingSection ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Save Rehabilitation</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Edit Coverage & Support */}
      {isCoverageModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-sky-700" />
                <span>Edit Coverage & Financial Support</span>
              </h3>
              <button onClick={() => setIsCoverageModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCoverage} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Coverage / Insurance Type</label>
                  <input
                    type="text"
                    required
                    value={coverageForm.coverage_type}
                    onChange={(e) => setCoverageForm({ ...coverageForm, coverage_type: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Insurance Provider</label>
                  <input
                    type="text"
                    required
                    value={coverageForm.provider}
                    onChange={(e) => setCoverageForm({ ...coverageForm, provider: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Policy / Member ID</label>
                  <input
                    type="text"
                    required
                    value={coverageForm.policy_or_member_id}
                    onChange={(e) => setCoverageForm({ ...coverageForm, policy_or_member_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Coverage Status</label>
                  <select
                    value={coverageForm.coverage_status}
                    onChange={(e) => setCoverageForm({ ...coverageForm, coverage_status: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  >
                    <option value="Active">Active</option>
                    <option value="Pending Verification">Pending Verification</option>
                    <option value="Expired">Expired</option>
                    <option value="Self-Pay">Self-Pay</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Emergency & High-Risk Support Eligibility</label>
                <select
                  value={coverageForm.emergency_support_eligibility}
                  onChange={(e) => setCoverageForm({ ...coverageForm, emergency_support_eligibility: e.target.value as any })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500"
                >
                  <option value="Eligible">Eligible (Full Program Benefits)</option>
                  <option value="Potentially Eligible">Potentially Eligible (Under Review)</option>
                  <option value="Not Eligible">Not Eligible</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Coverage Notes & Co-Pay Directives</label>
                <textarea
                  rows={3}
                  value={coverageForm.notes}
                  onChange={(e) => setCoverageForm({ ...coverageForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCoverageModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingSection}
                  className="px-4 py-2 bg-sky-700 hover:bg-sky-800 text-white rounded-lg font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingSection ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Save Coverage</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: Add Readmission Event */}
      {isReadmissionModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-rose-600" />
                <span>Record Readmission Event</span>
              </h3>
              <button onClick={() => setIsReadmissionModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveReadmission} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Readmission Event Type</label>
                  <input
                    type="text"
                    required
                    value={readmissionForm.readmission_type}
                    onChange={(e) => setReadmissionForm({ ...readmissionForm, readmission_type: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Days Post-Discharge</label>
                  <input
                    type="number"
                    min={1}
                    max={90}
                    required
                    value={readmissionForm.days_since_discharge}
                    onChange={(e) => setReadmissionForm({ ...readmissionForm, days_since_discharge: parseInt(e.target.value, 10) || 1 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Previous Encounter ID</label>
                  <input
                    type="text"
                    required
                    value={readmissionForm.previous_encounter_id}
                    onChange={(e) => setReadmissionForm({ ...readmissionForm, previous_encounter_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">New Encounter ID</label>
                  <input
                    type="text"
                    required
                    value={readmissionForm.new_encounter_id}
                    onChange={(e) => setReadmissionForm({ ...readmissionForm, new_encounter_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Primary Readmission Diagnosis</label>
                <input
                  type="text"
                  required
                  value={readmissionForm.primary_diagnosis}
                  onChange={(e) => setReadmissionForm({ ...readmissionForm, primary_diagnosis: e.target.value })}
                  placeholder="e.g. Acute Hyperglycemic Crisis"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsReadmissionModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingSection}
                  className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-lg font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingSection ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Record Event</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
