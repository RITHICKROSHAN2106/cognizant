import React, { useState } from 'react';
import { FileText, User, Calendar, Tag, Search } from 'lucide-react';
import { ClinicalNote } from '../../types/clinical';

interface NotesTabProps {
  notes: ClinicalNote[];
}

export const NotesTab: React.FC<NotesTabProps> = ({ notes }) => {
  const [selectedType, setSelectedType] = useState<string>('All');
  const [search, setSearch] = useState('');

  const types = ['All', 'Physician Progress Note', 'Specialist Consultation', 'Medication Review', 'Case Management'];

  const filteredNotes = notes.filter((n) => {
    const matchesType = selectedType === 'All' || n.note_type === selectedType;
    const matchesSearch =
      n.content.toLowerCase().includes(search.toLowerCase()) ||
      n.author.toLowerCase().includes(search.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">Multidisciplinary Clinical Notes</h2>
          <p className="text-xs text-slate-500">
            Attending physician progress notes, specialist consultations, and discharge assessments.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="text-xs bg-white border border-slate-300 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-sky-500 text-slate-700"
          >
            {types.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-4">
        {filteredNotes.map((n) => (
          <div key={n.id} className="clinical-card p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-100 text-sky-800 border border-sky-200">
                  {n.note_type}
                </span>
                <span className="text-xs font-bold text-slate-800">
                  {n.author} ({n.author_role})
                </span>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {new Date(n.created_at).toLocaleString()}
              </span>
            </div>

            <div className="text-xs text-slate-700 whitespace-pre-line leading-relaxed font-sans bg-slate-50/70 p-4 rounded-lg border border-slate-200/80 font-mono">
              {n.content}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
