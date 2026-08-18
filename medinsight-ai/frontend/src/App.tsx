import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
import { LoginPage } from './pages/LoginPage';

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
          Authenticating clinical session...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
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
                <Route path="patients/new" element={<AddPatientPage />} />
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
