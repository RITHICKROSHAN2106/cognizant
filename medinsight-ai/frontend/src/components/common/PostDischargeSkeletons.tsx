import React from 'react';

export const PostDischargeDashboardSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 bg-slate-200 rounded w-1/3"></div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 bg-slate-200 rounded-xl"></div>
        ))}
      </div>
      <div className="h-96 bg-slate-200 rounded-xl"></div>
    </div>
  );
};

export const FollowUpTimelineSkeleton: React.FC = () => {
  return (
    <div className="space-y-3 animate-pulse">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-16 bg-slate-100 rounded-lg border border-slate-200"></div>
      ))}
    </div>
  );
};

export const MedicationSupplySkeleton: React.FC = () => {
  return (
    <div className="space-y-2.5 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-14 bg-slate-100 rounded-lg"></div>
      ))}
    </div>
  );
};

export const NutritionPlanSkeleton: React.FC = () => {
  return (
    <div className="p-4 bg-slate-100 rounded-xl space-y-3 animate-pulse">
      <div className="h-4 bg-slate-200 rounded w-1/2"></div>
      <div className="h-3 bg-slate-200 rounded w-3/4"></div>
      <div className="h-3 bg-slate-200 rounded w-2/3"></div>
    </div>
  );
};
