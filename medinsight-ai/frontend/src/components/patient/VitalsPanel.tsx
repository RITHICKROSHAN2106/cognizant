import React, { useState, useEffect, useRef } from 'react';
import {
  Heart,
  Activity,
  Thermometer,
  Wind,
  Droplet,
  Clock,
  Plus,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  X,
  Save,
  Loader2,
  Wifi,
  WifiOff
} from 'lucide-react';
import { apiClient } from '../../services/api';
import { VitalsSkeleton } from '../common/Skeletons';

interface VitalsPanelProps {
  patientId: number;
  encounterId?: string | number;
}

export const VitalsPanel: React.FC<VitalsPanelProps> = ({ patientId, encounterId = '1' }) => {
  const [vitalsData, setVitalsData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [selectedVitalTrend, setSelectedVitalTrend] = useState<string | null>(null);
  const [vitalHistory, setVitalHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Manual Entry Form State
  const [newVital, setNewVital] = useState({
    name: 'Heart Rate',
    observation_type: 'heart_rate',
    value: '76',
    unit: 'bpm',
    status: 'Normal'
  });

  const wsRef = useRef<WebSocket | null>(null);

  // Fetch current vitals scoped to patient & encounter
  const fetchVitals = async (pid: number, encId: string | number) => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/patients/${pid}/encounters/${encId}/vitals/current`);
      setVitalsData(res.data?.data);
    } catch (err) {
      console.error(`Failed to load vitals for patient ${pid}:`, err);
    } finally {
      setLoading(false);
    }
  };

  // Setup WebSocket connection and handle patient switching safety
  useEffect(() => {
    // 1. Reset vitals state immediately on patient switch
    setVitalsData(null);
    setLoading(true);
    setWsConnected(false);

    // 2. Disconnect previous WebSocket if open
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    // 3. Fetch new patient observations
    fetchVitals(patientId, encounterId);

    // 4. Establish fresh scoped WebSocket connection
    try {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${wsProtocol}//${window.location.hostname}:8000/ws/patients/${patientId}/encounters/${encounterId}/vitals`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setWsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'OBSERVATION_RECORDED') {
            fetchVitals(patientId, encounterId);
          }
        } catch (e) {
          console.warn('WS message parse error:', e);
        }
      };

      ws.onclose = () => {
        setWsConnected(false);
      };

      ws.onerror = () => {
        setWsConnected(false);
      };

      wsRef.current = ws;
    } catch (err) {
      console.warn('WebSocket setup failed:', err);
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [patientId, encounterId]);

  const handleOpenHistory = async (vitalKey: string, label: string) => {
    setSelectedVitalTrend(label);
    setLoadingHistory(true);
    try {
      const res = await apiClient.get(`/patients/${patientId}/encounters/${encounterId}/vitals/history?vital_type=${vitalKey}`);
      setVitalHistory(res.data?.data || []);
    } catch (err) {
      console.error('Failed to load observation history:', err);
      setVitalHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleRecordVital = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Range safety check
    const num = parseFloat(newVital.value);
    if (isNaN(num)) {
      setFormError('Please enter a valid numeric observation measurement.');
      return;
    }

    if (newVital.observation_type === 'heart_rate' && (num < 30 || num > 220)) {
      setFormError('Heart rate out of physiological safety range (30 - 220 bpm).');
      return;
    }
    if (newVital.observation_type === 'oxygen_saturation' && (num < 50 || num > 100)) {
      setFormError('Oxygen saturation out of physiological safety range (50 - 100%).');
      return;
    }
    if (newVital.observation_type === 'respiratory_rate' && (num < 6 || num > 60)) {
      setFormError('Respiratory rate out of physiological safety range (6 - 60 breaths/min).');
      return;
    }

    try {
      setSubmitting(true);
      await apiClient.post(`/patients/${patientId}/encounters/${encounterId}/vitals`, {
        ...newVital,
        source: 'MANUAL_ENTRY'
      });
      setShowAddModal(false);
      await fetchVitals(patientId, encounterId);
    } catch (err: any) {
      setFormError(err.response?.data?.detail || 'Failed to save vital observation.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <VitalsSkeleton />;
  }

  const measurements = vitalsData?.measurements || {};

  const vitalCards = [
    { key: 'heart_rate', label: 'Heart Rate', icon: Heart, color: 'text-rose-600', data: measurements.heart_rate },
    { key: 'blood_pressure', label: 'Blood Pressure', icon: Activity, color: 'text-sky-600', data: measurements.blood_pressure },
    { key: 'respiratory_rate', label: 'Respiratory Rate', icon: Wind, color: 'text-indigo-600', data: measurements.respiratory_rate },
    { key: 'oxygen_saturation', label: 'SpO₂ Saturation', icon: Activity, color: 'text-emerald-600', data: measurements.oxygen_saturation },
    { key: 'temperature', label: 'Body Temperature', icon: Thermometer, color: 'text-amber-600', data: measurements.temperature },
    { key: 'blood_glucose', label: 'Blood Glucose', icon: Droplet, color: 'text-purple-600', data: measurements.blood_glucose }
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 space-y-3">
      {/* Vitals Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px] font-bold">
            {wsConnected ? (
              <>
                <Wifi className="w-3 h-3 text-emerald-600" />
                <span className="text-emerald-800">Observation Feed: Connected</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3 text-slate-400" />
                <span className="text-slate-500">Observation Feed: Standby</span>
              </>
            )}
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            Patient ID: PT-{String(patientId).padStart(4, '0')} • Enc: {encounterId}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-2.5 py-1 bg-sky-50 text-sky-800 hover:bg-sky-100 border border-sky-200 rounded text-[11px] font-bold flex items-center gap-1 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Record Vitals</span>
          </button>
        </div>
      </div>

      {/* Vitals Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {vitalCards.map((v) => {
          const Icon = v.icon;
          const isAvail = v.data?.is_available && v.data?.value !== null;
          const isElevated = v.data?.status === 'Elevated' || v.data?.status === 'High';

          return (
            <button
              key={v.key}
              type="button"
              onClick={() => handleOpenHistory(v.key, v.label)}
              className="p-3 bg-slate-50 hover:bg-sky-50/60 rounded-lg border border-slate-200 text-left transition space-y-1 group"
            >
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[10px] font-bold uppercase truncate">{v.label}</span>
                <Icon className={`w-3.5 h-3.5 ${v.color}`} />
              </div>

              <div className="flex items-baseline gap-1">
                <span className="text-base font-black text-slate-900 tracking-tight font-mono">
                  {isAvail ? v.data.value : '--'}
                </span>
                <span className="text-[10px] font-semibold text-slate-500">
                  {isAvail ? v.data.unit : ''}
                </span>
              </div>

              <div className="flex items-center justify-between text-[10px]">
                <span className={`font-semibold ${isAvail ? (isElevated ? 'text-amber-700' : 'text-slate-600') : 'text-slate-400 italic text-[9px]'}`}>
                  {isAvail ? v.data.status : 'Not available from source'}
                </span>
                <span className="text-slate-400 font-mono text-[9px]">
                  {isAvail ? v.data.measured_at : ''}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Manual Observation Record Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl border border-slate-300">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h3 className="text-xs font-extrabold uppercase text-slate-900">Record Bedside Vital Observation</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-2.5 bg-red-50 border border-red-200 rounded text-xs text-red-800 flex items-center gap-1.5 font-medium">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleRecordVital} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Observation Type</label>
                <select
                  value={newVital.observation_type}
                  onChange={(e) => {
                    const ot = e.target.value;
                    let name = 'Heart Rate';
                    let unit = 'bpm';
                    if (ot === 'blood_pressure') { name = 'Blood Pressure'; unit = 'mmHg'; }
                    if (ot === 'respiratory_rate') { name = 'Respiratory Rate'; unit = 'breaths/min'; }
                    if (ot === 'oxygen_saturation') { name = 'SpO2 Pulse Oximetry'; unit = '%'; }
                    if (ot === 'temperature') { name = 'Body Temperature'; unit = '°F'; }
                    if (ot === 'blood_glucose') { name = 'Blood Glucose'; unit = 'mg/dL'; }
                    setNewVital(prev => ({ ...prev, observation_type: ot, name, unit }));
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded text-slate-900 font-medium"
                >
                  <option value="heart_rate">Heart Rate (bpm)</option>
                  <option value="blood_pressure">Blood Pressure (mmHg)</option>
                  <option value="respiratory_rate">Respiratory Rate (breaths/min)</option>
                  <option value="oxygen_saturation">SpO₂ Pulse Oximetry (%)</option>
                  <option value="temperature">Body Temperature (°F)</option>
                  <option value="blood_glucose">Blood Glucose (mg/dL)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Measured Value *</label>
                  <input
                    type="text"
                    required
                    value={newVital.value}
                    onChange={(e) => setNewVital(prev => ({ ...prev, value: e.target.value }))}
                    placeholder="e.g. 78 or 120/80"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Status Classification</label>
                  <select
                    value={newVital.status}
                    onChange={(e) => setNewVital(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded text-slate-900"
                  >
                    <option value="Normal">Normal</option>
                    <option value="Elevated">Elevated / Flagged</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>

              <div className="p-2.5 bg-slate-50 rounded border border-slate-200 text-[11px] text-slate-600">
                <span>Recorded Origin: <strong className="text-slate-800">source = MANUAL_ENTRY</strong></span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 border border-slate-300 text-slate-600 rounded text-xs hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 bg-sky-700 hover:bg-sky-800 text-white font-bold rounded text-xs flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{submitting ? 'Saving...' : 'Save Observation'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Observation History Modal */}
      {selectedVitalTrend && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-lg w-full p-5 space-y-4 shadow-2xl border border-slate-300">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-sky-700" />
                <h3 className="text-xs font-extrabold uppercase text-slate-900">
                  {selectedVitalTrend} — Observation History
                </h3>
              </div>
              <button onClick={() => setSelectedVitalTrend(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            {loadingHistory ? (
              <div className="p-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-sky-700 border-t-transparent rounded-full animate-spin"></span>
                <span>Loading observation timeline...</span>
              </div>
            ) : vitalHistory.length > 0 ? (
              <div className="space-y-2 max-h-56 overflow-y-auto divide-y divide-slate-100 text-xs">
                {vitalHistory.map((item, idx) => (
                  <div key={idx} className="pt-2 flex items-center justify-between">
                    <div>
                      <span className="font-mono font-bold text-slate-900">{item.value} {item.unit}</span>
                      <span className="text-[10px] text-slate-500 ml-2">({item.source || 'MANUAL_ENTRY'})</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">{item.measured_at}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded border border-slate-200">
                No observation history available for this encounter.
              </div>
            )}

            <div className="flex items-center justify-end pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setSelectedVitalTrend(null)}
                className="px-3.5 py-1.5 bg-slate-800 text-white rounded text-xs font-bold hover:bg-slate-900"
              >
                Close Timeline
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
