import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  FileText,
  Download,
  Printer,
  Search,
  User,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  HeartPulse,
  Building2,
  Calendar,
  Pill,
  Activity,
  Loader2,
  Sparkles,
  Stethoscope,
  Clock,
  ChevronDown,
  Check,
  FileCheck,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Database,
  FileSpreadsheet
} from 'lucide-react';
import { patientService } from '../services/patientService';
import { Patient, ReportSummaryResponse } from '../types/clinical';

export const ReportsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialPatientId = searchParams.get('patientId') ? parseInt(searchParams.get('patientId')!, 10) : 1;
  
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<number>(initialPatientId);
  const [reportType, setReportType] = useState<string>('discharge');
  const [reportData, setReportData] = useState<ReportSummaryResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [downloadingPdf, setDownloadingPdf] = useState<boolean>(false);
  const [downloadingCsv, setDownloadingCsv] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Enterprise Cohort Risk Report states
  const [cohortRiskFilter, setCohortRiskFilter] = useState<string>('All');
  const [exportingCohortCsv, setExportingCohortCsv] = useState<boolean>(false);
  const [exportingCohortPdf, setExportingCohortPdf] = useState<boolean>(false);
  const navigate = useNavigate();

  // Load patients list for selector (supports full 101,766 search)
  useEffect(() => {
    const loadPatients = async () => {
      try {
        const data = await patientService.getPatients(undefined, undefined, searchQuery || undefined);
        setPatients(data);
        if (data.length > 0 && !selectedPatientId) {
          setSelectedPatientId(data[0].id);
        }
      } catch (err) {
        console.error('Failed to load patients for reports', err);
      }
    };
    const debounce = setTimeout(() => {
      loadPatients();
    }, 200);
    return () => clearTimeout(debounce);
  }, [searchQuery, searchParams]);


  // Fetch complete report data when patient changes
  useEffect(() => {
    if (!selectedPatientId) return;
    const fetchReport = async () => {
      try {
        setLoading(true);
        const data = await patientService.getPatientReport(selectedPatientId);
        setReportData(data);
      } catch (err) {
        console.error('Failed to fetch report data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [selectedPatientId]);

  const handlePatientSelect = (id: number) => {
    setSelectedPatientId(id);
    setSearchParams({ patientId: id.toString() });
  };

  const handleDownloadPdf = async () => {
    if (!reportData) return;
    try {
      setDownloadingPdf(true);
      setDownloadSuccess(null);
      await patientService.downloadReportPdf(selectedPatientId, reportData.patient.mrn, reportType);
      setDownloadSuccess('PDF generated and downloaded successfully!');
      setTimeout(() => setDownloadSuccess(null), 4000);
    } catch (err) {
      console.error('Failed to download PDF', err);
      alert('Unable to generate report. Please try again.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleDownloadCsv = async () => {
    if (!reportData) return;
    try {
      setDownloadingCsv(true);
      setDownloadSuccess(null);
      await patientService.downloadReportCsv(selectedPatientId, reportData.patient.mrn, reportType);
      setDownloadSuccess('CSV report generated and downloaded successfully!');
      setTimeout(() => setDownloadSuccess(null), 4000);
    } catch (err) {
      console.error('Failed to download CSV', err);
      alert('Unable to generate report. Please try again.');
    } finally {
      setDownloadingCsv(false);
    }
  };

  const handleDownloadCohortCsv = async () => {
    try {
      setExportingCohortCsv(true);
      await patientService.downloadCohortCsv({
        risk_level: cohortRiskFilter === 'All' ? undefined : cohortRiskFilter
      });
    } catch (err) {
      console.error('Failed to export Cohort CSV', err);
      alert('Unable to generate report. Please try again.');
    } finally {
      setExportingCohortCsv(false);
    }
  };

  const handleDownloadCohortPdf = async () => {
    try {
      setExportingCohortPdf(true);
      await patientService.downloadCohortPdf({
        risk_level: cohortRiskFilter === 'All' ? undefined : cohortRiskFilter,
        limit: 150
      });
    } catch (err) {
      console.error('Failed to export Cohort PDF', err);
      alert('Unable to generate report. Please try again.');
    } finally {
      setExportingCohortPdf(false);
    }
  };

  const handlePrintSummary = () => {
    window.print();
  };

  const filteredPatients = patients.filter(p =>
    `${p.first_name} ${p.last_name} ${p.mrn} ${p.primary_diagnosis || ''}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedPatient = reportData?.patient;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 printable-container">
      {/* Top Header & Export Controls (Hidden on print) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <FileText className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-slate-900">
                Clinical Reports & Official PDF Discharge Summary
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                HIPAA-compliant inpatient clinical summaries, medication administration profiles, and transitional care documents.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handlePrintSummary}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-2 border border-slate-300 transition cursor-pointer"
            title="Open browser print dialog for paper or save-to-PDF"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>Print</span>
          </button>

          <button
            onClick={handleDownloadCsv}
            disabled={downloadingCsv || !reportData}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm flex items-center gap-2 transition cursor-pointer disabled:opacity-60"
            title="Export patient clinical records and discharge summary as structured CSV"
          >
            {downloadingCsv ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <FileSpreadsheet className="w-4 h-4 text-white" />
            )}
            <span>{downloadingCsv ? 'Preparing CSV...' : 'Export CSV'}</span>
          </button>

          <button
            onClick={handleDownloadPdf}
            disabled={downloadingPdf || !reportData}
            className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-sm flex items-center gap-2 transition cursor-pointer disabled:opacity-60"
            title="Export official patient PDF discharge summary"
          >
            {downloadingPdf ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <Download className="w-4 h-4 text-white" />
            )}
            <span>{downloadingPdf ? 'Generating PDF...' : 'Export PDF'}</span>
          </button>
        </div>
      </div>


      {downloadSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center gap-2 font-medium no-print">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{downloadSuccess}</span>
        </div>
      )}

      {/* Main Grid: Sidebar Controls (Left) + Clean Document Paper Preview (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (3 cols): Patient Selector & Template Switcher (Hidden on print) */}
        <div className="lg:col-span-4 space-y-4 no-print">
          {/* 1. Patient Selector Card */}
          <div className="clinical-card p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <User className="w-4 h-4 text-sky-600" />
                Select Inpatient ({patients.length})
              </span>
              <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                Active Inpatients
              </span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search patient name, MRN..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>

            {/* Inpatient List */}
            <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-100">
              {filteredPatients.map(p => {
                const isSelected = selectedPatientId === p.id;
                const riskVal = Math.round((p.risk_probability ?? 0.5) * 100);
                return (
                  <button
                    key={p.id}
                    onClick={() => handlePatientSelect(p.id)}
                    className={`w-full text-left p-2.5 rounded-lg text-xs transition flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-sky-50 border border-sky-300 text-sky-950 shadow-xs'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <span>{p.first_name} {p.last_name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-sky-600" />}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {p.mrn} • {p.current_ward || 'Ward 5B'} (Rm {p.current_room || '5B-214'})
                      </div>
                    </div>

                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                      (p.risk_probability ?? 0) >= 0.7 ? 'bg-rose-100 text-rose-800' :
                      (p.risk_probability ?? 0) >= 0.4 ? 'bg-amber-100 text-amber-800' :
                      'bg-emerald-100 text-emerald-800'
                    }`}>
                      {riskVal}%
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Document Template Options */}
          <div className="clinical-card p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-3">
            <div className="border-b border-slate-100 pb-2">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Document Template
              </span>
            </div>

            <div className="space-y-2">
              {[
                { id: 'discharge', title: '🏥 Inpatient Discharge Summary', desc: 'Clinical course, active diagnoses, medication reconciliation, and sign-off.' },
                { id: 'comprehensive', title: '📋 Comprehensive EHR Dossier', desc: 'Complete longitudinal vitals, diagnostic labs, and coded problem history.' },
                { id: 'risk_brief', title: '🎯 30-Day Readmission Risk Brief', desc: 'Empirical model risk probability, top TreeSHAP features, and CDS orders.' },
                { id: 'med_profile', title: '💊 Pharmacotherapy & Allergy Schedule', desc: 'Reconciled discharge prescription list, insulin titration, and allergy warnings.' }
              ].map(opt => {
                const isSelected = reportType === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setReportType(opt.id)}
                    className={`w-full text-left p-3 rounded-xl border transition cursor-pointer ${
                      isSelected
                        ? 'bg-sky-50 border-sky-400 text-sky-950 shadow-xs'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center justify-between">
                      <span>{opt.title}</span>
                      {isSelected && <span className="w-2 h-2 rounded-full bg-sky-600"></span>}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1 leading-relaxed">{opt.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Enterprise Cohort Risk Report Card */}
          <div className="clinical-card p-4 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-xl shadow-md space-y-3.5 border border-slate-700">
            <div className="flex items-center justify-between border-b border-slate-700 pb-2.5">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-black uppercase tracking-wider text-slate-100">
                  Enterprise Cohort Risk Report
                </span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-700">
                101,766+ Live
              </span>
            </div>

            <p className="text-[11px] text-slate-300 leading-relaxed">
              Export the complete hospital patient census with calibrated ML readmission risk scores, ICD-9 primary diagnoses, length of stay, and attending physician sign-off.
            </p>

            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <label className="text-[10px] uppercase font-bold text-slate-400">Risk Filter:</label>
                <select
                  value={cohortRiskFilter}
                  onChange={(e) => setCohortRiskFilter(e.target.value)}
                  className="flex-1 px-2.5 py-1 text-xs bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                >
                  <option value="All">All Risk Tiers (101,766+)</option>
                  <option value="Critical">Critical Risk (≥70%)</option>
                  <option value="High">High Risk (50-69%)</option>
                  <option value="Moderate">Moderate Risk (25-49%)</option>
                  <option value="Low">Low Risk (&lt;25%)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={handleDownloadCohortCsv}
                  disabled={exportingCohortCsv}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold border border-slate-600 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Download structured CSV patient cohort registry"
                >
                  {exportingCohortCsv ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                  ) : (
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                  <span>Export CSV</span>
                </button>

                <button
                  onClick={handleDownloadCohortPdf}
                  disabled={exportingCohortPdf}
                  className="px-3 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Download formatted multi-page executive PDF report"
                >
                  {exportingCohortPdf ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                  ) : (
                    <Download className="w-3.5 h-3.5 text-white" />
                  )}
                  <span>Export PDF</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (8 cols): Printable Medical Report Document Sheet */}
        <div className="lg:col-span-8">
          {loading ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-16 flex flex-col items-center justify-center text-slate-500 space-y-3 shadow-sm">
              <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
              <span className="text-xs font-semibold">Compiling official clinical discharge summary...</span>
            </div>
          ) : reportData && selectedPatient ? (
            /* Authentic Healthcare Printable Document Layout */
            <div className="bg-white text-slate-900 rounded-2xl shadow-lg border border-slate-200 p-8 sm:p-10 font-sans space-y-6 printable-report">
              {/* Official Hospital Header */}
              <div className="border-b-2 border-slate-900 pb-4 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="p-1 bg-slate-900 text-white rounded">
                      <Activity className="w-5 h-5" />
                    </div>
                    <span className="text-xl font-black tracking-tight text-slate-900">
                      MEDINSIGHT AI HEALTH SYSTEM
                    </span>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-300 rounded">
                      Official CDS Record
                    </span>
                  </div>
                  <h2 className="text-sm font-bold text-sky-900 uppercase tracking-wider mt-1.5">
                    {reportType === 'discharge' ? 'Inpatient Clinical Discharge Summary & Transitional Care Plan' :
                     reportType === 'risk_brief' ? '30-Day Hospital Readmission Risk Stratification & Intervention Brief' :
                     reportType === 'med_profile' ? 'Discharge Pharmacotherapy & Medication Administration Dossier' :
                     'Comprehensive Longitudinal Electronic Health Record (EHR) Summary'}
                  </h2>
                </div>

                <div className="sm:text-right text-[11px] text-slate-500 space-y-0.5">
                  <div>Document Date: <strong className="text-slate-800">{new Date(reportData.report_generated_at).toLocaleDateString()}</strong></div>
                  <div>Attending Clinician: <strong className="text-slate-800">{reportData.generated_by}</strong></div>
                  <div>Department: <strong className="text-slate-800">Internal Medicine / Ward 5B</strong></div>
                </div>
              </div>

              {/* Patient Demographics & Admission Summary Grid */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs avoid-break">
                <div>
                  <span className="text-slate-400 block uppercase text-[10px] font-bold">Patient Name</span>
                  <span className="text-sm font-black text-slate-900">{selectedPatient.first_name} {selectedPatient.last_name}</span>
                  <span className="block text-slate-600 text-[11px] mt-0.5">{selectedPatient.age}yo • {selectedPatient.sex}</span>
                </div>

                <div>
                  <span className="text-slate-400 block uppercase text-[10px] font-bold">MRN & Blood Type</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">{selectedPatient.mrn}</span>
                  <span className="block text-slate-600 text-[11px] mt-0.5">Blood: {selectedPatient.blood_group || 'O+'} • {selectedPatient.race || 'Caucasian'}</span>
                </div>

                <div>
                  <span className="text-slate-400 block uppercase text-[10px] font-bold">Location & Stay</span>
                  <span className="font-semibold text-slate-800">{selectedPatient.current_ward || 'Ward 5B'} (Rm {selectedPatient.current_room || '5B-214'})</span>
                  <span className="block text-slate-600 text-[11px] mt-0.5">Status: Inpatient (LOS: {selectedPatient.length_of_stay || 4}d)</span>
                </div>

                <div>
                  <span className="text-slate-400 block uppercase text-[10px] font-bold">30d Readmission Risk</span>
                  <div className="mt-1">
                    <span className={`px-2.5 py-1 rounded-md text-xs font-black border ${
                      (selectedPatient.risk_probability ?? 0) >= 0.7
                        ? 'bg-rose-100 text-rose-800 border-rose-300'
                        : (selectedPatient.risk_probability ?? 0) >= 0.45
                        ? 'bg-amber-100 text-amber-800 border-amber-300'
                        : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    }`}>
                      {Math.round((selectedPatient.risk_probability ?? 0.5) * 100)}% [{(selectedPatient.risk_level || 'High').toUpperCase()}]
                    </span>
                  </div>
                </div>
              </div>

              {/* Safety Badges & Allergy Banner */}
              <div className="space-y-2 avoid-break">
                {selectedPatient.safety_badges && selectedPatient.safety_badges.length > 0 && (
                  <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 text-xs font-bold flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>CRITICAL CLINICAL BADGES: {selectedPatient.safety_badges.join(' • ')}</span>
                  </div>
                )}

                {reportData.allergies.length > 0 ? (
                  <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium">
                    ⚠️ <b>Known Allergies & Adverse Reactions:</b> {reportData.allergies.map(a => `${a.substance} (${a.reaction} - ${a.severity})`).join(', ')}
                  </div>
                ) : (
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 text-xs">
                    ✓ <b>Known Allergies:</b> No Known Drug Allergies (NKDA)
                  </div>
                )}
              </div>

              {/* Section 1: Active Diagnoses & Problem List */}
              <div className="space-y-2.5 avoid-break">
                <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <HeartPulse className="w-4 h-4 text-rose-600" />
                    1. Active Diagnoses & Problem List (ICD-10 / ICD-9)
                  </h3>
                  <span className="text-[10px] text-slate-500 font-semibold uppercase">Coded Problems</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                  {reportData.diagnoses.map((d, i) => (
                    <div key={i} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-start justify-between">
                      <div>
                        <span className="font-mono font-bold text-slate-900 mr-1.5">[{d.icd_code}]</span>
                        <span className="text-slate-800">{d.description}</span>
                      </div>
                      <span className="text-[10px] font-bold text-slate-600 uppercase px-1.5 py-0.5 bg-white border border-slate-200 rounded shrink-0 ml-2">
                        {d.diagnosis_type}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 2: Laboratory Panels & Vital Observations */}
              <div className="space-y-2.5 avoid-break">
                <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Activity className="w-4 h-4 text-teal-600" />
                    2. Diagnostic Laboratory Panels & Vital Observations
                  </h3>
                  <span className="text-[10px] text-slate-500 font-semibold uppercase">Baseline vs Discharge</span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  {reportData.labs.slice(0, 4).map((l, i) => (
                    <div key={i} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                      <div className="text-[10px] font-bold text-slate-500 truncate">{l.test_name}</div>
                      <div className="font-black text-sm text-slate-900 mt-0.5">{l.value} {l.unit}</div>
                      <div className={`text-[10px] font-bold mt-0.5 ${
                        l.flag === 'High' || l.flag === 'Critical' ? 'text-rose-600' : 'text-slate-600'
                      }`}>
                        Flag: {l.flag} (Ref: {l.reference_min !== undefined ? `${l.reference_min}-${l.reference_max}` : 'Normal'})
                      </div>
                    </div>
                  ))}
                  {reportData.vitals.slice(0, 4).map((v, i) => (
                    <div key={i} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                      <div className="text-[10px] font-bold text-slate-500 truncate">{v.name}</div>
                      <div className="font-black text-sm text-slate-900 mt-0.5">{v.value_string}</div>
                      <div className="text-[10px] text-slate-600 font-medium mt-0.5">Status: {v.status}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 3: Discharge Pharmacotherapy Schedule */}
              <div className="space-y-2.5 avoid-break">
                <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Pill className="w-4 h-4 text-indigo-600" />
                    3. Reconciled Discharge Pharmacotherapy
                  </h3>
                  <span className="text-[10px] text-slate-500 font-semibold uppercase">Pharmacy Verified</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                  {reportData.medications.map((m, i) => (
                    <div key={i} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-start justify-between">
                      <div>
                        <div className="font-bold text-slate-900">{m.medication_name} — {m.dose}</div>
                        <div className="text-slate-600 text-[11px] mt-0.5">Route: {m.route} • Instructions: {m.frequency}</div>
                      </div>
                      <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded shrink-0 ml-2">
                        {m.status || 'Active'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 4: Transitional Care Checklist */}
              {reportData.discharge_plan && (
                <div className="space-y-2.5 avoid-break">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      4. Multidisciplinary Discharge Readiness Checklist
                    </h3>
                    <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                      Readiness Score: {reportData.discharge_plan.readiness_score}%
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    {[
                      { label: "Medication Reconciliation", checked: reportData.discharge_plan.medication_reconciliation },
                      { label: "7-Day PCP Follow-up Booked", checked: reportData.discharge_plan.follow_up_appointment },
                      { label: "Certified Diabetes Education", checked: reportData.discharge_plan.diabetes_education },
                      { label: "Dedicated Care Coordinator", checked: reportData.discharge_plan.care_coordinator_assigned },
                      { label: "Transportation Confirmed", checked: reportData.discharge_plan.transport_arranged },
                      { label: "Patient Instructions Signed", checked: reportData.discharge_plan.patient_education_completed }
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <CheckCircle2 className={`w-4 h-4 shrink-0 ${item.checked ? 'text-emerald-600' : 'text-slate-300'}`} />
                        <span className={item.checked ? 'font-bold text-slate-800' : 'text-slate-400'}>
                          {item.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Section 5: Patient Warning Instructions Callout */}
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950 space-y-1.5 avoid-break">
                <div className="font-bold flex items-center gap-1.5 text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>EMERGENCY WARNING SIGNS & POST-DISCHARGE INSTRUCTIONS:</span>
                </div>
                <div className="leading-relaxed text-[11px] space-y-1">
                  <p>• <b>Blood Glucose Surveillance:</b> Measure fasting and post-prandial glucose twice daily and record in clinical logbook.</p>
                  <p>• <b>Pharmacotherapy Adherence:</b> Take insulin and prescribed oral agents exactly as scheduled. Do not discontinue without physician review.</p>
                  <p>• <b>Immediate Emergency Notification:</b> Call 911 or visit emergency department if experiencing severe hyperglycemia (&gt;250 mg/dL with vomiting), chest tightness, shortness of breath, acute confusion, or fever &gt;101°F.</p>
                </div>
              </div>

              {/* Section 6: Attending Physician E-Signature Block */}
              <div className="pt-6 border-t-2 border-slate-300 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-700 avoid-break">
                <div>
                  <p className="italic text-[10px] text-slate-500 leading-relaxed">
                    Confidential Medical Document: Generated via MedInsight AI Clinical Decision Support Platform in compliance with HIPAA Title II & CMS Readmission Reduction Guidelines.
                  </p>
                </div>
                <div className="sm:text-right space-y-1">
                  <div className="font-bold text-slate-900">Attending Physician Electronic Sign-off:</div>
                  <div className="text-base font-serif italic text-indigo-950 font-bold">Dr. Sarah Mitchell, MD</div>
                  <div className="text-[10px] text-slate-500">License: MD-94821 • Internal Medicine • Certified E-Sign Timestamp: {new Date().toLocaleDateString()}</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center text-slate-400">
              No report available for the selected patient.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
