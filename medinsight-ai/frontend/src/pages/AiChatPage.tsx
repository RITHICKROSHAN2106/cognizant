import React, { useState, useEffect } from 'react';
import { Bot, Search, User, ShieldAlert, Sparkles, Activity } from 'lucide-react';
import { patientService } from '../services/patientService';
import { Patient } from '../types/clinical';
import { ChatTab } from '../components/clinical/ChatTab';

export const AiChatPage: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        setLoading(true);
        const data = await patientService.getPatients();
        setPatients(data);
        if (data.length > 0) {
          setSelectedPatientId(data[0].id);
        }
      } catch (err) {
        console.error('Failed to load patients for AI chat', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPatients();
  }, []);

  const filteredPatients = patients.filter(p =>
    `${p.first_name} ${p.last_name} ${p.mrn} ${p.primary_diagnosis || ''}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  const selectedPatient = patients.find(p => p.id === selectedPatientId) || patients[0];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Bot className="w-7 h-7 text-cyan-400" />
            AI Patient Clinical Copilot
          </h1>
          <p className="text-sm text-slate-400">
            Ask natural language clinical questions strictly grounded in each patient's authorized EHR data in MongoDB.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left: Patient Selector Sidebar */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-4 lg:col-span-1 flex flex-col h-[720px]">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <User className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-white">Select Inpatient</h3>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search patient or MRN..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Patient List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {filteredPatients.map(p => {
              const isSelected = p.id === selectedPatientId;
              const isCritical = p.risk_level === 'Critical';
              const isHigh = p.risk_level === 'High';

              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedPatientId(p.id)}
                  className={`w-full text-left p-3 rounded-xl border transition flex flex-col gap-1 ${
                    isSelected
                      ? 'bg-cyan-950/40 border-cyan-500/80 shadow-md shadow-cyan-500/10'
                      : 'bg-slate-800/60 border-slate-700/50 hover:bg-slate-800 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold ${isSelected ? 'text-cyan-300' : 'text-white'}`}>
                      {p.first_name} {p.last_name}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        isCritical
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : isHigh
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      {p.risk_level || 'Low'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center justify-between">
                    <span>{p.mrn}</span>
                    <span>{p.current_ward || 'Ward 5B'}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Active Chat Window */}
        <div className="lg:col-span-3">
          {selectedPatient ? (
            <ChatTab patient={selectedPatient} />
          ) : (
            <div className="h-[720px] bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center text-slate-400">
              Select a patient from the left panel to begin AI chat.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
