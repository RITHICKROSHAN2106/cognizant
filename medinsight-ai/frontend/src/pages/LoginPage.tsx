import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Lock, User, ShieldAlert, ArrowRight, ShieldCheck } from 'lucide-react';
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
      setError(err.response?.data?.detail || 'Invalid clinical credentials.');
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
      setError('Unable to authenticate staff account.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        {/* Hospital Institutional Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-sky-700 text-white flex items-center justify-center mx-auto shadow-md border border-sky-800">
            <Building2 className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            MedInsight Clinical Platform
          </h1>
          <p className="text-xs text-slate-600 font-medium max-w-sm mx-auto">
            Electronic Health Record & Readmission Decision Support
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-xl p-7 shadow-sm border border-slate-300">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-5">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Staff Authentication
            </h2>
            <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Secure Portal
            </span>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2 font-medium">
              <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-700 font-bold mb-1.5">
                Username / Staff ID
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. dr.sarah"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600 focus:bg-white text-slate-900 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1.5">
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
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600 focus:bg-white text-slate-900 font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-sky-700 hover:bg-sky-800 text-white font-bold rounded-lg shadow-xs transition-colors flex items-center justify-center gap-2 text-xs uppercase tracking-wider"
            >
              {isLoading ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Staff Presets */}
          <div className="mt-6 pt-4 border-t border-slate-200 space-y-2">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">
              Hospital Staff Directory (1-Click Login)
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <button
                type="button"
                onClick={() => handleQuickLogin('dr.sarah', 'doctor123')}
                className="p-2 bg-slate-50 hover:bg-sky-50 text-slate-800 hover:text-sky-900 rounded border border-slate-200 text-left transition-colors font-medium"
              >
                <div className="font-bold text-xs text-slate-900">Dr. Sarah Mitchell</div>
                <div className="text-[10px] text-slate-500">Attending Physician</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('nurse.emily', 'nurse123')}
                className="p-2 bg-slate-50 hover:bg-sky-50 text-slate-800 hover:text-sky-900 rounded border border-slate-200 text-left transition-colors font-medium"
              >
                <div className="font-bold text-xs text-slate-900">Nurse Emily Watson</div>
                <div className="text-[10px] text-slate-500">Inpatient RN</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('coordinator.alex', 'coordinator123')}
                className="p-2 bg-slate-50 hover:bg-sky-50 text-slate-800 hover:text-sky-900 rounded border border-slate-200 text-left transition-colors font-medium"
              >
                <div className="font-bold text-xs text-slate-900">Alex Rivera, MSW</div>
                <div className="text-[10px] text-slate-500">Care Coordinator</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('admin', 'admin123')}
                className="p-2 bg-slate-50 hover:bg-sky-50 text-slate-800 hover:text-sky-900 rounded border border-slate-200 text-left transition-colors font-medium"
              >
                <div className="font-bold text-xs text-slate-900">System Administrator</div>
                <div className="text-[10px] text-slate-500">Clinical Informatics</div>
              </button>
            </div>
          </div>
        </div>

        {/* Compliance Footer Notice */}
        <div className="text-center text-[11px] text-slate-500">
          Authorized clinical personnel only. All access is logged and audited under HIPAA and hospital policy.
        </div>
      </div>
    </div>
  );
};
