import React from 'react';
import {
  User,
  ShieldAlert,
  AlertTriangle,
  Heart,
  Calendar,
  Bed,
  Stethoscope,
  Activity,
  FileCheck
} from 'lucide-react';
import { Patient } from '../../types/clinical';

interface PatientBannerProps {
  patient: Patient;
}

export const PatientBanner: React.FC<PatientBannerProps> = ({ patient }) => {
  const getBadgeStyle = (badge: string) => {
    const b = badge.toUpperCase();
    if (b.includes('ALLERGY') || b.includes('PENICILLIN')) {
      return 'bg-rose-100 text-rose-800 border-rose-300 font-bold';
    }
    if (b.includes('CRITICAL')) {
      return 'bg-rose-50 text-rose-700 border-rose-200 font-bold';
    }
    if (b.includes('HIGH')) {
      return 'bg-amber-50 text-amber-800 border-amber-200 font-bold';
    }
    if (b.includes('MODERATE')) {
      return 'bg-blue-50 text-blue-800 border-blue-200 font-medium';
    }
    if (b.includes('LOW')) {
      return 'bg-emerald-50 text-emerald-800 border-emerald-200 font-medium';
    }
    if (b.includes('FALL')) {
      return 'bg-amber-100 text-amber-800 border-amber-300 font-semibold';
    }
    if (b.includes('DIABETES')) {
      return 'bg-sky-100 text-sky-800 border-sky-300 font-semibold';
    }
    return 'bg-slate-100 text-slate-700 border-slate-300';
  };

  const hasRisk = typeof patient.risk_probability === 'number';
  const riskPercent = hasRisk ? Math.round(patient.risk_probability! * 100) : null;
  const riskLevel = patient.risk_level || (hasRisk ? (patient.risk_probability! >= 0.7 ? 'Critical' : patient.risk_probability! >= 0.45 ? 'High' : patient.risk_probability! >= 0.25 ? 'Moderate' : 'Low') : 'Not Assessed');

  const getRiskChipColor = (lvl: string) => {
    switch (lvl?.toLowerCase()) {
      case 'critical':
        return 'bg-rose-50 border-rose-200 text-rose-900';
      case 'high':
        return 'bg-amber-50 border-amber-200 text-amber-900';
      case 'moderate':
        return 'bg-blue-50 border-blue-200 text-blue-900';
      case 'low':
        return 'bg-emerald-50 border-emerald-200 text-emerald-900';
      default:
        return 'bg-slate-50 border-slate-200 text-slate-700';
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
      {/* Top Banner Row */}
      <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-slate-50 via-white to-slate-50 border-b border-slate-200">
        {/* Patient Identity & Demographics */}
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-xl bg-slate-800 text-white flex items-center justify-center font-bold text-xl shadow-sm shrink-0 border border-slate-700">
            {patient.first_name?.[0] || 'P'}{patient.last_name?.[0] || 'T'}
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                {patient.first_name} {patient.last_name}
              </h1>
              <span className="text-xs font-mono font-bold px-2 py-0.5 bg-slate-200/80 text-slate-800 rounded border border-slate-300">
                MRN: {patient.mrn || `MRN-${patient.id}`}
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md border border-emerald-200">
                {patient.admission_status || 'Inpatient'}
              </span>
            </div>
            
            {/* Quick Demographics Matrix */}
            <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-600 font-medium">
              <div><span className="text-slate-400">DOB:</span> {patient.dob || 'Unavailable'}</div>
              <div><span className="text-slate-400">Age:</span> {patient.age ? `${patient.age} yrs` : 'Unavailable'}</div>
              <div><span className="text-slate-400">Sex:</span> {patient.sex || 'Unavailable'}</div>
              <div><span className="text-slate-400">Blood:</span> {patient.blood_group || 'Not Typed'}</div>
              <div><span className="text-slate-400">Race:</span> {patient.race || 'Unavailable'}</div>
            </div>
          </div>
        </div>

        {/* Admission & Clinical Risk Highlight */}
        <div className="flex flex-wrap items-center gap-4 lg:gap-6 bg-slate-50 lg:bg-transparent p-3 lg:p-0 rounded-lg border lg:border-0 border-slate-200">
          <div className="text-left lg:text-right space-y-0.5">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Encounter & Room
            </div>
            <div className="text-xs font-bold text-slate-800">
              {patient.current_ward || 'Inpatient Ward'} • Rm {patient.current_room || 'Pending'}
            </div>
            <div className="text-[11px] font-mono text-slate-500">
              {patient.current_encounter_id || `ENC-${patient.id}`}
            </div>
          </div>

          <div className="h-9 w-px bg-slate-200 hidden sm:block"></div>

          <div className="text-left lg:text-right space-y-0.5">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Attending Physician
            </div>
            <div className="text-xs font-bold text-slate-800 flex items-center gap-1">
              <Stethoscope className="w-3.5 h-3.5 text-sky-600 inline" />
              {patient.attending_physician || 'Dr. Sarah Mitchell, MD'}
            </div>
            <div className="text-[11px] text-slate-500">
              LOS: {patient.length_of_stay ? `${patient.length_of_stay} Days` : '1 Day'}
            </div>
          </div>

          {/* AI 30-Day Readmission Risk Chip */}
          <div className={`flex items-center gap-2.5 px-3.5 py-2 rounded-lg border shadow-xs ${getRiskChipColor(riskLevel)}`}>
            <div className="text-right">
              <div className="text-[10px] font-bold uppercase tracking-wider opacity-80">
                30-Day Readmission Risk
              </div>
              <div className="text-base font-black leading-none mt-0.5">
                {riskPercent !== null ? (
                  <>
                    {riskPercent}% <span className="text-xs font-bold uppercase">{riskLevel}</span>
                  </>
                ) : (
                  <span className="text-xs font-bold uppercase">Not Assessed</span>
                )}
              </div>
            </div>
            <ShieldAlert className="w-5 h-5 opacity-80 shrink-0" />
          </div>
        </div>
      </div>

      {/* Safety Badges Ribbon */}
      <div className="px-5 py-2.5 bg-slate-100/70 flex flex-wrap items-center gap-2 border-t border-slate-200">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1 mr-1">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
          Clinical Badges:
        </span>
        {patient.safety_badges && patient.safety_badges.length > 0 ? (
          patient.safety_badges.map((badge, idx) => (
            <span
              key={idx}
              className={`px-2.5 py-0.5 rounded text-[11px] tracking-wide border shadow-2xs ${getBadgeStyle(badge)}`}
            >
              {badge}
            </span>
          ))
        ) : (
          <span className="text-[11px] text-slate-400 italic">No specific safety alerts active</span>
        )}
      </div>
    </div>
  );
};
