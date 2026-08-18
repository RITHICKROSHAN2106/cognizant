import { apiClient } from './api';
import { ApiResponse, Patient, PatientCreatePayload, ChatMessage, ChatResponse, ReportSummaryResponse, DatasetQueryResult } from '../types/clinical';
import { downloadBlob, getDownloadFilename } from '../utils/downloadFile';

export const patientService = {
  queryDatasetPatients: async (params: {
    search?: string;
    risk_level?: string;
    readmission_status?: string;
    age_group?: string;
    race?: string;
    page?: number;
    page_size?: number;
    sort_by?: string;
    sort_desc?: boolean;
  }): Promise<DatasetQueryResult> => {
    const response = await apiClient.get<ApiResponse<DatasetQueryResult>>('/patients/dataset', { params });
    return response.data.data;
  },

  getPatients: async (riskLevel?: string, ward?: string, search?: string): Promise<Patient[]> => {
    const params: Record<string, string> = {};
    if (riskLevel) params.risk_level = riskLevel;
    if (ward) params.ward = ward;
    if (search) params.search = search;
    const response = await apiClient.get<ApiResponse<Patient[]>>('/patients', { params });
    return response.data.data;
  },


  getHighRiskPatients: async (filterType?: string): Promise<Patient[]> => {
    const params: Record<string, string> = {};
    if (filterType) params.filter_type = filterType;
    const response = await apiClient.get<ApiResponse<Patient[]>>('/patients/high-risk', { params });
    return response.data.data;
  },

  chatWithPatient: async (patientId: number, message: string, history: ChatMessage[] = []): Promise<ChatResponse> => {
    const response = await apiClient.post<ApiResponse<ChatResponse>>(`/patients/${patientId}/chat`, {
      message,
      history,
    });
    return response.data.data;
  },

  searchPatients: async (query: string): Promise<Patient[]> => {
    const response = await apiClient.get<ApiResponse<Patient[]>>('/patients/search', { params: { q: query } });
    return response.data.data;
  },

  getPatientById: async (id: number): Promise<Patient> => {
    const response = await apiClient.get<ApiResponse<Patient>>(`/patients/${id}`);
    return response.data.data;
  },

  createPatient: async (payload: PatientCreatePayload): Promise<Patient> => {
    const response = await apiClient.post<ApiResponse<Patient>>('/patients', payload);
    return response.data.data;
  },

  getPatientChatHistory: async (patientId: number): Promise<ChatMessage[]> => {
    const response = await apiClient.get<ApiResponse<ChatMessage[]>>(`/patients/${patientId}/chat`);
    return response.data.data;
  },

  sendPatientChatMessage: async (patientId: number, message: string): Promise<ChatResponse> => {
    const response = await apiClient.post<ApiResponse<ChatResponse>>(`/patients/${patientId}/chat`, { message });
    return response.data.data;
  },

  clearPatientChatHistory: async (patientId: number): Promise<void> => {
    await apiClient.delete(`/patients/${patientId}/chat`);
  },

  getPatientReport: async (patientId: number): Promise<ReportSummaryResponse> => {
    const response = await apiClient.get<ApiResponse<ReportSummaryResponse>>(`/patients/${patientId}/report`);
    return response.data.data;
  },

  getReportPdfUrl: (patientId: number, reportType: string = 'discharge'): string => {
    return `/api/patients/${patientId}/report/pdf?report_type=${reportType}`;
  },

  downloadReportPdf: async (patientId: number, mrn?: string, reportType: string = 'discharge'): Promise<void> => {
    const today = new Date().toISOString().split('T')[0];
    const prefix = reportType === 'discharge' ? 'Discharge_Summary' : 'Clinical_Report';
    const mrnClean = (mrn || `P${patientId}`).replace(/[^a-zA-Z0-9_-]/g, '_');
    const fallbackFilename = `${mrnClean}_${prefix}_${today}.pdf`;

    const response = await apiClient.get(`/patients/${patientId}/report/pdf`, {
      params: { report_type: reportType },
      responseType: 'blob',
    });

    const disposition = response.headers?.['content-disposition'] || response.headers?.['Content-Disposition'];
    const filename = getDownloadFilename(disposition, fallbackFilename);

    downloadBlob(response.data, 'application/pdf', filename);
  },

  downloadReportCsv: async (patientId: number, mrn?: string, reportType: string = 'discharge'): Promise<void> => {
    const today = new Date().toISOString().split('T')[0];
    const prefix = reportType === 'discharge' ? 'Discharge_Summary' : 'Clinical_Report';
    const mrnClean = (mrn || `P${patientId}`).replace(/[^a-zA-Z0-9_-]/g, '_');
    const fallbackFilename = `${mrnClean}_${prefix}_${today}.csv`;

    const response = await apiClient.get(`/patients/${patientId}/report/csv`, {
      params: { report_type: reportType },
      responseType: 'blob',
    });

    const disposition = response.headers?.['content-disposition'] || response.headers?.['Content-Disposition'];
    const filename = getDownloadFilename(disposition, fallbackFilename);

    downloadBlob(response.data, 'text/csv;charset=utf-8', filename);
  },

  downloadCohortCsv: async (params?: { search?: string; risk_level?: string; readmission_status?: string }): Promise<void> => {
    const today = new Date().toISOString().split('T')[0];
    const fallbackFilename = `MedInsight_Patient_Risk_Cohort_Registry_${today}.csv`;
    const queryParams: Record<string, any> = {};
    if (params?.search) queryParams.search = params.search;
    if (params?.risk_level && params.risk_level !== 'All') queryParams.risk_level = params.risk_level;
    if (params?.readmission_status && params.readmission_status !== 'All') queryParams.readmission_status = params.readmission_status;

    const response = await apiClient.get('/reports/cohort/csv', {
      params: queryParams,
      responseType: 'blob',
    });

    const disposition = response.headers?.['content-disposition'] || response.headers?.['Content-Disposition'];
    const filename = getDownloadFilename(disposition, fallbackFilename);

    downloadBlob(response.data, 'text/csv;charset=utf-8', filename);
  },

  downloadCohortPdf: async (params?: { search?: string; risk_level?: string; limit?: number }): Promise<void> => {
    const today = new Date().toISOString().split('T')[0];
    const fallbackFilename = `MedInsight_Patient_Risk_Cohort_Report_${today}.pdf`;
    const queryParams: Record<string, any> = { limit: params?.limit || 150 };
    if (params?.search) queryParams.search = params.search;
    if (params?.risk_level && params.risk_level !== 'All') queryParams.risk_level = params.risk_level;

    const response = await apiClient.get('/reports/cohort/pdf', {
      params: queryParams,
      responseType: 'blob',
    });

    const disposition = response.headers?.['content-disposition'] || response.headers?.['Content-Disposition'];
    const filename = getDownloadFilename(disposition, fallbackFilename);

    downloadBlob(response.data, 'application/pdf', filename);
  },
};
