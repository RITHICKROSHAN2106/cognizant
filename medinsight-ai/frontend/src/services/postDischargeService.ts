import { apiClient } from './api';
import {
  PostDischargeCarePlan,
  PostDischargePatientSummary,
  FollowUpVisit,
  MedicationSupplyItem,
  NutritionPlan,
  RehabilitationPlan,
  PatientCoverage,
  ReadmissionEvent
} from '../types/postDischarge';

export const postDischargeService = {
  getPostDischargePatients: async (filterStatus?: string, search?: string): Promise<PostDischargePatientSummary[]> => {
    const params: any = {};
    if (filterStatus) params.filter_status = filterStatus;
    if (search) params.search = search;
    const response = await apiClient.get('/post-discharge/patients', { params });
    return response.data.data;
  },

  getPostDischargeCounts: async (): Promise<Record<string, number>> => {
    const response = await apiClient.get('/post-discharge/counts');
    return response.data.data;
  },

  getPatientPostDischargePlan: async (patientId: number): Promise<PostDischargeCarePlan> => {
    const response = await apiClient.get(`/patients/${patientId}/post-discharge`);
    return response.data.data;
  },

  updatePostDischargePlan: async (patientId: number, update: Partial<PostDischargeCarePlan>): Promise<PostDischargeCarePlan> => {
    const response = await apiClient.post(`/patients/${patientId}/post-discharge`, update);
    return response.data.data;
  },

  getFollowUps: async (patientId: number): Promise<FollowUpVisit[]> => {
    const response = await apiClient.get(`/patients/${patientId}/follow-ups`);
    return response.data.data;
  },

  updateFollowUp: async (visitId: number, update: Partial<FollowUpVisit>): Promise<any> => {
    const response = await apiClient.patch(`/follow-ups/${visitId}`, update);
    return response.data.data;
  },

  getMedicationSupply: async (patientId: number): Promise<MedicationSupplyItem[]> => {
    const response = await apiClient.get(`/patients/${patientId}/medication-supply`);
    return response.data.data;
  },

  getNutritionPlan: async (patientId: number): Promise<NutritionPlan> => {
    const response = await apiClient.get(`/patients/${patientId}/nutrition-plan`);
    return response.data.data;
  },

  getRehabilitation: async (patientId: number): Promise<RehabilitationPlan> => {
    const response = await apiClient.get(`/patients/${patientId}/rehabilitation`);
    return response.data.data;
  },

  getCoverage: async (patientId: number): Promise<PatientCoverage> => {
    const response = await apiClient.get(`/patients/${patientId}/coverage`);
    return response.data.data;
  },

  createReadmissionEncounter: async (patientId: number, encounterData: any): Promise<any> => {
    const response = await apiClient.post(`/patients/${patientId}/encounters`, encounterData);
    return response.data.data;
  },

  getReadmissions: async (patientId: number): Promise<ReadmissionEvent[]> => {
    const response = await apiClient.get(`/patients/${patientId}/readmissions`);
    return response.data.data;
  }
};
