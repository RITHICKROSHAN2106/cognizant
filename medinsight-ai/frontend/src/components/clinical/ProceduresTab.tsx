import React from 'react';
import { Stethoscope, Calendar, Building, User } from 'lucide-react';
import { Procedure } from '../../types/clinical';

interface ProceduresTabProps {
  procedures: Procedure[];
}

export const ProceduresTab: React.FC<ProceduresTabProps> = ({ procedures }) => {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-bold text-slate-900">Procedures & Clinical Interventions</h2>
        <p className="text-xs text-slate-500">
          Inpatient diagnostic imaging, surgical procedures, and bedside interventional recordings.
        </p>
      </div>

      <div className="clinical-card overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <th className="py-3 px-4">Procedure Code</th>
              <th className="py-3 px-4">Procedure Name</th>
              <th className="py-3 px-4">Department</th>
              <th className="py-3 px-4">Performed Date/Time</th>
              <th className="py-3 px-4">Operating Clinician</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {procedures.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                <td className="py-3 px-4 font-mono font-bold text-sky-700">
                  {p.code}
                </td>
                <td className="py-3 px-4 font-bold text-slate-800">
                  {p.procedure_name}
                </td>
                <td className="py-3 px-4 text-slate-600">
                  {p.department}
                </td>
                <td className="py-3 px-4 text-slate-500">
                  {new Date(p.performed_at).toLocaleString()}
                </td>
                <td className="py-3 px-4 text-slate-700">
                  {p.clinician}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
