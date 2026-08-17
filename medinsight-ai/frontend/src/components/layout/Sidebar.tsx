import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Activity,
  Users,
  UserPlus,
  AlertTriangle,
  FileText,
  TrendingUp,
  BrainCircuit,
  Share2,
  Server,
  Building2,
  LogOut,
  Stethoscope,
  Bot,
  Sparkles,
  ShieldAlert,
  Calendar
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navItems = [
    { label: 'Clinical Overview', path: '/', icon: Activity },
    { label: 'Inpatient Census', path: '/patients', icon: Users },
    { label: 'New Patient Intake', path: '/patients/new', icon: UserPlus, highlight: true },
    { label: 'High-Risk Safety Queue', path: '/high-risk', icon: ShieldAlert, badge: '5 Critical' },
    { label: 'Readmission Risk', path: '/risk', icon: BrainCircuit, badge: 'ML Model' },
    { label: 'Clinical AI Copilot', path: '/chat', icon: Bot, aiBadge: 'Gemini' },
    { label: 'Clinical Reports & PDF', path: '/reports', icon: FileText },
    { label: 'Readmission Analytics', path: '/analytics', icon: TrendingUp },
    { label: 'Hospital Integrations', path: '/integrations', icon: Share2 },
    { label: 'System Diagnostics', path: '/system-health', icon: Server },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col shrink-0 h-screen border-r border-slate-800 select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-sky-700 flex items-center justify-center text-white shadow-xs border border-sky-600">
          <Building2 className="w-5 h-5" />
        </div>
        <div>
          <div className="font-extrabold text-sm tracking-tight text-white flex items-center gap-1.5">
            MedInsight <span className="text-sky-400 font-bold">CIS</span>
          </div>
          <div className="text-[10px] text-slate-400 font-medium">
            Clinical Information System
          </div>
        </div>
      </div>

      {/* Primary Navigation */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-1 custom-scrollbar">
        <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Clinical Operations
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path || (item.path.startsWith('/ehr') && location.pathname.startsWith('/ehr'));
          return (
            <NavLink
              key={item.label}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-sky-700 text-white shadow-xs font-bold'
                    : item.highlight
                    ? 'text-sky-300 hover:bg-sky-950/40 hover:text-white border border-sky-800/40'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <div className="flex items-center gap-2.5 truncate">
                <Icon className={`w-4 h-4 shrink-0 ${item.highlight ? 'text-sky-400' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge && (
                <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-rose-900/60 text-rose-300 border border-rose-700/60">
                  {item.badge}
                </span>
              )}
              {item.aiBadge && (
                <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-indigo-900/60 text-indigo-300 border border-indigo-700/60 flex items-center gap-0.5">
                  <Sparkles className="w-2.5 h-2.5" />
                  {item.aiBadge}
                </span>
              )}
            </NavLink>
          );
        })}
      </div>

      {/* Active User Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-950">
        <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-900 border border-slate-800">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-7 h-7 rounded bg-sky-900/60 text-sky-400 border border-sky-700/60 flex items-center justify-center font-bold text-xs shrink-0">
              <Stethoscope className="w-3.5 h-3.5" />
            </div>
            <div className="overflow-hidden text-left">
              <div className="text-xs font-bold text-white truncate">
                {user?.full_name || 'Dr. Sarah Mitchell'}
              </div>
              <div className="text-[10px] text-slate-400 truncate capitalize">
                {user?.role || 'Attending Physician'}
              </div>
            </div>
          </div>
          <button
            onClick={logout}
            title="Sign Out"
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
        <div className="mt-2 text-center text-[10px] text-slate-400 flex items-center justify-center gap-1.5 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          <span>MongoDB Atlas High-Availability Active</span>
        </div>
      </div>
    </aside>
  );
};
