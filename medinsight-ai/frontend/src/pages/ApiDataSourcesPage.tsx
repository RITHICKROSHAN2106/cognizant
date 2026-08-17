import React, { useState, useEffect } from 'react';
import {
  Share2,
  Database,
  Server,
  BrainCircuit,
  Activity,
  CheckCircle2,
  Zap,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Cpu,
  Layers,
  Code,
  Sparkles,
  Leaf
} from 'lucide-react';
import { systemService } from '../services/systemService';
import { IntegrationItem } from '../types/clinical';

export const ApiDataSourcesPage: React.FC = () => {
  const [integrations, setIntegrations] = useState<IntegrationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPinging, setIsPinging] = useState(false);

  const fetchIntegrations = async () => {
    setIsLoading(true);
    try {
      const data = await systemService.getIntegrations();
      setIntegrations(data);
    } catch (err) {
      console.error('Failed to load integration status:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const handlePingAll = async () => {
    setIsPinging(true);
    await fetchIntegrations();
    setTimeout(() => setIsPinging(false), 600);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <Share2 className="w-5 h-5 text-emerald-600" />
            API & Healthcare Data Sources Architecture
          </h1>
          <p className="text-xs text-slate-500">
            Real-time topology, MongoDB Atlas cluster health, Google Gemini GenAI service, and HL7 FHIR interoperability.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePingAll}
            disabled={isPinging}
            className="px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isPinging ? 'animate-spin' : ''}`} />
            Ping Connectors
          </button>
          <a
            href="http://localhost:8000/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <Code className="w-3.5 h-3.5" />
            OpenAPI Swagger Docs
          </a>
        </div>
      </div>

      {/* Architectural Flow Diagram Card */}
      <div className="clinical-card p-6 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white border border-slate-800 shadow-xl">
        <div className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-2 flex items-center gap-1.5">
          <Layers className="w-4 h-4" />
          End-to-End Enterprise Healthcare Topology
        </div>
        <h2 className="text-lg font-bold text-white mb-4">
          MedInsight AI MongoDB + Gemini Intelligence Pipeline
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-center text-xs">
          <div className="p-3 bg-slate-800/90 rounded-xl border border-slate-700">
            <div className="font-mono text-[10px] text-cyan-400 font-bold">CLIENT TIER</div>
            <div className="font-bold text-white mt-1">React + TS Dashboard</div>
            <div className="text-[10px] text-slate-400 mt-1">Vite • Recharts • AI Copilot</div>
          </div>

          <div className="flex items-center justify-center text-slate-500">
            <ArrowRight className="w-6 h-6 rotate-90 md:rotate-0 text-emerald-400" />
          </div>

          <div className="p-3 bg-emerald-950/80 rounded-xl border border-emerald-600/50">
            <div className="font-mono text-[10px] text-emerald-300 font-bold">API GATEWAY</div>
            <div className="font-bold text-white mt-1">FastAPI REST Services</div>
            <div className="text-[10px] text-emerald-200/70 mt-1">JWT Auth • CORS • OpenAPI</div>
          </div>

          <div className="flex items-center justify-center text-slate-500">
            <ArrowRight className="w-6 h-6 rotate-90 md:rotate-0 text-emerald-400" />
          </div>

          <div className="p-3 bg-slate-800/90 rounded-xl border border-emerald-500/40">
            <div className="font-mono text-[10px] text-emerald-400 font-bold flex items-center justify-center gap-1">
              <Leaf className="w-3 h-3 text-emerald-400" />
              MONGODB & GENAI
            </div>
            <div className="font-bold text-white mt-1">MongoDB Atlas & Gemini</div>
            <div className="text-[10px] text-slate-400 mt-1">NoSQL EHR • SHAP • PDF</div>
          </div>
        </div>
      </div>

      {/* Connected Data Sources Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {integrations.map((item, idx) => {
          const isMongo = item.name.toLowerCase().includes('mongo') || item.type.toLowerCase().includes('document');
          const isGemini = item.name.toLowerCase().includes('gemini') || item.type.toLowerCase().includes('generative');

          return (
            <div key={idx} className="clinical-card p-5 flex flex-col justify-between space-y-4 hover:border-emerald-500/40 transition">
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-2 rounded-xl border ${
                      isMongo
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : isGemini
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        : 'bg-sky-50 text-sky-700 border-sky-200'
                    }`}>
                      {isMongo ? (
                        <div className="w-5 h-5 flex items-center justify-center">
                          {/* MongoDB Leaf Vector Graphic */}
                          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-emerald-600">
                            <path d="M12 2C12 2 8 8 8 13C8 16.5 10 19.5 12 22C14 19.5 16 16.5 16 13C16 8 12 2 12 2Z" />
                            <path d="M12 2V22C12 22 11.5 19 11.5 13C11.5 8 12 2 12 2Z" fill="#00ED64" />
                          </svg>
                        </div>
                      ) : isGemini ? (
                        <Sparkles className="w-5 h-5 text-indigo-600" />
                      ) : (
                        <Database className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-900">{item.name}</h3>
                      <span className="text-[10px] font-mono text-slate-500">{item.service_name}</span>
                    </div>
                  </div>

                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                    {item.status}
                  </span>
                </div>

                <div className="mt-4 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="text-slate-400">Architecture Type:</span>
                    <span className="font-semibold text-slate-800">{item.type}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="text-slate-400">Response Latency:</span>
                    <span className="font-mono font-bold text-emerald-700">{item.latency_ms} ms</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="text-slate-400">Sync Status:</span>
                    <span className="font-medium text-slate-700">{item.last_sync}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span>Security: TLS 1.3 / Enclave</span>
                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Operational
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
