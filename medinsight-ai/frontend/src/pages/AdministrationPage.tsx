import React, { useState, useEffect } from 'react';
import {
  Shield, Users, Lock, KeyRound, Unlock, UserCheck, UserX,
  AlertTriangle, RefreshCw, Plus, Search, Filter, ShieldCheck,
  CheckCircle2, XCircle, Clock, Eye, Activity, FileText, Database,
  Settings, Building2, UserPlus, ArrowUpDown
} from 'lucide-react';
import { adminService } from '../services/authService';
import { User, AuditLogEntry, SecurityStatus, RolePermissionMatrix, StaffUserCreate } from '../types/clinical';
import { useAuth } from '../contexts/AuthContext';

export const AdministrationPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'staff' | 'roles' | 'security'>('staff');

  // Staff State
  const [staffUsers, setStaffUsers] = useState<User[]>([]);
  const [staffLoading, setStaffLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isResetPwdModalOpen, setIsResetPwdModalOpen] = useState<boolean>(false);
  const [selectedUserForReset, setSelectedUserForReset] = useState<User | null>(null);
  const [tempPassword, setTempPassword] = useState<string>('');
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [actionErrorMsg, setActionErrorMsg] = useState<string | null>(null);

  // New User Form State
  const [newUserForm, setNewUserForm] = useState<StaffUserCreate>({
    staff_id: '',
    first_name: '',
    last_name: '',
    email: '',
    username: '',
    role: 'nurse',
    department: 'Internal Medicine',
    facility: 'MedInsight Central Hospital',
    temporary_password: '',
    must_change_password: true,
  });

  // Roles Matrix State
  const [rolesMatrix, setRolesMatrix] = useState<RolePermissionMatrix[]>([]);
  const [rolesLoading, setRolesLoading] = useState<boolean>(false);

  // Security Status & Audit State
  const [securityStatus, setSecurityStatus] = useState<SecurityStatus | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState<boolean>(false);
  const [auditActionFilter, setAuditActionFilter] = useState<string>('');

  const loadStaffUsers = async () => {
    setStaffLoading(true);
    try {
      const data = await adminService.getStaffUsers({
        role: roleFilter !== 'all' ? roleFilter : undefined,
        search: searchQuery || undefined,
        is_active: statusFilter === 'active' ? true : statusFilter === 'inactive' ? false : undefined,
      });
      setStaffUsers(data || []);
    } catch (err: any) {
      setActionErrorMsg(err.response?.data?.detail || 'Failed to retrieve workforce directory.');
    } finally {
      setStaffLoading(false);
    }
  };

  const loadRolesMatrix = async () => {
    setRolesLoading(true);
    try {
      const data = await adminService.getRolesMatrix();
      setRolesMatrix(data || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setRolesLoading(false);
    }
  };

  const loadSecurityAndAudit = async () => {
    setAuditLoading(true);
    try {
      const [sec, logs] = await Promise.all([
        adminService.getSecurityStatus(),
        adminService.getAuditLogs({
          action: auditActionFilter || undefined,
          limit: 50,
        }),
      ]);
      setSecurityStatus(sec);
      setAuditLogs(logs || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setAuditLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'staff') {
      loadStaffUsers();
    } else if (activeTab === 'roles') {
      loadRolesMatrix();
    } else if (activeTab === 'security') {
      loadSecurityAndAudit();
    }
  }, [activeTab, roleFilter, statusFilter]);

  const handleUnlockUser = async (userId: number, name: string) => {
    try {
      await adminService.unlockStaffUser(userId);
      setActionSuccessMsg(`Account for ${name} has been successfully unlocked.`);
      loadStaffUsers();
      setTimeout(() => setActionSuccessMsg(null), 4000);
    } catch (err: any) {
      setActionErrorMsg(err.response?.data?.detail || 'Failed to unlock staff account.');
    }
  };

  const handleToggleActive = async (user: User) => {
    try {
      const newStatus = !user.is_active;
      await adminService.updateStaffUser(user.id, { is_active: newStatus });
      setActionSuccessMsg(`Staff user ${user.full_name} ${newStatus ? 'activated' : 'deactivated'}.`);
      loadStaffUsers();
      setTimeout(() => setActionSuccessMsg(null), 4000);
    } catch (err: any) {
      setActionErrorMsg(err.response?.data?.detail || 'Failed to update user status.');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForReset) return;
    try {
      await adminService.resetStaffPassword(selectedUserForReset.id, tempPassword, true);
      setIsResetPwdModalOpen(false);
      setActionSuccessMsg(`Temporary password set for ${selectedUserForReset.full_name}. User sessions revoked.`);
      setTimeout(() => setActionSuccessMsg(null), 4000);
    } catch (err: any) {
      setActionErrorMsg(err.response?.data?.detail || 'Failed to reset password.');
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adminService.createStaffUser(newUserForm);
      setIsAddModalOpen(false);
      setActionSuccessMsg(`Staff member ${newUserForm.first_name} ${newUserForm.last_name} enrolled successfully.`);
      setNewUserForm({
        staff_id: '',
        first_name: '',
        last_name: '',
        email: '',
        username: '',
        role: 'nurse',
        department: 'Internal Medicine',
        facility: 'MedInsight Central Hospital',
        temporary_password: 'StaffInitial123!',
        must_change_password: true,
      });
      loadStaffUsers();
      setTimeout(() => setActionSuccessMsg(null), 4000);
    } catch (err: any) {
      setActionErrorMsg(err.response?.data?.detail || 'Failed to create staff account.');
    }
  };

  const getRoleBadge = (role: string) => {
    const r = role.toLowerCase();
    let color = 'bg-slate-100 text-slate-700 border-slate-300';
    if (r.includes('admin')) color = 'bg-purple-100 text-purple-800 border-purple-200';
    else if (r.includes('physician') || r.includes('doctor')) color = 'bg-emerald-100 text-emerald-800 border-emerald-200';
    else if (r.includes('nurse')) color = 'bg-blue-100 text-blue-800 border-blue-200';
    else if (r.includes('coordinator')) color = 'bg-amber-100 text-amber-800 border-amber-200';
    else if (r.includes('dietician')) color = 'bg-teal-100 text-teal-800 border-teal-200';
    else if (r.includes('rehab')) color = 'bg-orange-100 text-orange-800 border-orange-200';
    return (
      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${color}`}>
        {role.replace('_', ' ')}
      </span>
    );
  };

  const permissionCategories = [
    {
      name: 'Clinical EHR Access',
      perms: [
        { key: 'patient:view', label: 'View Patient Census & Demographics' },
        { key: 'patient:create', label: 'Enroll New Inpatient Admission' },
        { key: 'patient:update_demographics', label: 'Update Demographics' },
        { key: 'encounter:view', label: 'View Encounters' },
        { key: 'encounter:create', label: 'Record Readmission / Return Encounter' },
        { key: 'diagnosis:update', label: 'Record ICD Diagnosis & Notes' },
        { key: 'vitals:create', label: 'Record Telemetry / Vital Observations' },
      ],
    },
    {
      name: 'ML Predictions & Decision Support',
      perms: [
        { key: 'prediction:view', label: 'View Model Probabilities & Risk Tier' },
        { key: 'prediction:run', label: 'Execute XGBoost / LightGBM Scoring' },
        { key: 'prediction:explain', label: 'Inspect TreeSHAP Risk Drivers' },
        { key: 'copilot:query', label: 'Consult Clinical AI Copilot' },
      ],
    },
    {
      name: 'Post-Discharge Care Continuity',
      perms: [
        { key: 'followup:view', label: 'View Post-Discharge Command Queue' },
        { key: 'followup:update', label: 'Update 4-Week Follow-up Status' },
        { key: 'care_plan:update', label: 'Update Care Coordination Plan' },
        { key: 'medications:update', label: 'Reconcile 30-Day Medication Supply' },
        { key: 'nutrition:update', label: 'Prescribe Diet & Carbohydrate Protocol' },
        { key: 'rehabilitation:update', label: 'Prescribe Physical Therapy Protocol' },
        { key: 'discharge:update', label: 'Authorize Hospital Discharge Plan' },
      ],
    },
    {
      name: 'Administration & Governance',
      perms: [
        { key: 'users:view', label: 'View Staff Workforce Directory' },
        { key: 'users:create', label: 'Enroll New Hospital Staff User' },
        { key: 'users:update', label: 'Modify Staff Roles & Unlock Accounts' },
        { key: 'users:disable', label: 'Deactivate Staff Access' },
        { key: 'roles:manage', label: 'Manage RBAC Permissions Matrix' },
        { key: 'audit:view', label: 'View HIPAA Compliance Audit Trails' },
        { key: 'security:view', label: 'Monitor Active Sessions & Threat Stream' },
        { key: 'reports:export', label: 'Export Cohort & Executive Reports' },
      ],
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-sky-700 uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4 text-sky-600" />
            Institutional Governance & Security
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Workforce Administration & Access Control
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Database-backed Role-Based Access Control (RBAC), Staff Directory, and HIPAA Audit Surveillance.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 self-start md:self-auto text-xs font-bold">
          <button
            onClick={() => setActiveTab('staff')}
            className={`px-3.5 py-1.5 rounded-lg flex items-center gap-2 transition-all ${
              activeTab === 'staff'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Staff Directory
          </button>
          <button
            onClick={() => setActiveTab('roles')}
            className={`px-3.5 py-1.5 rounded-lg flex items-center gap-2 transition-all ${
              activeTab === 'roles'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            Roles & Permissions
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`px-3.5 py-1.5 rounded-lg flex items-center gap-2 transition-all ${
              activeTab === 'security'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            Security & Audit
          </button>
        </div>
      </div>

      {/* Notifications */}
      {actionSuccessMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2 font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}
      {actionErrorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-center gap-2 font-medium">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{actionErrorMsg}</span>
        </div>
      )}

      {/* TAB 1: STAFF DIRECTORY */}
      {activeTab === 'staff' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search staff by name, MRN, ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadStaffUsers()}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-sky-500 focus:bg-white"
                />
              </div>

              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-sky-500 font-medium"
              >
                <option value="all">All Roles</option>
                <option value="administrator">Administrator</option>
                <option value="physician">Physician / Doctor</option>
                <option value="nurse">Nurse</option>
                <option value="care_coordinator">Care Coordinator</option>
                <option value="dietician">Dietician</option>
                <option value="rehab_specialist">Rehabilitation Specialist</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-sky-500 font-medium"
              >
                <option value="all">All Status</option>
                <option value="active">Active Staff</option>
                <option value="inactive">Deactivated</option>
              </select>

              <button
                onClick={loadStaffUsers}
                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                title="Refresh Table"
              >
                <RefreshCw className={`w-4 h-4 ${staffLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="w-full md:w-auto px-4 py-2 bg-sky-700 hover:bg-sky-800 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-2 shadow-xs transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Enroll Staff Member
            </button>
          </div>

          {/* Staff Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Staff ID & Name</th>
                    <th className="px-4 py-3">Assigned Role</th>
                    <th className="px-4 py-3">Department & Facility</th>
                    <th className="px-4 py-3">Account State</th>
                    <th className="px-4 py-3">Last Active</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                  {staffLoading ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-400">
                        <div className="flex items-center justify-center gap-2">
                          <RefreshCw className="w-4 h-4 animate-spin text-sky-600" />
                          <span>Loading clinical workforce records...</span>
                        </div>
                      </td>
                    </tr>
                  ) : staffUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-400">
                        No staff accounts matching search filters.
                      </td>
                    </tr>
                  ) : (
                    staffUsers.map((u) => {
                      const isLocked = !!u.locked_until;
                      return (
                        <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-900">{u.full_name || u.username}</div>
                            <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1.5">
                              <span className="font-bold text-sky-800">{u.staff_id || `STF-${u.id}`}</span>
                              <span>•</span>
                              <span>{u.username}</span>
                              <span>•</span>
                              <span>{u.email}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">{getRoleBadge(u.role)}</td>
                          <td className="px-4 py-3">
                            <div className="text-slate-900 font-semibold">{u.department}</div>
                            <div className="text-[10px] text-slate-500">{u.facility || 'MedInsight Central Hospital'}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {u.is_active ? (
                                <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                                  <UserCheck className="w-3 h-3" />
                                  Active
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-100 border border-slate-300 px-2 py-0.5 rounded-md">
                                  <UserX className="w-3 h-3" />
                                  Disabled
                                </span>
                              )}
                              {isLocked && (
                                <span className="flex items-center gap-1 text-[11px] font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-md">
                                  <Lock className="w-3 h-3" />
                                  Locked ({u.failed_login_attempts} fails)
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-[11px] text-slate-500">
                            {u.last_login_at ? new Date(u.last_login_at).toLocaleString() : 'Never logged in'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {isLocked && (
                                <button
                                  onClick={() => handleUnlockUser(u.id, u.full_name)}
                                  className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold rounded border border-amber-300 text-[10px] flex items-center gap-1"
                                  title="Reset Lockout"
                                >
                                  <Unlock className="w-3 h-3" />
                                  Unlock
                                </button>
                              )}

                              <button
                                onClick={() => {
                                  setSelectedUserForReset(u);
                                  setIsResetPwdModalOpen(true);
                                }}
                                className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-300"
                                title="Reset Password"
                              >
                                <KeyRound className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => handleToggleActive(u)}
                                className={`px-2 py-1 font-bold rounded border text-[10px] ${
                                  u.is_active
                                    ? 'bg-red-50 hover:bg-red-100 text-red-700 border-red-200'
                                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                                }`}
                              >
                                {u.is_active ? 'Disable' : 'Enable'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ROLES & PERMISSIONS MATRIX */}
      {activeTab === 'roles' && (
        <div className="space-y-6">
          <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-900/60 border border-purple-500/40 flex items-center justify-center text-purple-300 shrink-0">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-black">Role-Based Access Control (RBAC) Governance Matrix</h2>
                <p className="text-xs text-slate-300 font-medium">
                  Hierarchical separation of duties across EHR clinical operations, ML scoring, and hospital system management.
                </p>
              </div>
            </div>
          </div>

          {rolesLoading ? (
            <div className="text-center py-12 text-slate-500">
              <RefreshCw className="w-6 h-6 animate-spin text-sky-600 mx-auto mb-2" />
              <p className="text-xs font-semibold">Resolving institutional permissions matrix...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {permissionCategories.map((cat, catIdx) => (
                <div key={catIdx} className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                  <div className="bg-slate-50/80 px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-sky-600"></span>
                      {cat.name}
                    </h3>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50/40 border-b border-slate-100 text-slate-500 font-bold uppercase text-[9px]">
                        <tr>
                          <th className="px-5 py-2.5 text-left w-1/3">Permission Operation</th>
                          {rolesMatrix.map((r) => (
                            <th key={r.role} className="px-3 py-2.5 text-center">
                              <div>{r.display_name}</div>
                              <div className="text-[8px] text-slate-400 font-normal">({r.staff_count} staff)</div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {cat.perms.map((p) => (
                          <tr key={p.key} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-5 py-3">
                              <div className="font-semibold text-slate-800">{p.label}</div>
                              <div className="text-[10px] text-slate-500 font-mono">{p.key}</div>
                            </td>
                            {rolesMatrix.map((r) => {
                              const hasPerm = r.permissions.includes(p.key) || r.role === 'administrator';
                              return (
                                <td key={r.role} className="px-3 py-3 text-center">
                                  {hasPerm ? (
                                    <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
                                      <CheckCircle2 className="w-4 h-4" />
                                    </div>
                                  ) : (
                                    <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-50 text-slate-300">
                                      <XCircle className="w-4 h-4" />
                                    </div>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SECURITY MONITOR & AUDIT TRAIL */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          {/* Real-time KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Staff</div>
              <div className="text-2xl font-black text-slate-900 mt-1">{securityStatus?.total_staff || 0}</div>
              <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">Enrolled Accounts</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Active Staff</div>
              <div className="text-2xl font-black text-emerald-700 mt-1">{securityStatus?.active_staff || 0}</div>
              <div className="text-[10px] text-slate-500 font-medium mt-0.5">Operational workforce</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Active Sessions</div>
              <div className="text-2xl font-black text-sky-700 mt-1">{securityStatus?.active_sessions || 0}</div>
              <div className="text-[10px] text-slate-500 font-medium mt-0.5">Live devices connected</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Locked Accounts</div>
              <div className="text-2xl font-black text-red-600 mt-1">{securityStatus?.locked_accounts || 0}</div>
              <div className="text-[10px] text-slate-500 font-medium mt-0.5">Security lockout triggered</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs col-span-2 md:col-span-1">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">HIPAA Audit Logs</div>
              <div className="text-2xl font-black text-purple-700 mt-1">{securityStatus?.recent_events_count || 0}</div>
              <div className="text-[10px] text-slate-500 font-medium mt-0.5">Buffered security events</div>
            </div>
          </div>

          {/* Audit Logs Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-sky-700" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  HIPAA Security Audit Trail (MongoDB Collection)
                </h3>
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto">
                <select
                  value={auditActionFilter}
                  onChange={(e) => setAuditActionFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-sky-500"
                >
                  <option value="">All Security Actions</option>
                  <option value="LOGIN_SUCCESS">LOGIN_SUCCESS</option>
                  <option value="LOGIN_FAILURE">LOGIN_FAILURE</option>
                  <option value="PREDICTION_GENERATED">PREDICTION_GENERATED</option>
                  <option value="PATIENT_VIEW">PATIENT_VIEW</option>
                  <option value="REPORT_PDF_EXPORTED">REPORT_PDF_EXPORTED</option>
                  <option value="ACCOUNT_UNLOCKED">ACCOUNT_UNLOCKED</option>
                </select>

                <button
                  onClick={loadSecurityAndAudit}
                  className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                  title="Refresh Audit Logs"
                >
                  <RefreshCw className={`w-4 h-4 ${auditLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">Staff Identity</th>
                    <th className="px-4 py-3">Action Event</th>
                    <th className="px-4 py-3">Resource Target</th>
                    <th className="px-4 py-3">Details / Context</th>
                    <th className="px-4 py-3">Client IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                  {auditLoading ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-400">
                        Loading security audit entries...
                      </td>
                    </tr>
                  ) : auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-400">
                        No audit records found matching criteria.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log, idx) => (
                      <tr key={log.id || idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-2.5 font-mono text-[10px] text-slate-500">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="font-bold text-slate-900">{log.username}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{log.staff_id || 'STF-UNKNOWN'}</div>
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                              log.action.includes('FAILURE') || log.action.includes('BLOCKED')
                                ? 'bg-red-50 text-red-700 border-red-200'
                                : log.action.includes('SUCCESS') || log.action.includes('UNLOCKED')
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-sky-50 text-sky-800 border-sky-200'
                            }`}
                          >
                            {log.action}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 font-mono text-[11px] text-slate-700">{log.resource}</td>
                        <td className="px-4 py-2.5 text-[11px] text-slate-600 max-w-xs truncate">
                          {log.details ? JSON.stringify(log.details) : log.patient_id ? `Patient #${log.patient_id}` : '—'}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-[10px] text-slate-500">{log.ip_address || '127.0.0.1'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ENROLL NEW STAFF MEMBER */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-sky-700" />
                Enroll Clinical Workforce Staff
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    value={newUserForm.first_name}
                    onChange={(e) => setNewUserForm({ ...newUserForm, first_name: e.target.value })}
                    placeholder="e.g. Robert"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    value={newUserForm.last_name}
                    onChange={(e) => setNewUserForm({ ...newUserForm, last_name: e.target.value })}
                    placeholder="e.g. Vance"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Staff ID</label>
                  <input
                    type="text"
                    required
                    value={newUserForm.staff_id}
                    onChange={(e) => setNewUserForm({ ...newUserForm, staff_id: e.target.value })}
                    placeholder="DOC-00501"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Username</label>
                  <input
                    type="text"
                    required
                    value={newUserForm.username}
                    onChange={(e) => setNewUserForm({ ...newUserForm, username: e.target.value })}
                    placeholder="dr.vance"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Work Email</label>
                <input
                  type="email"
                  required
                  value={newUserForm.email}
                  onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                  placeholder="robert.vance@medinsight.hospital"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Assigned Role</label>
                  <select
                    value={newUserForm.role}
                    onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium"
                  >
                    <option value="physician">Physician / Doctor</option>
                    <option value="nurse">Inpatient Nurse (RN)</option>
                    <option value="care_coordinator">Care Coordinator</option>
                    <option value="dietician">Dietician</option>
                    <option value="rehab_specialist">Rehab Specialist</option>
                    <option value="administrator">System Administrator</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Department</label>
                  <input
                    type="text"
                    required
                    value={newUserForm.department}
                    onChange={(e) => setNewUserForm({ ...newUserForm, department: e.target.value })}
                    placeholder="Cardiology / Internal Med"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Temporary Initial Password</label>
                <input
                  type="text"
                  required
                  value={newUserForm.temporary_password}
                  onChange={(e) => setNewUserForm({ ...newUserForm, temporary_password: e.target.value })}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="mustChange"
                  checked={newUserForm.must_change_password}
                  onChange={(e) => setNewUserForm({ ...newUserForm, must_change_password: e.target.checked })}
                  className="rounded text-sky-600"
                />
                <label htmlFor="mustChange" className="text-slate-700 text-[11px] font-medium">
                  Require password change on first clinical sign-in
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-sky-700 hover:bg-sky-800 text-white font-bold rounded-lg shadow-xs"
                >
                  Enroll Staff
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RESET PASSWORD */}
      {isResetPwdModalOpen && selectedUserForReset && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-600" />
                Reset Staff Password
              </h3>
              <button
                onClick={() => setIsResetPwdModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 font-medium">
              Setting a temporary password for <strong>{selectedUserForReset.full_name}</strong> ({selectedUserForReset.username}). All active device sessions will be revoked.
            </p>

            <form onSubmit={handleResetPassword} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Temporary Password</label>
                <input
                  type="text"
                  required
                  value={tempPassword}
                  onChange={(e) => setTempPassword(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsResetPwdModalOpen(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg shadow-xs"
                >
                  Confirm Reset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
