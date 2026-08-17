import { apiClient } from './api';
import { ApiResponse, User } from '../types/clinical';

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export const authService = {
  login: async (username: string, password: string): Promise<LoginResponse> => {
    const response = await apiClient.post<ApiResponse<LoginResponse>>('/auth/login', {
      username,
      password,
    });
    const { data } = response.data;
    if (data?.access_token) {
      localStorage.setItem('medinsight_token', data.access_token);
      localStorage.setItem('medinsight_user', JSON.stringify(data.user));
    }
    return data;
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await apiClient.get<ApiResponse<User>>('/auth/me');
    return response.data.data;
  },

  logout: () => {
    localStorage.removeItem('medinsight_token');
    localStorage.removeItem('medinsight_user');
  },

  getStoredUser: (): User | null => {
    const stored = localStorage.getItem('medinsight_user');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        return null;
      }
    }
    return null;
  },

  getStoredToken: (): string | null => {
    return localStorage.getItem('medinsight_token');
  },
};
