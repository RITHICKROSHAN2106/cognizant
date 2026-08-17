import { apiClient } from './api';
import { ApiResponse, SystemHealth, IntegrationItem } from '../types/clinical';

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
