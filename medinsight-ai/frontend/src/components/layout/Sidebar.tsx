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
  ChevronRight,
  ShieldCheck,
  Lock,
  Utensils,
  Dumbbell
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface NavItem {
  label: string;
  path: string;
  icon: any;
  badge?: string;
  requiredPermission?: string;
  requiredRoles?: string[];
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export const Sidebar: React.FC = () => {
  const { user, logout, hasPermission, hasRole } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const rawNavSections: NavSection[] = [
    {
      title: 'CLINICAL EHR',
      items: [
        { label: 'Overview', path: '/', icon: Activity },
        { label: 'Patient Census', path: '/patients', icon: Users, requiredPermission: 'patient:view' },
        { label: 'New Admission', path: '/patients/new', icon: UserPlus, requiredPermission: 'patient:create' },
      ]
    },
    {
      title: 'CARE MANAGEMENT',
      items: [
        { label: 'Readmission Risk AI', path: '/risk', icon: BrainCircuit, requiredPermission: 'prediction:view' },
        { label: 'Post-Discharge Center', path: '/post-discharge', icon: HeartPulse, requiredPermission: 'followup:view' },
        { label: 'High-Risk Coordination', path: '/high-risk', icon: ShieldAlert, requiredPermission: 'care_plan:view' },
        { label: 'Clinical Reports', path: '/reports', icon: FileText, requiredPermission: 'reports:view' },
      ]
    },
    {
      title: 'HOSPITAL OPERATIONS',
      items: [
        { label: 'Analytics & KPIs', path: '/analytics', icon: TrendingUp, requiredPermission: 'analytics:view' },
        { label: 'FHIR & Integrations', path: '/integrations', icon: Share2, requiredPermission: 'integrations:view' },
      ]
    },
    {
      title: 'GOVERNANCE & SECURITY',
      items: [
        {
          label: 'Administration & RBAC',
          path: '/admin',
          icon: ShieldCheck,
          badge: 'Security',
          requiredPermission: 'users:view'
        },
        {
          label: 'System Health',
          path: '/system-health',
          icon: Server,
          requiredPermission: 'system:view'
        },
      ]
    }
  ];

  // Filter sections and items based on permissions
  const navSections = rawNavSections
    .map(section => ({
      ...section,
      items: section.items.filter(item => {
        if (item.requiredPermission && !hasPermission(item.requiredPermission)) {
          return false;
        }
        if (item.requiredRoles && !item.requiredRoles.some(r => hasRole(r))) {
          return false;
        }
        return true;
      })
    }))
    .filter(section => section.items.length > 0);

  const getRoleBadgeStyle = (role?: string) => {
    switch (role?.toLowerCase()) {
      case 'administrator':
      case 'super_admin':
        return 'bg-purple-900/60 text-purple-300 border-purple-700/50';
      case 'physician':
        return 'bg-emerald-900/60 text-emerald-300 border-emerald-700/50';
      case 'nurse':
        return 'bg-blue-900/60 text-blue-300 border-blue-700/50';
      case 'care_coordinator':
        return 'bg-amber-900/60 text-amber-300 border-amber-700/50';
      case 'dietician':
        return 'bg-teal-900/60 text-teal-300 border-teal-700/50';
      case 'rehab_specialist':
        return 'bg-orange-900/60 text-orange-300 border-orange-700/50';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

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
                <div className="text-[11px] font-semibold text-white truncate flex items-center gap-1.5">
                  <span className="truncate">{user?.full_name || user?.username || 'Staff User'}</span>
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className={`text-[8px] font-bold uppercase px-1.5 py-0.2 rounded border ${getRoleBadgeStyle(user?.role)}`}>
                    {user?.role ? user.role.replace('_', ' ') : 'Staff'}
                  </span>
                  {user?.staff_id && (
                    <span className="text-[8px] text-slate-500 font-mono">
                      {user.staff_id}
                    </span>
                  )}
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
