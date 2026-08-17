import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Bell,
  Clock,
  User,
  AlertCircle,
  ChevronRight,
  ShieldAlert,
  Calendar,
  Building2,
  X,
  Stethoscope,
  Activity
} from 'lucide-react';
import { patientService } from '../../services/patientService';
import { Patient } from '../../types/clinical';
import { useAuth } from '../../contexts/AuthContext';

export const Header: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const searchRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  // Update clock every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Debounced search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const handler = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await patientService.searchPatients(searchQuery);
        setSearchResults(results);
        setShowDropdown(true);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectPatient = (patientId: number) => {
    setShowDropdown(false);
    setSearchQuery('');
    navigate(`/ehr/${patientId}`);
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between z-20 shrink-0 select-none">
      {/* Facility & Department Indicator */}
      <div className="hidden xl:flex items-center gap-3 pr-4 border-r border-slate-200">
        <div className="w-8 h-8 rounded-lg bg-sky-700 text-white flex items-center justify-center font-bold">
          <Building2 className="w-4 h-4" />
        </div>
        <div>
          <div className="text-xs font-extrabold text-slate-900 tracking-tight">
            Metro General Hospital
          </div>
          <div className="text-[10px] text-slate-500 font-medium">
            Department of Internal Medicine
          </div>
        </div>
      </div>

      {/* Global Patient Search Bar */}
      <div className="relative w-96 max-w-lg" ref={searchRef}>
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchQuery.trim() && setShowDropdown(true)}
            placeholder="Search patient name, MRN (e.g. MRN-104928), or diagnosis..."
            className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600 focus:bg-white transition-all text-slate-900 placeholder-slate-400"
          />
          {searchQuery && (
            <button
              onClick={() => { setSearchQuery(''); setSearchResults([]); }}
              className="absolute right-2.5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Live Search Dropdown */}
        {showDropdown && (
          <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-lg shadow-xl border border-slate-200 max-h-80 overflow-y-auto z-50 divide-y divide-slate-100">
            {isSearching ? (
              <div className="p-4 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-sky-600 border-t-transparent rounded-full animate-spin"></span>
                Searching patient master index...
              </div>
            ) : searchResults.length > 0 ? (
              searchResults.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleSelectPatient(p.id)}
                  className="w-full text-left p-3 hover:bg-sky-50 transition-colors flex items-center justify-between group"
                >
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                      <span>{p.first_name} {p.last_name}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                        {p.mrn}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-2">
                      <span>Age: {p.age}</span>
                      <span>•</span>
                      <span>Ward: {p.current_ward || 'Inpatient'}</span>
                      <span>•</span>
                      <span className="truncate max-w-[180px]">{p.primary_diagnosis}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        p.risk_level === 'Critical'
                          ? 'bg-rose-100 text-rose-700'
                          : p.risk_level === 'High'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {Math.round((p.risk_probability || 0) * 100)}% {p.risk_level}
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-sky-600 transition-colors" />
                  </div>
                </button>
              ))
            ) : (
              <div className="p-4 text-center text-xs text-slate-500">
                No matching patient records found for "{searchQuery}".
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Utility Bar */}
      <div className="flex items-center gap-3">
        {/* Live Clinical Clock */}
        <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 px-2.5 py-1.5 rounded border border-slate-200">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-mono text-[11px]">
            {currentTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} • {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        {/* System Node Status Badge */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
          <span>CDS Node Online</span>
        </div>

        {/* Alerts Button */}
        <button
          onClick={() => navigate('/high-risk')}
          className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
          title="Clinical Safety Queue"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white"></span>
        </button>

        {/* Logged in Clinician Badge */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-sky-100 text-sky-800 flex items-center justify-center font-bold text-xs">
            <Stethoscope className="w-4 h-4" />
          </div>
          <div className="hidden sm:block text-left text-xs">
            <div className="font-bold text-slate-900 leading-tight">
              {user?.full_name || 'Dr. Sarah Mitchell'}
            </div>
            <div className="text-[10px] text-slate-500 capitalize">
              {user?.role || 'Physician'}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
