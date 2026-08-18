import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ClinicalCopilotWorkspace } from '../copilot/ClinicalCopilotWorkspace';
import { useCopilot } from '../../contexts/CopilotContext';

export const AppLayout: React.FC = () => {
  const { isOpen: isCopilotOpen } = useCopilot();

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100 font-sans antialiased text-slate-900">
      <Sidebar />
      <div className={`flex flex-col flex-1 min-w-0 h-screen overflow-hidden transition-all duration-300 ${
        isCopilotOpen ? 'sm:mr-[420px]' : ''
      }`}>
        <Header />
        <main className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <div className="max-w-7xl mx-auto space-y-6">
            <Outlet />
          </div>
        </main>
      </div>
      <ClinicalCopilotWorkspace />
    </div>
  );
};

