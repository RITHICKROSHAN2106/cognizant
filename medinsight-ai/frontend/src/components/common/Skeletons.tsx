import React from 'react';

export const PatientBannerSkeleton: React.FC = () => (
  <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs animate-pulse space-y-4 mb-6">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 bg-slate-200 rounded-xl"></div>
        <div className="space-y-2">
          <div className="h-5 w-48 bg-slate-200 rounded"></div>
          <div className="h-3.5 w-72 bg-slate-200 rounded"></div>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="h-10 w-24 bg-slate-200 rounded-lg"></div>
        <div className="h-10 w-32 bg-slate-200 rounded-lg"></div>
      </div>
    </div>
    <div className="pt-2 border-t border-slate-100 flex gap-2">
      <div className="h-5 w-20 bg-slate-200 rounded"></div>
      <div className="h-5 w-28 bg-slate-200 rounded"></div>
      <div className="h-5 w-24 bg-slate-200 rounded"></div>
    </div>
  </div>
);

export const VitalsSkeleton: React.FC = () => (
  <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs animate-pulse space-y-3">
    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
      <div className="h-4 w-44 bg-slate-200 rounded"></div>
      <div className="h-4 w-20 bg-slate-200 rounded"></div>
    </div>
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
          <div className="h-3 w-16 bg-slate-200 rounded"></div>
          <div className="h-6 w-20 bg-slate-200 rounded"></div>
          <div className="h-2.5 w-12 bg-slate-200 rounded"></div>
        </div>
      ))}
    </div>
    <div className="text-[11px] text-slate-500 font-medium text-center pt-1">
      Loading latest patient observations...
    </div>
  </div>
);

export const ClinicalTableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
  <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs animate-pulse space-y-3">
    <div className="h-4 w-40 bg-slate-200 rounded mb-4"></div>
    <div className="space-y-2.5">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-10 bg-slate-100 rounded-lg w-full"></div>
      ))}
    </div>
  </div>
);

export const RiskAssessmentSkeleton: React.FC = () => (
  <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs animate-pulse space-y-6">
    <div className="h-24 bg-slate-900/10 rounded-xl p-4 flex items-center justify-between">
      <div className="space-y-2">
        <div className="h-4 w-36 bg-slate-300 rounded"></div>
        <div className="h-7 w-64 bg-slate-300 rounded"></div>
      </div>
      <div className="h-14 w-28 bg-slate-300 rounded-lg"></div>
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="h-64 bg-slate-100 rounded-xl p-4 space-y-3">
        <div className="h-4 w-32 bg-slate-200 rounded"></div>
        <div className="space-y-2 pt-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-7 bg-slate-200 rounded"></div>
          ))}
        </div>
      </div>
      <div className="h-64 bg-slate-100 rounded-xl p-4 space-y-3">
        <div className="h-4 w-40 bg-slate-200 rounded"></div>
        <div className="h-44 bg-slate-200 rounded"></div>
      </div>
    </div>
    <div className="text-center text-xs text-slate-500 font-medium space-y-1">
      <div>Calculating 30-Day Readmission Risk via trained ensemble model...</div>
      <div className="text-[10px] text-slate-400">Retrieving encounter data → Preparing features → Running model → Loading SHAP</div>
    </div>
  </div>
);

export const ChartSkeleton: React.FC = () => (
  <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs animate-pulse space-y-4">
    <div className="flex justify-between items-center">
      <div className="h-4 w-36 bg-slate-200 rounded"></div>
      <div className="h-4 w-20 bg-slate-200 rounded"></div>
    </div>
    <div className="h-48 bg-slate-100 rounded-lg flex items-end justify-between p-4 gap-2">
      {[40, 65, 30, 80, 55, 90, 70, 45].map((h, i) => (
        <div key={i} className="bg-slate-200 rounded-t flex-1" style={{ height: `${h}%` }}></div>
      ))}
    </div>
  </div>
);
