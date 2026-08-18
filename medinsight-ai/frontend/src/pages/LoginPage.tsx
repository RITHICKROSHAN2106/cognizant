import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Lock, User, ShieldAlert, ArrowRight, ShieldCheck, Stethoscope, HeartPulse, Shield, Utensils, Dumbbell, Activity } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('dr.sarah');
  const [password, setPassword] = useState('doctor123');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await login(username, password);
      navigate('/');
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Invalid clinical credentials or username.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = async (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setIsLoading(true);
    setError(null);
    try {
      await login(u, p);
      navigate('/');
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Unable to authenticate staff account.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const quickRoles = [
    {
      name: 'System Administrator',
      role: 'ADMINISTRATOR',
      staffId: 'ADM-00001',
      username: 'admin',
      pwd: 'admin123',
      icon: Shield,
      color: 'border-purple-200 bg-purple-50/50 hover:bg-purple-50 text-purple-900',
      badge: 'bg-purple-100 text-purple-800'
    },
    {
      name: 'Dr. Sarah Mitchell',
      role: 'PHYSICIAN / DOCTOR',
      staffId: 'DOC-00124',
      username: 'dr.sarah',
      pwd: 'doctor123',
      icon: Stethoscope,
      color: 'border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50 text-emerald-900',
      badge: 'bg-emerald-100 text-emerald-800'
    },
    {
      name: 'Nurse Emily Watson',
      role: 'INPATIENT RN',
      staffId: 'NUR-00891',
      username: 'nurse.emily',
      pwd: 'nurse123',
      icon: Activity,
      color: 'border-blue-200 bg-blue-50/50 hover:bg-blue-50 text-blue-900',
      badge: 'bg-blue-100 text-blue-800'
    },
    {
      name: 'Alex Rivera, MSW',
      role: 'CARE COORDINATOR',
      staffId: 'CRD-00432',
      username: 'coordinator.alex',
      pwd: 'coordinator123',
      icon: HeartPulse,
      color: 'border-amber-200 bg-amber-50/50 hover:bg-amber-50 text-amber-900',
      badge: 'bg-amber-100 text-amber-800'
    },
    {
      name: 'Elena Rostova, RD',
      role: 'DIETICIAN',
      staffId: 'DIE-00311',
      username: 'dietician.elena',
      pwd: 'dietician123',
      icon: Utensils,
      color: 'border-teal-200 bg-teal-50/50 hover:bg-teal-50 text-teal-900',
      badge: 'bg-teal-100 text-teal-800'
    },
    {
      name: 'David Chen, DPT',
      role: 'REHAB SPECIALIST',
      staffId: 'REH-00205',
      username: 'rehab.david',
      pwd: 'rehab123',
      icon: Dumbbell,
      color: 'border-orange-200 bg-orange-50/50 hover:bg-orange-50 text-orange-900',
      badge: 'bg-orange-100 text-orange-800'
    },
  ];

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full space-y-6">
        {/* Hospital Institutional Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-sky-600 text-white flex items-center justify-center mx-auto shadow-lg border border-sky-400/30">
            <Building2 className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">
            MedInsight Clinical Platform
          </h1>
          <p className="text-xs text-slate-400 font-medium max-w-md mx-auto">
            Institutional EHR, ML Readmission Risk Engine & Role-Based Security Governance
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-800/90 rounded-2xl p-7 shadow-2xl border border-slate-700 backdrop-blur-sm">
          <div className="flex items-center justify-between border-b border-slate-700 pb-3 mb-5">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Lock className="w-4 h-4 text-sky-400" />
              Workforce Sign In
            </h2>
            <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              RBAC Protected
            </span>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-950/60 border border-red-800 rounded-lg text-xs text-red-300 flex items-center gap-2 font-medium">
              <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">
                  Username / Staff ID
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. dr.sarah or DOC-00124"
                    className="w-full pl-9 pr-3 py-2 bg-slate-900/90 border border-slate-700 rounded-lg focus:outline-none focus:border-sky-500 focus:bg-slate-900 text-white font-medium placeholder-slate-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 bg-slate-900/90 border border-slate-700 rounded-lg focus:outline-none focus:border-sky-500 focus:bg-slate-900 text-white font-medium placeholder-slate-500"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-lg shadow-md transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-wider disabled:opacity-50"
            >
              {isLoading ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <>
                  <span>Authenticate Session</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Staff Role Presets */}
          <div className="mt-6 pt-5 border-t border-slate-700 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Clinical Workforce Quick Access (All 6 Roles)
              </span>
              <span className="text-[10px] text-slate-500">1-Click Role Switcher</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-[11px]">
              {quickRoles.map((qr) => (
                <button
                  key={qr.username}
                  type="button"
                  onClick={() => handleQuickLogin(qr.username, qr.pwd)}
                  className="p-2.5 bg-slate-900/80 hover:bg-slate-900 text-left rounded-lg border border-slate-700/80 hover:border-sky-500/60 transition-all group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[8px] font-bold uppercase px-1.5 py-0.2 rounded border ${qr.badge}`}>
                      {qr.role}
                    </span>
                    <span className="text-[9px] font-mono text-slate-400">{qr.staffId}</span>
                  </div>
                  <div className="font-bold text-xs text-white group-hover:text-sky-300 transition-colors">
                    {qr.name}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                    {qr.username} / {qr.pwd}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Compliance Footer Notice */}
        <div className="text-center text-[11px] text-slate-500">
          Authorized hospital workforce only. Access is tracked and audited under HIPAA compliance policies.
        </div>
      </div>
    </div>
  );
};
