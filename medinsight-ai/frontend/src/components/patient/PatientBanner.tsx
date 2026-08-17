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
    if (b.includes('CRITICAL') || b.includes('READMISSION') || b.includes('HIGH')) {
      return 'bg-rose-50 text-rose-700 border-rose-200 font-bold';
    }
    if (b.includes('FALL')) {
      return 'bg-amber-100 text-amber-800 border-amber-300 font-semibold';
    }
    if (b.includes('DIABETES')) {
      return 'bg-sky-100 text-sky-800 border-sky-300 font-semibold';
    }
    return 'bg-slate-100 text-slate-700 border-slate-300';
  };

  const riskPercent = Math.round((patient.risk_probability || 0.72) * 100);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
      {/* Top Banner Row */}
      <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-slate-50 via-white to-slate-50 border-b border-slate-200">
        {/* Patient Identity & Demographics */}
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-xl bg-slate-800 text-white flex items-center justify-center font-bold text-xl shadow-sm shrink-0 border border-slate-700">
            {patient.first_name[0]}{patient.last_name[0]}
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                {patient.first_name} {patient.last_name}
              </h1>
              <span className="text-xs font-mono font-bold px-2 py-0.5 bg-slate-200/80 text-slate-800 rounded border border-slate-300">
                MRN: {patient.mrn}
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md border border-emerald-200">
                {patient.admission_status || 'Inpatient'}
              </span>
            </div>
            
            {/* Quick Demographics Matrix */}
            <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-600 font-medium">
              <div><span className="text-slate-400">DOB:</span> {patient.dob}</div>
              <div><span className="text-slate-400">Age:</span> {patient.age} yrs</div>
              <div><span className="text-slate-400">Sex:</span> {patient.sex}</div>
              <div><span className="text-slate-400">Blood:</span> {patient.blood_group}</div>
              <div><span className="text-slate-400">Race:</span> {patient.race}</div>
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
              {patient.current_ward || 'Ward 5B'} • Rm {patient.current_room || '5B-214'}
            </div>
            <div className="text-[11px] font-mono text-slate-500">
              {patient.current_encounter_id || 'ENC-2026-008412'}
            </div>
          </div>

          <div className="h-9 w-px bg-slate-200 hidden sm:block"></div>

          <div className="text-left lg:text-right space-y-0.5">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Attending Physician
            </div>
            <div className="text-xs font-bold text-slate-800 flex items-center gap-1">
              <Stethoscope className="w-3.5 h-3.5 text-sky-600 inline" />
              {patient.attending_physician || 'Dr. Sarah Mitchell'}
            </div>
            <div className="text-[11px] text-slate-500">
              LOS: {patient.length_of_stay || 7} Days
            </div>
          </div>

          {/* AI 30-Day Readmission Risk Chip */}
          <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 shadow-sm">
            <div className="text-right">
              <div className="text-[10px] font-bold uppercase tracking-wider text-rose-600">
                30-Day Readmission Risk
              </div>
              <div className="text-lg font-black leading-none text-rose-700">
                {riskPercent}% <span className="text-xs font-bold uppercase">{patient.risk_level || 'Critical'}</span>
              </div>
            </div>
            <ShieldAlert className="w-6 h-6 text-rose-600 shrink-0" />
          </div>
        </div>
      </div>

      {/* Safety Badges Ribbon */}
      <div className="px-5 py-2.5 bg-slate-100/70 flex flex-wrap items-center gap-2 border-t border-slate-200">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1 mr-1">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
          Clinical Alerts:
        </span>
        {(patient.safety_badges && patient.safety_badges.length > 0
          ? patient.safety_badges
          : ['DIABETES', 'PENICILLIN ALLERGY', 'FALL RISK', 'HIGH READMISSION RISK']
        ).map((badge, idx) => (
          <span
            key={idx}
            className={`px-2.5 py-0.5 rounded text-[11px] tracking-wide border shadow-xs ${getBadgeStyle(badge)}`}
          >
            {badge}
          </span>
        ))}
      </div>
    </div>
  );
};
