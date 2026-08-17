import { apiClient } from './api';
import { ApiResponse, Patient, PatientCreatePayload, ChatMessage, ChatResponse, ReportSummaryResponse, DatasetQueryResult } from '../types/clinical';

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


  searchPatients: async (query: string): Promise<Patient[]> => {
    const response = await apiClient.get<ApiResponse<Patient[]>>('/patients/search', {
      params: { q: query },
    });
    return response.data.data;
  },

  getHighRiskPatients: async (filterType?: string): Promise<Patient[]> => {
    const params: Record<string, string> = {};
    if (filterType) params.filter_type = filterType;
    const response = await apiClient.get<ApiResponse<Patient[]>>('/patients/high-risk', { params });
    return response.data.data;
  },

  getPatientById: async (patientId: number): Promise<Patient> => {
    const response = await apiClient.get<ApiResponse<Patient>>(`/patients/${patientId}`);
    return response.data.data;
  },

  createPatient: async (payload: PatientCreatePayload): Promise<Patient> => {
    const response = await apiClient.post<ApiResponse<Patient>>('/patients', payload);
    return response.data.data;
  },

  chatWithPatient: async (patientId: number, message: string, history: ChatMessage[] = []): Promise<ChatResponse> => {
    const response = await apiClient.post<ApiResponse<ChatResponse>>(`/patients/${patientId}/chat`, {
      message,
      history,
    });
    return response.data.data;
  },

  getPatientReport: async (patientId: number): Promise<ReportSummaryResponse> => {
    const response = await apiClient.get<ApiResponse<ReportSummaryResponse>>(`/patients/${patientId}/report`);
    return response.data.data;
  },

  getReportPdfUrl: (patientId: number, reportType: string = 'discharge'): string => {
    return `/api/patients/${patientId}/report/pdf?report_type=${reportType}`;
  },

  downloadReportPdf: async (patientId: number, mrn?: string, reportType: string = 'discharge'): Promise<void> => {
    const url = `/api/patients/${patientId}/report/pdf?report_type=${reportType}`;
    const prefix = reportType === 'discharge' ? 'Discharge_Summary' : 'Clinical_Report';
    const mrnClean = (mrn || `P${patientId}`).replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${prefix}_${mrnClean}.pdf`;

    // Native HTTP link download - avoids synthetic blob UUID caching in Chrome
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
    }, 2000);
  },
};



