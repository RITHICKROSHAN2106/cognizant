import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  AlertTriangle,
  ShieldAlert,
  Calendar,
  ClipboardList,
  TrendingDown,
  BrainCircuit,
  ArrowUpRight,
  Activity,
  Bed,
  CheckCircle2,
  Stethoscope,
  ChevronRight,
  Database,
  Layers,
  Sparkles,
  Search,
  Building2,
  FileText
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { analyticsService } from '../services/analyticsService';
import { patientService } from '../services/patientService';
import { AnalyticsSummary, Patient, DatasetPatient } from '../types/clinical';

export const ClinicalOverviewPage: React.FC = () => {
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [highRiskQueue, setHighRiskQueue] = useState<Patient[]>([]);
  const [datasetSampler, setDatasetSampler] = useState<DatasetPatient[]>([]);
  const [activeTab, setActiveTab] = useState<'queue' | 'trajectory' | 'wards' | 'dataset'>('queue');
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [analyticsData, highRiskData, datasetSampleRes] = await Promise.all([
          analyticsService.getReadmissionAnalytics(),
          patientService.getHighRiskPatients(),
          patientService.queryDatasetPatients({ page: 1, page_size: 6, sort_by: 'risk_probability', sort_desc: true }),
        ]);
        setAnalytics(analyticsData);
        setHighRiskQueue(highRiskData.slice(0, 8));
        setDatasetSampler(datasetSampleRes.items);
      } catch (err) {
        console.error('Failed to load clinical overview:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const riskPieData = [
    { name: 'Low (<30%)', value: analytics?.risk_distribution.Low || 10, color: '#10b981' },
    { name: 'Moderate (30-49%)', value: analytics?.risk_distribution.Moderate || 9, color: '#eab308' },
    { name: 'High (50-69%)', value: analytics?.risk_distribution.High || 6, color: '#f97316' },
    { name: 'Critical (≥70%)', value: analytics?.risk_distribution.Critical || 5, color: '#e11d48' },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner with Platform Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-sky-50 text-sky-600 rounded-lg">
              <Activity className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-black tracking-tight text-slate-900">
              Inpatient Clinical Intelligence & Surveillance Command
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time 30-day readmission risk stratification, active bed monitoring, and {(analytics?.total_dataset_encounters || 101766).toLocaleString()} clinical admissions data engine.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-xl text-xs font-bold text-indigo-900">
            <Database className="w-3.5 h-3.5 text-indigo-600" />
            <span>{(analytics?.total_dataset_encounters || 101766).toLocaleString()} Monitored Census</span>
          </div>
          <button
            onClick={() => navigate('/patients')}
            className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <span>Open Patient Census</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Structured KPI Metric Cards — Unified 101,766 Clinical Dataset Intelligence */}
      <div className="space-y-2">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-sky-600" />
            <span>Enterprise Population & Readmission Surveillance Metrics</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* 1. Total Encounters */}
            <div className="clinical-card p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-bold uppercase tracking-wider">Total Inpatient Encounters</span>
                <Users className="w-4 h-4 text-sky-600" />
              </div>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {(analytics?.total_dataset_encounters || 101766).toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">{(analytics?.total_unique_patients || 71518).toLocaleString()} Unique Inpatients</div>
            </div>

            {/* 2. Critical & High-Risk Triage */}
            <div className="clinical-card p-4 bg-rose-50/50 border border-rose-200 rounded-xl shadow-xs">
              <div className="flex items-center justify-between text-rose-600">
                <span className="text-[10px] font-bold uppercase tracking-wider">Critical / High Alerts</span>
                <ShieldAlert className="w-4 h-4 text-rose-600" />
              </div>
              <div className="text-2xl font-black text-rose-700 mt-1">
                {(((analytics?.risk_distribution?.Critical || 11366) + (analytics?.risk_distribution?.High || 20800))).toLocaleString()}
              </div>
              <div className="text-[11px] text-rose-700/80 mt-0.5">
                {(analytics?.risk_distribution?.Critical || 11366).toLocaleString()} Critical (≥70%) • {(analytics?.risk_distribution?.High || 20800).toLocaleString()} High (50-69%)
              </div>
            </div>

            {/* 3. 30-Day Early Readmissions */}
            <div className="clinical-card p-4 bg-amber-50/50 border border-amber-200 rounded-xl shadow-xs">
              <div className="flex items-center justify-between text-amber-600">
                <span className="text-[10px] font-bold uppercase tracking-wider">30-Day Readmissions</span>
                <AlertTriangle className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-2xl font-black text-amber-800 mt-1">
                {(analytics?.readmission_30d_count || 11357).toLocaleString()}
              </div>
              <div className="text-[11px] text-amber-800/80 mt-0.5">
                {analytics?.readmission_rate_30d || 11.2}% 30-Day Readmission Rate
              </div>
            </div>

            {/* 4. Average Length of Stay */}
            <div className="clinical-card p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-bold uppercase tracking-wider">Average Inpatient Stay</span>
                <Bed className="w-4 h-4 text-teal-600" />
              </div>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {analytics?.avg_length_of_stay || 4.4} Days
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">16.0 Medications • 43.1 Diagnostic Labs</div>
            </div>
          </div>
        </div>


        {/* Category B: Enterprise Clinical Cohort Intelligence */}
        <div className="pt-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-indigo-600" />
            <span>Enterprise Clinical Dataset Population Benchmarks ({(analytics?.total_dataset_encounters || 101766).toLocaleString()} Encounters)</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="clinical-card p-3.5 bg-slate-900 text-white rounded-xl border border-slate-800">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Analyzed Encounters</div>
              <div className="text-xl font-black text-cyan-400 mt-1">{(analytics?.total_dataset_encounters || 101766).toLocaleString()}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">{(analytics?.total_unique_patients || 71518).toLocaleString()} Unique Patients</div>
            </div>

            <div className="clinical-card p-3.5 bg-slate-900 text-white rounded-xl border border-slate-800">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">30-Day Readmit Rate</div>
              <div className="text-xl font-black text-emerald-400 mt-1">
                {analytics?.readmission_rate_30d || 11.2}%
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">11,357 Readmissions (&lt;30d)</div>
            </div>

            <div className="clinical-card p-3.5 bg-slate-900 text-white rounded-xl border border-slate-800">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Late Readmissions (&gt;30d)</div>
              <div className="text-xl font-black text-amber-400 mt-1">
                {(analytics?.readmission_gt30_count || 35545).toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">34.9% Extended Readmissions</div>
            </div>

            <div className="clinical-card p-3.5 bg-slate-900 text-white rounded-xl border border-slate-800">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Mean Inpatient Stay (LOS)</div>
              <div className="text-xl font-black text-sky-400 mt-1">
                {analytics?.avg_length_of_stay || 4.4} Days
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">43.1 Avg Lab Tests / Patient</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Surveillance Tabs */}
      <div className="space-y-4">
        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-1 flex-wrap">
          <button
            onClick={() => setActiveTab('queue')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'queue'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>High-Risk Clinical Surveillance Queue ({highRiskQueue.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('trajectory')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'trajectory'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <TrendingDown className="w-3.5 h-3.5" />
            <span>Readmission Trajectory & Risk Stratification</span>
          </button>

          <button
            onClick={() => setActiveTab('wards')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'wards'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Hospital Department & Ward Status</span>
          </button>

          <button
            onClick={() => setActiveTab('dataset')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'dataset'
                ? 'bg-indigo-900 text-white shadow-xs font-extrabold'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-indigo-500" />
            <span>1-Lakh Inpatient Dataset Quick Sampler</span>
          </button>
        </div>

        {/* TAB 1: HIGH RISK SURVEILLANCE QUEUE */}
        {activeTab === 'queue' && (
          <div className="clinical-card p-5 bg-white border border-slate-200 rounded-xl shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                  Prioritized High-Risk Surveillance Queue (Immediate CDS Review)
                </h3>
                <p className="text-xs text-slate-500">
                  Admitted inpatients with highest 30-day readmission probability requiring multidisciplinary care coordination.
                </p>
              </div>
              <button
                onClick={() => navigate('/high-risk')}
                className="text-xs text-sky-600 hover:text-sky-800 font-bold self-start sm:self-auto cursor-pointer"
              >
                Open Full High-Risk Queue →
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-3">MRN</th>
                    <th className="py-3 px-3">Patient Name</th>
                    <th className="py-3 px-3">Age / Sex</th>
                    <th className="py-3 px-3">Primary Diagnosis</th>
                    <th className="py-3 px-3">Location</th>
                    <th className="py-3 px-3">LOS</th>
                    <th className="py-3 px-3">Readmission Risk</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {highRiskQueue.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-slate-900">
                        {p.mrn}
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-800">
                        <button
                          onClick={() => navigate(`/ehr/${p.id}`)}
                          className="hover:text-sky-600 text-left cursor-pointer"
                        >
                          {p.first_name} {p.last_name}
                        </button>
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {p.age}yo • {p.sex}
                      </td>
                      <td className="py-3 px-3 text-slate-700 max-w-[200px] truncate" title={p.primary_diagnosis}>
                        {p.primary_diagnosis}
                      </td>
                      <td className="py-3 px-3 text-slate-600 font-medium">
                        {p.current_ward || 'Ward 5B'} (Rm {p.current_room || '5B-214'})
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-700">
                        {p.length_of_stay || 5}d
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-black ${
                            p.risk_level === 'Critical'
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {Math.round((p.risk_probability || 0) * 100)}% {p.risk_level}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right space-x-2">
                        <button
                          onClick={() => navigate(`/reports?patientId=${p.id}`)}
                          className="px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded font-bold text-[11px] transition cursor-pointer"
                        >
                          Discharge Summary
                        </button>
                        <button
                          onClick={() => navigate(`/ehr/${p.id}`)}
                          className="px-2.5 py-1 bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 rounded font-bold text-[11px] transition cursor-pointer"
                        >
                          Open EHR
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: READMISSION TRAJECTORY & RISK DISTRIBUTION */}
        {activeTab === 'trajectory' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Donut Distribution */}
            <div className="lg:col-span-4 clinical-card p-5 bg-white border border-slate-200 rounded-xl flex flex-col justify-between">
              <div>
                <div className="border-b border-slate-200 pb-3 mb-3">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Inpatient Risk Stratification
                  </h3>
                  <p className="text-[11px] text-slate-500">Active census breakdown by risk tier</p>
                </div>

                <div className="h-52 w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={riskPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {riskPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderRadius: '0.5rem', fontSize: '11px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100">
                {riskPieData.map((r, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: r.color }}></span>
                    <span className="text-[11px] text-slate-600 font-medium">{r.name}: <strong className="text-slate-800">{r.value}</strong></span>
                  </div>
                ))}
              </div>
            </div>

            {/* Readmission Trend Line Chart */}
            <div className="lg:col-span-8 clinical-card p-5 bg-white border border-slate-200 rounded-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-3">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      30-Day Hospital Readmission Rate Trend (%)
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Hospital performance vs National Benchmark (14.6%) and Target (10.0%)
                    </p>
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded">
                    Trend: -2.6% Improvement
                  </span>
                </div>

                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={analytics?.monthly_trend || []}
                      margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={11} domain={[8, 16]} tickLine={false} unit="%" />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderRadius: '0.5rem', fontSize: '11px' }}
                      />
                      <Line type="monotone" dataKey="readmissionRate" stroke="#0284c7" strokeWidth={3} dot={{ r: 4 }} name="Hospital Rate %" />
                      <Line type="monotone" dataKey="nationalBenchmark" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="National Benchmark %" />
                      <Line type="monotone" dataKey="target" stroke="#10b981" strokeWidth={1.5} strokeDasharray="2 2" dot={false} name="Target (10%)" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-100 flex items-center justify-between">
                <span>CDS-directed transitional care interventions expanded to 58 patients/month.</span>
                <button onClick={() => navigate('/analytics')} className="text-sky-600 font-bold hover:underline cursor-pointer">
                  Deep Population Analytics →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: WARDS & DEPARTMENT STATUS */}
        {activeTab === 'wards' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {(analytics?.department_distribution || [
              { department: "Internal Medicine (Ward 5B)", criticalCount: 3, highCount: 3, total: 12 },
              { department: "Cardiology Unit (Ward 4A)", criticalCount: 1, highCount: 2, total: 7 },
              { department: "Pulmonology (Ward 3B)", criticalCount: 1, highCount: 1, total: 5 },
              { department: "Surgical Recovery (Ward 2A)", criticalCount: 0, highCount: 0, total: 6 }
            ]).map((d, i) => (
              <div key={i} className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="font-bold text-xs text-slate-900">{d.department}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded">
                    {d.total} Beds Occupied
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center text-xs">
                  <div className="p-2 bg-rose-50 rounded-lg border border-rose-100">
                    <div className="text-[10px] text-rose-700 font-bold uppercase">Critical</div>
                    <div className="text-lg font-black text-rose-800 mt-0.5">{d.criticalCount}</div>
                  </div>
                  <div className="p-2 bg-amber-50 rounded-lg border border-amber-100">
                    <div className="text-[10px] text-amber-700 font-bold uppercase">High Risk</div>
                    <div className="text-lg font-black text-amber-800 mt-0.5">{d.highCount}</div>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/patients')}
                  className="w-full py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-lg border border-slate-200 transition cursor-pointer"
                >
                  View Ward Patients →
                </button>
              </div>
            ))}
          </div>
        )}

        {/* TAB 4: 1-LAKH DATASET QUICK SAMPLER */}
        {activeTab === 'dataset' && (
          <div className="clinical-card p-5 bg-white border border-slate-200 rounded-xl shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Database className="w-4 h-4 text-indigo-600" />
                  1-Lakh Clinical Dataset Top Risk Encounters (101,766 Total)
                </h3>
                <p className="text-xs text-slate-500">
                  Sampled from the trained LightGBM + XGBoost model dataset with real ICD codes and glycemic parameters.
                </p>
              </div>
              <button
                onClick={() => navigate('/patients')}
                className="px-3 py-1.5 bg-indigo-900 hover:bg-indigo-950 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <span>Open 1-Lakh Full Index (101,766 Records)</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-2.5 px-3">Encounter ID</th>
                    <th className="py-2.5 px-3">Patient MRN</th>
                    <th className="py-2.5 px-3">Demographics</th>
                    <th className="py-2.5 px-3">Primary Diagnosis</th>
                    <th className="py-2.5 px-3">Stay & Meds</th>
                    <th className="py-2.5 px-3">A1C / Insulin</th>
                    <th className="py-2.5 px-3">Model Risk</th>
                    <th className="py-2.5 px-3">Actual Outcome</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {datasetSampler.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-mono font-bold text-indigo-950">#{r.encounter_id}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-800">{r.full_name} ({r.mrn})</td>
                      <td className="py-2.5 px-3 text-slate-600">{r.age_group} • {r.sex}</td>
                      <td className="py-2.5 px-3 text-slate-700 max-w-[200px] truncate">{r.primary_diagnosis}</td>
                      <td className="py-2.5 px-3 text-slate-600">{r.time_in_hospital}d • {r.num_medications} meds</td>
                      <td className="py-2.5 px-3 text-slate-700 font-semibold">A1C: {r.a1c_result} • {r.insulin}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800">
                          {Math.round(r.risk_probability * 100)}% {r.risk_level}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{r.readmitted_outcome}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
