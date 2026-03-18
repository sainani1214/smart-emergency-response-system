import axios from 'axios';
import { API_BASE_URL } from '../constants/theme';
import { Incident, Resource, Assignment, Statistics } from '../types';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Incidents API
export const incidentsAPI = {
  getAll: async (params?: { status?: string; type?: string; limit?: number }) => {
    const response = await api.get<{ incidents: Incident[]; total: number }>('/incidents', { params });
    return response.data;
  },

  getActive: async () => {
    const response = await api.get<Incident[]>('/incidents/active');
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get<Incident>(`/incidents/${id}`);
    return response.data;
  },

  create: async (data: Partial<Incident>) => {
    const response = await api.post<Incident>('/incidents', data);
    return response.data;
  },

  updateStatus: async (id: string, status: string) => {
    const response = await api.patch<Incident>(`/incidents/${id}/status`, { status });
    return response.data;
  },

  getStatistics: async () => {
    const response = await api.get<Statistics>('/incidents/stats/summary');
    return response.data;
  },
};

// Resources API
export const resourcesAPI = {
  getAll: async (params?: { status?: string; type?: string; available?: boolean }) => {
    const response = await api.get<Resource[]>('/resources', { params });
    return response.data;
  },

  getById: async (unitId: string) => {
    const response = await api.get<Resource>(`/resources/${unitId}`);
    return response.data;
  },

  create: async (data: Partial<Resource>) => {
    const response = await api.post<Resource>('/resources', data);
    return response.data;
  },

  updateStatus: async (unitId: string, status: string) => {
    const response = await api.patch<Resource>(`/resources/${unitId}/status`, { status });
    return response.data;
  },

  updateLocation: async (unitId: string, location: { lat: number; lng: number }) => {
    const response = await api.patch<Resource>(`/resources/${unitId}/location`, location);
    return response.data;
  },

  getStatistics: async () => {
    const response = await api.get<Statistics>('/resources/stats/summary');
    return response.data;
  },
};

// Assignments API
export const assignmentsAPI = {
  getAll: async () => {
    const response = await api.get<Assignment[]>('/assignments');
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get<Assignment>(`/assignments/${id}`);
    return response.data;
  },

  triggerSmartAssignment: async (incidentId: string) => {
    const response = await api.post<Assignment>('/assignments/match', { incidentId });
    return response.data;
  },

  updateStatus: async (id: string, status: string) => {
    const response = await api.patch<Assignment>(`/assignments/${id}/status`, { status });
    return response.data;
  },

  getStatistics: async () => {
    const response = await api.get<Statistics>('/assignments/stats/summary');
    return response.data;
  },
};

export default api;
