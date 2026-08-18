import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Activity,
  Users,
  UserPlus,
  FileText,
  TrendingUp,
  BrainCircuit,
  Share2,
  Server,
  Building2,
  LogOut,
  Stethoscope,
  ShieldAlert,
  HeartPulse,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface NavSection {
  title: string;
  items: {
    label: string;
    path: string;
    icon: any;
    badge?: string;
  }[];
}

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const navSections: NavSection[] = [
    {
      title: 'CLINICAL',
      items: [
        { label: 'Overview', path: '/', icon: Activity },
        { label: 'Patient Census', path: '/patients', icon: Users },
        { label: 'Admissions', path: '/patients/new', icon: UserPlus },
        { label: 'Clinical Records', path: '/patients', icon: Stethoscope },
      ]
    },
    {
      title: 'CARE MANAGEMENT',
      items: [
        { label: 'Readmission Risk', path: '/risk', icon: BrainCircuit },
        { label: 'Post-Discharge Care', path: '/post-discharge', icon: HeartPulse },
        { label: 'Care Coordination', path: '/high-risk', icon: ShieldAlert },
        { label: 'Discharge Planning', path: '/reports', icon: FileText },
      ]
    },
    {
      title: 'OPERATIONS',
      items: [
        { label: 'Analytics', path: '/analytics', icon: TrendingUp },
        { label: 'Integrations', path: '/integrations', icon: Share2 },
      ]
    },
    {
      title: 'SYSTEM',
      items: [
        { label: 'Administration', path: '/system-health', icon: Server },
      ]
    }
  ];

  return (
    <aside
      className={`${
        collapsed ? 'w-16' : 'w-60'
      } bg-[#0b1329] text-slate-300 flex flex-col shrink-0 h-screen border-r border-slate-800 transition-all duration-200 select-none z-30`}
    >
      {/* Institution Branding Header */}
      <div className="h-14 px-3.5 border-b border-slate-800 flex items-center justify-between">
        {!collapsed && (
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-7 h-7 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-sky-400 shrink-0">
              <Building2 className="w-4 h-4" />
            </div>
            <div className="overflow-hidden">
              <div className="font-bold text-xs tracking-tight text-white flex items-center gap-1">
                MedInsight <span className="text-[10px] font-semibold text-slate-400">CIS</span>
              </div>
              <div className="text-[9px] text-slate-400 uppercase tracking-wider truncate font-medium">
                Clinical Information System
              </div>
            </div>
          </div>
        )}

        {collapsed && (
          <div className="mx-auto w-7 h-7 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-sky-400">
            <Building2 className="w-4 h-4" />
          </div>
        )}

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto py-2.5 space-y-4">
        {navSections.map((section, idx) => (
          <div key={idx} className="px-2">
            {!collapsed && (
              <div className="px-2.5 pb-1.5 text-[9px] font-bold tracking-wider text-slate-400 uppercase">
                {section.title}
              </div>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavLink
                  key={item.path + item.label}
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-2.5 py-2 text-xs font-medium transition-colors border-l-2 ${
                      isActive
                        ? 'border-sky-500 bg-slate-800/90 text-white font-semibold'
                        : 'border-transparent text-slate-300 hover:bg-slate-800/40 hover:text-white'
                    } ${collapsed ? 'justify-center px-0' : ''}`
                  }
                  title={collapsed ? item.label : undefined}
                >
                  <item.icon className="w-4 h-4 shrink-0 opacity-80" />
                  {!collapsed && (
                    <span className="flex-1 truncate text-left">{item.label}</span>
                  )}
                  {!collapsed && item.badge && (
                    <span className="px-1.5 py-0.5 text-[9px] font-semibold rounded bg-sky-900/60 text-sky-300 border border-sky-700/50">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* User Session Footer */}
      <div className="p-2.5 border-t border-slate-800 bg-[#090f20]">
        {!collapsed ? (
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-sky-400 shrink-0">
                {user?.full_name ? user.full_name[0] : (user?.username ? user.username[0].toUpperCase() : 'U')}
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-semibold text-white truncate">
                  {user?.full_name || user?.username || 'Clinical User'}
                </div>
                <div className="text-[9px] text-slate-400 uppercase tracking-wider truncate font-medium">
                  {user?.role ? user.role.replace('_', ' ') : 'Staff'}
                </div>
              </div>
            </div>
            <button
              onClick={logout}
              className="p-1.5 rounded text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors shrink-0"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={logout}
            className="w-full flex items-center justify-center p-1.5 rounded text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </aside>
  );
};
