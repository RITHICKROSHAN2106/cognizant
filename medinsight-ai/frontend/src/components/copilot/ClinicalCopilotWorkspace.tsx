import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  X,
  Send,
  User,
  ShieldCheck,
  Activity,
  AlertCircle,
  Copy,
  Check,
  PlusCircle,
  RotateCcw,
  BookOpen,
  HelpCircle,
  ThumbsUp,
  ThumbsDown,
  Layers,
  ChevronRight,
  Pill,
  HeartPulse,
  Scale
} from 'lucide-react';
import { useCopilot } from '../../contexts/CopilotContext';

export const ClinicalCopilotWorkspace: React.FC = () => {
  const {
    isOpen,
    closeCopilot,
    activePatient,
    activeEncounterId,
    activeContextType,
    messages,
    isLoading,
    sendMessage,
    clearSession,
    patientSwitchedNotice,
    dismissSwitchNotice
  } = useCopilot();

  const [inputVal, setInputVal] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [confirmActionModal, setConfirmActionModal] = useState<any | null>(null);
  const [feedbackGiven, setFeedbackGiven] = useState<{ [msgId: string]: 'up' | 'down' }>({});
  const [carePlanSuccess, setCarePlanSuccess] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (!isOpen) return null;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim() || isLoading) return;
    sendMessage(inputVal);
    setInputVal('');
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleConfirmAddToCarePlan = (action: any) => {
    setConfirmActionModal(action);
  };

  const executeAddCarePlan = () => {
    if (!confirmActionModal) return;
    setCarePlanSuccess(`Added "${confirmActionModal.title}" to patient care plan.`);
    setConfirmActionModal(null);
    setTimeout(() => setCarePlanSuccess(null), 3000);
  };

  // Context-specific quick action prompts
  const getContextualQuickActions = () => {
    if (!activePatient) {
      return [
        { label: 'Hospital Readmission Guidelines', prompt: 'Summarize standard 30-day hospital readmission reduction protocols.' },
        { label: 'ADA 2026 Diabetes Standards', prompt: 'What are the ADA 2026 inpatient glycemic targets for diabetic patients?' },
        { label: 'Post-Discharge Care Checklist', prompt: 'What are the core components of an effective post-discharge transitional care bundle?' }
      ];
    }

    switch (activeContextType) {
      case 'READMISSION_RISK':
      case 'EXPLAIN_PREDICTION':
        return [
          { label: 'Explain Model Prediction', prompt: 'Why is this patient classified under their current readmission risk tier?' },
          { label: 'Key TreeSHAP Risk Drivers', prompt: 'Summarize the primary ML feature drivers increasing this patient’s readmission probability.' },
          { label: 'Compare With Prior Encounters', prompt: 'How does this admission compare with previous inpatient utilization?' }
        ];
      case 'VITALS':
        return [
          { label: 'Summarize Current Vitals', prompt: 'Synthesize the latest inpatient vital signs and highlight any abnormal values.' },
          { label: 'Review Blood Glucose Trends', prompt: 'Assess the POC blood glucose readings and glycemic control stability.' }
        ];
      case 'LABS':
      case 'RESULTS':
        return [
          { label: 'Summarize Laboratory Results', prompt: 'Summarize recent HbA1c, fasting glucose, and renal function lab panels.' },
          { label: 'Renal & Electrolyte Review', prompt: 'Check eGFR, BUN, and serum creatinine for potential acute kidney stress.' }
        ];
      case 'MEDICATIONS':
        return [
          { label: 'Review Medication Regimen', prompt: 'Summarize active medications and verify insulin titration schedule.' },
          { label: 'Polypharmacy & Interactions', prompt: 'Screen the prescribed medications for interaction risks and contraindications.' }
        ];
      case 'DISCHARGE':
        return [
          { label: 'Prepare Discharge Review', prompt: 'Evaluate discharge readiness, pending barriers, and required transition supplies.' },
          { label: 'Identify Pending Items', prompt: 'What clinical orders or education remain pending prior to safe discharge?' }
        ];
      case 'POST_DISCHARGE_CARE':
      case 'RECOVERY':
        return [
          { label: 'Summarize Recovery Status', prompt: 'Provide a concise overview of post-discharge recovery, visit timeline, and medication supply.' },
          { label: 'Review 4-Week Follow-Up', prompt: 'What are the scheduled follow-up visits and upcoming primary care appointments?' },
          { label: 'Check Diet & Rehab Regimen', prompt: 'Review the dietician nutrition goals and physical therapy progress.' }
        ];
      default:
        return [
          { label: 'Summarize Current Encounter', prompt: 'Provide a concise clinical summary of this patient encounter and primary diagnosis.' },
          { label: 'Review Readmission Risk', prompt: 'What is the readmission risk probability and key clinical drivers?' },
          { label: 'Review Medications & Vitals', prompt: 'Synthesize active medications, current vitals, and diagnostic lab findings.' }
        ];
    }
  };

  const quickActions = getContextualQuickActions();

  return (
    <aside
      className="fixed inset-y-0 right-0 z-40 w-full sm:w-[420px] bg-white border-l border-slate-200 shadow-2xl flex flex-col transition-all duration-300 ease-in-out"
      aria-label="Clinical AI Copilot Workspace"
    >
      {/* Copilot Header */}
      <div className="px-4 py-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-sky-600 flex items-center justify-center text-white shadow-xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-black tracking-wide text-white uppercase flex items-center gap-1.5">
              <span>Clinical Copilot</span>
              <span className="px-1.5 py-0.5 rounded text-[9px] bg-sky-500/20 text-sky-300 font-bold border border-sky-400/30">
                CDS v2.1
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-medium">
              Context-Aware Decision Support Assistant
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={clearSession}
            title="Clear active conversation"
            className="p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={closeCopilot}
            title="Close Copilot panel"
            className="p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Active Clinical Context Bar */}
      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-xs">
        {activePatient ? (
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span className="font-bold text-slate-900 truncate">
                {activePatient.first_name ? `${activePatient.first_name[0]}. ${activePatient.last_name}` : `Patient #${activePatient.id}`}
              </span>
              <span className="text-[10px] font-mono text-slate-500 shrink-0">
                {activePatient.mrn}
              </span>
            </div>
            <span className="text-[10px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200 shrink-0">
              {activeEncounterId || `ENC-${activePatient.id}`}
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-medium flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
              No Patient Context Selected
            </span>
            <span className="text-[10px] text-slate-400">General CDS Mode</span>
          </div>
        )}
      </div>

      {/* Patient Switch Alert Notice */}
      {patientSwitchedNotice && (
        <div className="px-4 py-2.5 bg-sky-50 border-b border-sky-200 text-[11px] text-sky-900 flex items-start justify-between gap-2">
          <div className="flex items-start gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-sky-700 shrink-0 mt-0.5" />
            <div>
              <strong>Patient context changed.</strong>
              <p className="text-[10px] text-sky-700 mt-0.5">
                Previous conversation cleared to maintain strict clinical isolation.
              </p>
            </div>
          </div>
          <button
            onClick={dismissSwitchNotice}
            className="text-sky-700 hover:text-sky-900 font-bold text-xs"
          >
            ×
          </button>
        </div>
      )}

      {/* Success Notification */}
      {carePlanSuccess && (
        <div className="px-4 py-2 bg-emerald-50 border-b border-emerald-200 text-[11px] text-emerald-900 font-medium flex items-center gap-1.5">
          <Check className="w-3.5 h-3.5 text-emerald-600" />
          <span>{carePlanSuccess}</span>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="space-y-4 pt-2">
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2">
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                Clinical Decision Support Assistant
              </div>
              <p className="text-slate-600 leading-relaxed">
                {activePatient
                  ? `Active clinical context loaded for ${activePatient.first_name || 'Patient'} ${activePatient.last_name || ''} (${activePatient.mrn}). Select a quick action below or ask any clinical review question.`
                  : 'You can ask general questions regarding ADA clinical protocols, readmission reduction bundles, or select an inpatient record from the EHR to start contextual assistance.'}
              </p>
            </div>

            {/* Contextual Quick Actions */}
            <div>
              <div className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2">
                Contextual Quick Actions
              </div>
              <div className="space-y-1.5">
                {quickActions.map((qa, idx) => (
                  <button
                    key={idx}
                    onClick={() => sendMessage(qa.prompt)}
                    disabled={isLoading}
                    className="w-full text-left p-2.5 rounded-lg border border-slate-200 hover:border-sky-300 bg-white hover:bg-sky-50/50 text-xs font-semibold text-slate-800 transition flex items-center justify-between group shadow-2xs"
                  >
                    <span>{qa.label}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-600 transition" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1`}
              >
                <div className="text-[10px] text-slate-400 px-1">
                  {isUser ? 'You (Clinician)' : 'Clinical Copilot'} • {msg.timestamp}
                </div>

                <div
                  className={`p-3.5 rounded-xl text-xs leading-relaxed max-w-[92%] shadow-2xs ${
                    isUser
                      ? 'bg-sky-700 text-white rounded-br-none'
                      : 'bg-slate-50 border border-slate-200 text-slate-900 rounded-bl-none'
                  }`}
                >
                  {!isUser && (
                    <div className="mb-2 flex items-center justify-between pb-1.5 border-b border-slate-200/80">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-sky-800 bg-sky-100/70 px-1.5 py-0.5 rounded">
                        Copilot-Generated Decision Support
                      </span>
                      <button
                        onClick={() => handleCopy(msg.content, msg.id)}
                        className="text-slate-400 hover:text-slate-600 transition p-0.5"
                        title="Copy text"
                      >
                        {copiedId === msg.id ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  )}

                  {/* Message Content */}
                  <div className="whitespace-pre-wrap space-y-1.5">{msg.content}</div>

                  {/* Grounded Source Citations */}
                  {!isUser && msg.citations && msg.citations.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-slate-200/70 text-[10px] text-slate-500">
                      <div className="font-bold text-slate-700 flex items-center gap-1 mb-1">
                        <BookOpen className="w-3 h-3 text-sky-600" />
                        Verified Data Sources Grounded:
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {msg.citations.map((c, cIdx) => (
                          <span
                            key={cIdx}
                            className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[9px] text-slate-600"
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Suggested Clinical Actions (Requires Human Confirmation) */}
                  {!isUser && msg.suggested_actions && msg.suggested_actions.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-slate-200 space-y-1.5">
                      <div className="text-[10px] font-bold text-slate-700 flex items-center gap-1">
                        <PlusCircle className="w-3 h-3 text-indigo-600" />
                        Suggested Clinical Actions:
                      </div>
                      {msg.suggested_actions.map((act) => (
                        <button
                          key={act.id}
                          onClick={() => handleConfirmAddToCarePlan(act)}
                          className="w-full text-left p-2 bg-indigo-50 hover:bg-indigo-100/80 border border-indigo-200 rounded-lg text-[11px] font-bold text-indigo-900 transition flex items-center justify-between"
                        >
                          <span>{act.title}</span>
                          <span className="text-[9px] uppercase bg-indigo-200 px-1 py-0.5 rounded font-black text-indigo-800">
                            Review & Add
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Feedback Buttons */}
                  {!isUser && (
                    <div className="mt-2 pt-1 flex items-center justify-end gap-1.5">
                      <button
                        onClick={() =>
                          setFeedbackGiven((prev) => ({ ...prev, [msg.id]: 'up' }))
                        }
                        className={`p-1 rounded text-[10px] transition ${
                          feedbackGiven[msg.id] === 'up'
                            ? 'text-emerald-700 font-bold'
                            : 'text-slate-400 hover:text-slate-600'
                        }`}
                        title="Helpful"
                      >
                        <ThumbsUp className="w-3 h-3 inline mr-0.5" />
                        <span>Helpful</span>
                      </button>
                      <button
                        onClick={() =>
                          setFeedbackGiven((prev) => ({ ...prev, [msg.id]: 'down' }))
                        }
                        className={`p-1 rounded text-[10px] transition ${
                          feedbackGiven[msg.id] === 'down'
                            ? 'text-red-700 font-bold'
                            : 'text-slate-400 hover:text-slate-600'
                        }`}
                        title="Not helpful"
                      >
                        <ThumbsDown className="w-3 h-3 inline mr-0.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-start space-y-1">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-center gap-2 shadow-2xs">
              <div className="w-2 h-2 rounded-full bg-sky-600 animate-ping shrink-0" />
              <span>Reviewing authorized clinical context & TreeSHAP attributions...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="p-3 border-t border-slate-200 bg-white">
        <form onSubmit={handleSend} className="flex items-center gap-2">
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder={
              activePatient
                ? `Ask Copilot about ${activePatient.first_name || 'Patient'}...`
                : 'Ask clinical decision question...'
            }
            disabled={isLoading}
            className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:border-sky-500 transition"
          />
          <button
            type="submit"
            disabled={!inputVal.trim() || isLoading}
            className="p-2 bg-sky-700 hover:bg-sky-800 disabled:bg-slate-200 text-white disabled:text-slate-400 rounded-lg transition"
            title="Send query"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Footer Disclaimer */}
        <div className="mt-2 text-[9px] text-center text-slate-400 font-medium">
          Clinical Decision Support — Copilot responses support clinical review and do not replace professional judgment.
        </div>
      </div>

      {/* Confirmation Modal for Adding to Care Plan */}
      {confirmActionModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-indigo-600" />
                <span>Confirm Clinical Care Plan Addition</span>
              </div>
              <button
                onClick={() => setConfirmActionModal(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-lg text-xs space-y-1.5">
              <div className="font-bold text-indigo-950">{confirmActionModal.title}</div>
              <p className="text-indigo-800 leading-relaxed">
                {confirmActionModal.payload?.description}
              </p>
              <div className="text-[10px] text-indigo-600 font-medium pt-1">
                Suggested by: {confirmActionModal.payload?.suggested_by}
              </div>
            </div>

            <p className="text-xs text-slate-600">
              As the authorized clinician, confirm that you wish to add this verified recommendation into the official patient care plan.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfirmActionModal(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeAddCarePlan}
                className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition"
              >
                Confirm & Add to Care Plan
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
