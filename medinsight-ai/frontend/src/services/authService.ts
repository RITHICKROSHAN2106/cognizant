import { apiClient } from './api';
import {
  ApiResponse, User, StaffUserCreate, StaffUserUpdate,
  AuditLogEntry, SecurityStatus, RolePermissionMatrix
} from '../types/clinical';

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  session_id?: string;
  user: User;
}

export const authService = {
  login: async (username: string, password: string): Promise<LoginResponse> => {
    const response = await apiClient.post<ApiResponse<LoginResponse>>('/auth/login', {
      username: username.trim(),
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
    const user = response.data.data;
    if (user) {
      localStorage.setItem('medinsight_user', JSON.stringify(user));
    }
    return user;
  },

  logout: async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (e) {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem('medinsight_token');
      localStorage.removeItem('medinsight_user');
    }
  },

  logoutAll: async () => {
    try {
      await apiClient.post('/auth/logout-all');
    } catch (e) {
      // Ignore network errors
    } finally {
      localStorage.removeItem('medinsight_token');
      localStorage.removeItem('medinsight_user');
    }
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    const response = await apiClient.post<ApiResponse<{ status: string }>>('/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    });
    return response.data;
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

export const adminService = {
  getStaffUsers: async (params?: { role?: string; department?: string; search?: string; is_active?: boolean }) => {
    const response = await apiClient.get<ApiResponse<User[]>>('/admin/users', { params });
    return response.data.data;
  },

  createStaffUser: async (payload: StaffUserCreate) => {
    const response = await apiClient.post<ApiResponse<User>>('/admin/users', payload);
    return response.data.data;
  },

  updateStaffUser: async (userId: number, payload: StaffUserUpdate) => {
    const response = await apiClient.patch<ApiResponse<User>>(`/admin/users/${userId}`, payload);
    return response.data.data;
  },

  unlockStaffUser: async (userId: number) => {
    const response = await apiClient.post<ApiResponse<{ status: string }>>(`/admin/users/${userId}/unlock`);
    return response.data;
  },

  resetStaffPassword: async (userId: number, temporaryPassword: string, mustChangePassword = true) => {
    const response = await apiClient.post<ApiResponse<{ status: string }>>(`/admin/users/${userId}/reset-password`, {
      temporary_password: temporaryPassword,
      must_change_password: mustChangePassword,
    });
    return response.data;
  },

  getRolesMatrix: async () => {
    const response = await apiClient.get<ApiResponse<RolePermissionMatrix[]>>('/admin/roles');
    return response.data.data;
  },

  getAuditLogs: async (params?: { action?: string; username?: string; resource?: string; patient_id?: number; skip?: number; limit?: number }) => {
    const response = await apiClient.get<ApiResponse<AuditLogEntry[]>>('/admin/audit-logs', { params });
    return response.data.data;
  },

  getSecurityStatus: async () => {
    const response = await apiClient.get<ApiResponse<SecurityStatus>>('/admin/security-status');
    return response.data.data;
  },
};
