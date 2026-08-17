import { apiClient } from './api';
import {
  ApiResponse, Encounter, Diagnosis, Observation,
  LabResult, Medication, Allergy, Procedure, ClinicalNote
} from '../types/clinical';

export const ehrService = {
  getEncounters: async (patientId: number): Promise<Encounter[]> => {
    const response = await apiClient.get<ApiResponse<Encounter[]>>(`/patients/${patientId}/encounters`);
    return response.data.data;
  },

  getDiagnoses: async (patientId: number): Promise<Diagnosis[]> => {
    const response = await apiClient.get<ApiResponse<Diagnosis[]>>(`/patients/${patientId}/diagnoses`);
    return response.data.data;
  },

  getLabs: async (patientId: number): Promise<LabResult[]> => {
    const response = await apiClient.get<ApiResponse<LabResult[]>>(`/patients/${patientId}/labs`);
    return response.data.data;
  },

  getMedications: async (patientId: number): Promise<Medication[]> => {
    const response = await apiClient.get<ApiResponse<Medication[]>>(`/patients/${patientId}/medications`);
    return response.data.data;
  },

  getAllergies: async (patientId: number): Promise<Allergy[]> => {
    const response = await apiClient.get<ApiResponse<Allergy[]>>(`/patients/${patientId}/allergies`);
    return response.data.data;
  },

  getVitals: async (patientId: number): Promise<Observation[]> => {
    const response = await apiClient.get<ApiResponse<Observation[]>>(`/patients/${patientId}/vitals`);
    return response.data.data;
  },

  getProcedures: async (patientId: number): Promise<Procedure[]> => {
    const response = await apiClient.get<ApiResponse<Procedure[]>>(`/patients/${patientId}/procedures`);
    return response.data.data;
  },

  getNotes: async (patientId: number): Promise<ClinicalNote[]> => {
    const response = await apiClient.get<ApiResponse<ClinicalNote[]>>(`/patients/${patientId}/notes`);
    return response.data.data;
  },
};
