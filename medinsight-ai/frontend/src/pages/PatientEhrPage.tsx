import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
  Activity,
  FileText,
  Heart,
  Pill,
  ShieldAlert,
  Calendar,
  AlertTriangle,
  Stethoscope,
  BrainCircuit,
  ClipboardCheck,
  FlaskConical,
  BookOpen,
  ArrowLeft,
  Bot,
  Download,
  Printer,
  CheckCircle2,
  Check
} from 'lucide-react';
import { patientService } from '../services/patientService';
import { ehrService } from '../services/ehrService';
import {
  Patient, Encounter, Diagnosis, Observation,
  LabResult, Medication, Allergy, Procedure, ClinicalNote
} from '../types/clinical';
import { PatientBanner } from '../components/patient/PatientBanner';
import { VitalsPanel } from '../components/patient/VitalsPanel';
import { SummaryTab } from '../components/clinical/SummaryTab';
import { EncountersTab } from '../components/clinical/EncountersTab';
import { DiagnosesTab } from '../components/clinical/DiagnosesTab';
import { MedicationsTab } from '../components/clinical/MedicationsTab';
import { AllergiesTab } from '../components/clinical/AllergiesTab';
import { VitalsTab } from '../components/clinical/VitalsTab';
import { LabsTab } from '../components/clinical/LabsTab';
import { ProceduresTab } from '../components/clinical/ProceduresTab';
import { NotesTab } from '../components/clinical/NotesTab';
import { RiskAnalysisTab } from '../components/clinical/RiskAnalysisTab';
import { DischargePlanTab } from '../components/clinical/DischargePlanTab';
import { ChatTab } from '../components/clinical/ChatTab';

export const PatientEhrPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const patientId = Number(id) || 1;
  const currentTab = searchParams.get('tab') || 'summary';

  // Data states
  const [patient, setPatient] = useState<Patient | null>(null);
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [vitals, setVitals] = useState<Observation[]>([]);
  const [labs, setLabs] = useState<LabResult[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [allergies, setAllergies] = useState<Allergy[]>([]);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [notes, setNotes] = useState<ClinicalNote[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadAllPatientData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const results = await Promise.allSettled([
          patientService.getPatientById(patientId),
          ehrService.getEncounters(patientId),
          ehrService.getDiagnoses(patientId),
          ehrService.getVitals(patientId),
          ehrService.getLabs(patientId),
          ehrService.getMedications(patientId),
          ehrService.getAllergies(patientId),
          ehrService.getProcedures(patientId),
          ehrService.getNotes(patientId),
        ]);

        const [
          patientRes,
          encsRes,
          diagsRes,
          vitalsRes,
          labsRes,
          medsRes,
          allergiesRes,
          procsRes,
          notesRes
        ] = results;

        if (patientRes.status === 'fulfilled') {
          setPatient(patientRes.value);
        } else {
          setError('Unable to load patient EHR record from database.');
        }

        if (encsRes.status === 'fulfilled') setEncounters(encsRes.value);
        if (diagsRes.status === 'fulfilled') setDiagnoses(diagsRes.value);
        if (vitalsRes.status === 'fulfilled') setVitals(vitalsRes.value);
        if (labsRes.status === 'fulfilled') setLabs(labsRes.value);
        if (medsRes.status === 'fulfilled') setMedications(medsRes.value);
        if (allergiesRes.status === 'fulfilled') setAllergies(allergiesRes.value);
        if (procsRes.status === 'fulfilled') setProcedures(procsRes.value);
        if (notesRes.status === 'fulfilled') setNotes(notesRes.value);
      } catch (err: any) {
        console.error('Failed to load patient EHR:', err);
        setError('Unable to load patient EHR record from database.');
      } finally {
        setIsLoading(false);
      }
    };

    loadAllPatientData();
  }, [patientId]);


  const handleTabChange = (tabKey: string) => {
    setSearchParams({ tab: tabKey });
  };

  const tabs = [
    { id: 'summary', label: 'Summary', icon: Activity },
    { id: 'encounters', label: `Encounters (${encounters.length})`, icon: Calendar },
    { id: 'diagnoses', label: `Diagnoses (${diagnoses.length})`, icon: FileText },
    { id: 'medications', label: `Medications (${medications.filter(m => m.is_active).length})`, icon: Pill },
    { id: 'allergies', label: `Allergies (${allergies.length})`, icon: ShieldAlert },
    { id: 'vitals', label: 'Vitals', icon: Heart },
    { id: 'labs', label: `Labs (${labs.length})`, icon: FlaskConical },
    { id: 'procedures', label: `Procedures (${procedures.length})`, icon: Stethoscope },
    { id: 'notes', label: `Clinical Notes (${notes.length})`, icon: BookOpen },
    { id: 'risk', label: 'Readmission Risk (ML)', icon: BrainCircuit, badge: `${Math.round((patient?.risk_probability || 0.68) * 100)}% Risk` },
    { id: 'chat', label: 'Clinical AI Copilot', icon: Bot, badge: 'Gemini' },
    { id: 'discharge', label: 'Discharge Plan', icon: ClipboardCheck, badge: 'Active' },
  ];

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-28 bg-slate-200 rounded-xl"></div>
        <div className="h-10 bg-slate-200 rounded-lg"></div>
        <div className="h-96 bg-slate-200 rounded-xl"></div>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="clinical-card p-8 text-center space-y-4 bg-white rounded-xl border border-slate-200">
        <AlertTriangle className="w-10 h-10 text-rose-600 mx-auto" />
        <h2 className="text-base font-bold text-slate-900">EHR Record Unavailable</h2>
        <p className="text-xs text-slate-500">{error || 'Patient not found'}</p>
        <button
          onClick={() => navigate('/patients')}
          className="px-4 py-2 bg-sky-700 text-white rounded-lg text-xs font-bold hover:bg-sky-800"
        >
          Return to Patients Directory
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-slate-900">
      {/* Action Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/patients')}
            className="p-1.5 bg-white border border-slate-300 rounded text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition"
            title="Back to Inpatient Census"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="text-xs text-slate-500 font-medium">
            Inpatient Census / <strong className="text-slate-900">{patient.first_name} {patient.last_name}</strong> (MRN: {patient.mrn})
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Readmission Model Readiness Indicator */}
          <div className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded text-emerald-800 text-[11px] font-bold flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Readmission Model Readiness: Ready</span>
          </div>

          <button
            onClick={() => navigate(`/reports?patientId=${patient.id}`)}
            className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-sm transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Discharge Summary</span>
          </button>
          <button
            onClick={() => navigate(`/reports?patientId=${patient.id}`)}
            className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-xs transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-sky-700" />
            <span>Export Clinical PDF</span>
          </button>
        </div>
      </div>

      {/* Persistent Patient Banner */}
      <PatientBanner patient={patient} />

      {/* Scoped Patient Vitals Panel */}
      <VitalsPanel patientId={patient.id} encounterId={patient.current_encounter_id} />

      {/* EHR Tab Navigation Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-1 shadow-xs overflow-x-auto flex items-center gap-1 custom-scrollbar">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-sky-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded font-black ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : tab.id === 'risk'
                      ? 'bg-rose-100 text-rose-700 border border-rose-200'
                      : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab View Content */}
      <div className="mt-4">
        {currentTab === 'summary' && (
          <SummaryTab
            patient={patient}
            encounters={encounters}
            diagnoses={diagnoses}
            vitals={vitals}
            labs={labs}
            medications={medications}
            onNavigateTab={handleTabChange}
          />
        )}
        {currentTab === 'encounters' && <EncountersTab encounters={encounters} />}
        {currentTab === 'diagnoses' && <DiagnosesTab diagnoses={diagnoses} />}
        {currentTab === 'medications' && <MedicationsTab medications={medications} />}
        {currentTab === 'allergies' && <AllergiesTab allergies={allergies} />}
        {currentTab === 'vitals' && <VitalsTab vitals={vitals} />}
        {currentTab === 'labs' && <LabsTab labs={labs} />}
        {currentTab === 'procedures' && <ProceduresTab procedures={procedures} />}
        {currentTab === 'notes' && <NotesTab notes={notes} />}
        {currentTab === 'risk' && <RiskAnalysisTab patient={patient} />}
        {currentTab === 'chat' && <ChatTab patient={patient} />}
        {currentTab === 'discharge' && <DischargePlanTab patient={patient} />}
      </div>
    </div>
  );
};
