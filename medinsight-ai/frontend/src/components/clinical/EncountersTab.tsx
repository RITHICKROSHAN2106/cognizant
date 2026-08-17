import React, { useState } from 'react';
import {
  Calendar,
  ChevronDown,
  ChevronRight,
  Clock,
  Building,
  User,
  Activity,
  AlertCircle,
  FileText,
  Pill,
  Stethoscope
} from 'lucide-react';
import { Encounter } from '../../types/clinical';

interface EncountersTabProps {
  encounters: Encounter[];
}

export const EncountersTab: React.FC<EncountersTabProps> = ({ encounters }) => {
  const [expandedId, setExpandedId] = useState<number | null>(encounters[0]?.id || null);

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900">Longitudinal Encounter History</h2>
          <p className="text-xs text-slate-500">
            Chronological hospital admissions, emergency presentations, and ambulatory episodes.
          </p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 bg-slate-200 text-slate-700 rounded-md">
          {encounters.length} Total Encounters Recorded
        </span>
      </div>

      <div className="space-y-3">
        {encounters.map((enc) => {
          const isExpanded = expandedId === enc.id;
          const admitDate = new Date(enc.admission_date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          });
          const dischargeDate = enc.discharge_date
            ? new Date(enc.discharge_date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })
            : 'Currently Admitted';

          return (
            <div
              key={enc.id}
              className={`clinical-card transition-all border ${
                enc.is_current ? 'border-sky-300 ring-1 ring-sky-100' : 'border-slate-200'
              }`}
            >
              {/* Encounter Header Bar */}
              <div
                onClick={() => toggleExpand(enc.id)}
                className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/80 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <button className="p-1 text-slate-400 hover:text-slate-700">
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-slate-900">{enc.encounter_id}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          enc.encounter_type === 'Emergency'
                            ? 'bg-rose-100 text-rose-800'
                            : enc.is_current
                            ? 'bg-sky-100 text-sky-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {enc.encounter_type}
                      </span>
                      {enc.is_current && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 animate-pulse">
                          Active Inpatient
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-semibold text-slate-800 mt-1">
                      {enc.primary_diagnosis}
                    </div>
                  </div>
                </div>

                {/* Meta details */}
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 pl-7 md:pl-0">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{admitDate} → {dischargeDate}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Building className="w-3.5 h-3.5 text-slate-400" />
                    <span>{enc.department}</span>
                  </div>
                  <div className="font-semibold text-slate-800">
                    LOS: {enc.length_of_stay}d
                  </div>
                  {enc.readmission_status !== 'Pending' && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        enc.readmission_status.includes('Readmitted')
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {enc.readmission_status}
                    </span>
                  )}
                </div>
              </div>

              {/* Expanded Detailed Breakdown */}
              {isExpanded && (
                <div className="p-5 border-t border-slate-200 bg-slate-50/60 space-y-4 text-xs">
                  {/* Utilization Matrix */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-3 rounded-lg border border-slate-200">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold">Attending Clinician</span>
                      <div className="font-semibold text-slate-800 mt-0.5">{enc.attending_physician}</div>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold">Admission Source</span>
                      <div className="font-semibold text-slate-800 mt-0.5">{enc.admission_source}</div>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold">Discharge Disposition</span>
                      <div className="font-semibold text-slate-800 mt-0.5">{enc.discharge_disposition}</div>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold">Prior Inpatient Admissions</span>
                      <div className="font-semibold text-slate-800 mt-0.5">{enc.number_inpatient} past episodes</div>
                    </div>
                  </div>

                  {/* Secondary Diagnoses */}
                  {enc.secondary_diagnoses && enc.secondary_diagnoses.length > 0 && (
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                        Secondary Diagnoses & Comorbidities
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {enc.secondary_diagnoses.map((d, i) => (
                          <span key={i} className="px-2 py-1 bg-white text-slate-700 rounded border border-slate-200 text-xs">
                            {d}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Nested Clinical Notes if available */}
                  {enc.clinical_notes && enc.clinical_notes.length > 0 && (
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                        Encounter Documentation
                      </div>
                      <div className="space-y-2">
                        {enc.clinical_notes.map((n) => (
                          <div key={n.id} className="p-3 bg-white rounded-lg border border-slate-200">
                            <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 mb-1">
                              <span>{n.note_type} — {n.author}</span>
                              <span className="text-slate-400 font-normal">{new Date(n.created_at).toLocaleString()}</span>
                            </div>
                            <p className="text-xs text-slate-600 whitespace-pre-line">{n.content}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
