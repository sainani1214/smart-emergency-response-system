import axios from 'axios';
import { API_BASE_URL } from '../constants/theme';
import { Assignment, Incident, ResponderAssignmentStatus } from '../types';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

type IncidentsResponse = { incidents?: Incident[]; total?: number } | Incident[];

export const incidentsAPI = {
  listOpen: async (): Promise<Incident[]> => {
    const response = await api.get<IncidentsResponse>('/incidents', {
      params: { status: 'open' }
    });

    return Array.isArray(response.data) ? response.data : response.data.incidents ?? [];
  },

  listNearbyEligibleResources: async (incidentType: Incident['type']) => {
    const response = await api.get(`/assignments/resources/eligible/${incidentType}`);
    return response.data;
  }
};

export const assignmentsAPI = {
  smartAssign: async (incidentId: string) => {
    const response = await api.post('/assignments/match', { incidentId });
    return response.data;
  },

  create: async (incidentId: string, resourceId: string, meta?: { distance?: number; eta?: number; score?: number }): Promise<Assignment> => {
    const response = await api.post<Assignment>('/assignments', {
      incidentId,
      resourceId,
      distance: meta?.distance,
      eta: meta?.eta,
      score: meta?.score
    });

    return response.data;
  },

  updateStatus: async (assignmentId: string, status: ResponderAssignmentStatus): Promise<Assignment> => {
    const mappedStatus =
      status === 'en-route'
        ? 'accepted'
        : status === 'on-scene'
          ? 'in-progress'
          : status;

    const response = await api.patch<Assignment>(`/assignments/${assignmentId}/status`, { status: mappedStatus });
    return response.data;
  },

  listByIncident: async (incidentId: string): Promise<Assignment[]> => {
    const response = await api.get<Assignment[]>('/assignments', {
      params: { incidentId }
    });
    return response.data;
  }
};

export default api;