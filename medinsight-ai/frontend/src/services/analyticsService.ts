import { apiClient } from './api';
import { ApiResponse, AnalyticsSummary, SystemHealth, IntegrationItem } from '../types/clinical';

export const analyticsService = {
  getReadmissionAnalytics: async (): Promise<AnalyticsSummary> => {
    const response = await apiClient.get<ApiResponse<AnalyticsSummary>>('/analytics/readmissions');
    return response.data.data;
  },
  getModelMetrics: async (): Promise<any> => {
    const response = await apiClient.get<ApiResponse<any>>('/model/metrics');
    return response.data.data;
  }
};

export const systemService = {
  getSystemHealth: async (): Promise<SystemHealth> => {
    const response = await apiClient.get<ApiResponse<SystemHealth>>('/system/health');
    return response.data.data;
  },

  getIntegrations: async (): Promise<IntegrationItem[]> => {
    const response = await apiClient.get<ApiResponse<IntegrationItem[]>>('/system/integrations');
    return response.data.data;
  },
};
