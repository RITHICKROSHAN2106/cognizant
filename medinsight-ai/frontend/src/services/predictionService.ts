import { apiClient } from './api';
import {
  ApiResponse, PredictionInput, PredictionResult,
  ExplanationResult, SimulationInput, SimulationResult
} from '../types/clinical';

export const predictionService = {
  predictReadmission: async (inputData: PredictionInput): Promise<PredictionResult> => {
    const response = await apiClient.post<ApiResponse<PredictionResult>>('/predict/readmission', inputData);
    return response.data.data;
  },

  getPatientRisk: async (patientId: number): Promise<{
    patient_id: number;
    latest_prediction: PredictionResult | null;
    prediction_history: Array<any>;
  }> => {
    const response = await apiClient.get<ApiResponse<{
      patient_id: number;
      latest_prediction: PredictionResult | null;
      prediction_history: Array<any>;
    }>>(`/patients/${patientId}/readmission-risk`);
    return response.data.data;
  },

  getExplanation: async (patientId: number): Promise<ExplanationResult> => {
    const response = await apiClient.get<ApiResponse<ExplanationResult>>(`/patients/${patientId}/explanation`);
    return response.data.data;
  },

  simulateRisk: async (patientId: number, simulation: SimulationInput): Promise<SimulationResult> => {
    const response = await apiClient.post<ApiResponse<SimulationResult>>(
      `/patients/${patientId}/simulate-risk`,
      simulation
    );
    return response.data.data;
  },
};
