import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CopilotProvider } from './contexts/CopilotContext';
import { AppLayout } from './components/layout/AppLayout';
import { ClinicalOverviewPage } from './pages/ClinicalOverviewPage';
import { PatientsPage } from './pages/PatientsPage';
import { AddPatientPage } from './pages/AddPatientPage';
import { HighRiskCommandCenterPage } from './pages/HighRiskCommandCenterPage';
import { PatientEhrPage } from './pages/PatientEhrPage';
import { RiskAssessmentPage } from './pages/RiskAssessmentPage';
import { ReportsPage } from './pages/ReportsPage';
import { AiChatPage } from './pages/AiChatPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { ApiDataSourcesPage } from './pages/ApiDataSourcesPage';
import { SystemHealthPage } from './pages/SystemHealthPage';
import { PostDischargePage } from './pages/PostDischargePage';
import { AdministrationPage } from './pages/AdministrationPage';
import { LoginPage } from './pages/LoginPage';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-900 text-white text-xs font-semibold">
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></span>
          Authenticating clinical workforce session...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const PermissionRoute: React.FC<{
  children: React.ReactNode;
  requiredPermission?: string;
  requiredRoles?: string[];
}> = ({ children, requiredPermission, requiredRoles }) => {
  const { user, hasPermission, hasRole } = useAuth();

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <UnauthorizedScreen requiredPermission={requiredPermission} role={user?.role} />;
  }

  if (requiredRoles && !requiredRoles.some(r => hasRole(r))) {
    return <UnauthorizedScreen requiredPermission={requiredRoles.join(', ')} role={user?.role} />;
  }

  return <>{children}</>;
};

const UnauthorizedScreen: React.FC<{ requiredPermission?: string; role?: string }> = ({ requiredPermission, role }) => {
  return (
    <div className="p-8 max-w-lg mx-auto text-center space-y-4 my-12 bg-white rounded-2xl border border-red-200 shadow-sm">
      <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto border border-red-200">
        <ShieldAlert className="w-6 h-6" />
      </div>
      <div>
        <h2 className="text-lg font-extrabold text-slate-900">403 — Access Restricted</h2>
        <p className="text-xs text-slate-500 mt-1">
          Your active workforce role (<span className="font-bold text-slate-800 uppercase">{role?.replace('_', ' ')}</span>) lacks the required permission: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-sky-800 font-mono text-[11px]">{requiredPermission}</code>.
        </p>
      </div>
      <div className="pt-2">
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Return to Clinical Overview
        </Link>
      </div>
    </div>
  );
};

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CopilotProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />

              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<ClinicalOverviewPage />} />
                <Route path="patients" element={<PatientsPage />} />
                <Route
                  path="patients/new"
                  element={
                    <PermissionRoute requiredPermission="patient:create">
                      <AddPatientPage />
                    </PermissionRoute>
                  }
                />
                <Route
                  path="add-patient"
                  element={
                    <PermissionRoute requiredPermission="patient:create">
                      <AddPatientPage />
                    </PermissionRoute>
                  }
                />
                <Route path="post-discharge" element={<PostDischargePage />} />
                <Route path="patients/:id" element={<PatientEhrPage />} />
                <Route path="patients/:patientId/encounters/:encounterId/risk" element={<RiskAssessmentPage />} />
                <Route path="risk" element={<RiskAssessmentPage />} />
                <Route path="high-risk" element={<HighRiskCommandCenterPage />} />
                <Route path="ehr/:id" element={<PatientEhrPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="chat" element={<AiChatPage />} />
                <Route path="analytics" element={<AnalyticsPage />} />
                <Route path="integrations" element={<ApiDataSourcesPage />} />
                <Route
                  path="admin"
                  element={
                    <PermissionRoute requiredPermission="users:view">
                      <AdministrationPage />
                    </PermissionRoute>
                  }
                />
                <Route path="system-health" element={<SystemHealthPage />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </CopilotProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
