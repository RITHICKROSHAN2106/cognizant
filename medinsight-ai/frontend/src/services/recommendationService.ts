import { apiClient } from './api';
import { ApiResponse, Recommendation, DischargePlan } from '../types/clinical';

export const recommendationService = {
  getRecommendations: async (patientId: number): Promise<Recommendation[]> => {
    const response = await apiClient.get<ApiResponse<Recommendation[]>>(`/patients/${patientId}/recommendations`);
    return response.data.data;
  },

  addRecommendation: async (patientId: number, data: {
    title: string;
    priority: string;
    reason: string;
    responsible_team?: string;
    due_date?: string;
  }): Promise<Recommendation> => {
    const response = await apiClient.post<ApiResponse<Recommendation>>(
      `/patients/${patientId}/recommendations`,
      data
    );
    return response.data.data;
  },

  toggleRecommendation: async (recId: number): Promise<Recommendation> => {
    const response = await apiClient.patch<ApiResponse<Recommendation>>(
      `/recommendations/${recId}/toggle`
    );
    return response.data.data;
  },

  getDischargePlan: async (patientId: number): Promise<DischargePlan> => {
    const response = await apiClient.get<ApiResponse<DischargePlan>>(`/patients/${patientId}/discharge-plan`);
    return response.data.data;
  },

  updateDischargePlan: async (patientId: number, updates: Partial<DischargePlan>): Promise<DischargePlan> => {
    const response = await apiClient.put<ApiResponse<DischargePlan>>(
      `/patients/${patientId}/discharge-plan`,
      updates
    );
    return response.data.data;
  },
};
