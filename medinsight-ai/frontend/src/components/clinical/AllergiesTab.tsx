import React from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle2, Calendar } from 'lucide-react';
import { Allergy } from '../../types/clinical';

interface AllergiesTabProps {
  allergies: Allergy[];
}

export const AllergiesTab: React.FC<AllergiesTabProps> = ({ allergies }) => {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-bold text-slate-900">Recorded Allergies & Adverse Reactions</h2>
        <p className="text-xs text-slate-500">
          Patient allergen sensitivities, clinical severity grading, and verification status.
        </p>
      </div>

      {allergies.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {allergies.map((a) => (
            <div
              key={a.id}
              className={`p-5 rounded-xl border ${
                a.severity === 'Severe'
                  ? 'bg-rose-50/70 border-rose-300 ring-1 ring-rose-200'
                  : 'bg-amber-50/70 border-amber-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`p-2 rounded-lg ${
                      a.severity === 'Severe' ? 'bg-rose-600 text-white' : 'bg-amber-500 text-white'
                    }`}
                  >
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{a.substance}</h3>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700">
                      {a.severity} Severity Alert
                    </span>
                  </div>
                </div>

                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white text-slate-700 border border-slate-200">
                  {a.verification_status}
                </span>
              </div>

              <div className="mt-4 pt-3 border-t border-rose-200/60 text-xs">
                <div className="text-[11px] text-slate-500 font-semibold uppercase">Reaction Description</div>
                <div className="text-slate-800 font-medium mt-0.5">{a.reaction}</div>
                <div className="text-[10px] text-slate-400 mt-2">
                  Recorded: {new Date(a.recorded_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="clinical-card p-8 text-center text-xs text-slate-500">
          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
          No known drug allergies (NKDA) recorded for this patient.
        </div>
      )}
    </div>
  );
};
