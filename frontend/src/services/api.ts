import axios from 'axios';
import { API_BASE_URL } from '../constants/theme';
import {
  AuthResponse,
  EmergencySimulationResponse,
  EmergencySimulationStatus,
  Incident,
  IncidentWithAssignment,
  IncidentsListResponse,
} from '../types';
import { storage } from './storage';
import { tokenStore } from './tokenStore';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    try {
      let token: string | null = null;
      
      // Try AsyncStorage first
      try {
        if (storage.isAvailable()) {
          token = await storage.getItem('userToken');
        }
      } catch (storageError) {
        console.warn('[API] AsyncStorage read failed, trying memory store:', storageError);
      }
      
      // Fallback to memory store
      if (!token) {
        token = tokenStore.getToken();
      }

      if (token && typeof token === 'string' && token.trim()) {
        config.headers.Authorization = `Bearer ${token}`;
        console.log('[API] Token attached to request:', config.method?.toUpperCase(), config.url);
      } else {
        console.log('[API] No valid token found for:', config.method?.toUpperCase(), config.url);
      }
    } catch (error) {
      console.error('[API] Error attaching token:', error);
    }

    return config;
  },
  (error) => {
    console.error('[API] Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      console.log('[API] 401 Unauthorized - clearing session');
      // Clear both storage and memory
      if (storage.isAvailable()) {
        await storage.removeItem('userToken').catch(() => {});
        await storage.removeItem('userData').catch(() => {});
      }
      tokenStore.clear();
    }
    return Promise.reject(error);
  }
);

export const incidentsAPI = {
  list: async (): Promise<Incident[]> => {
    const response = await api.get<IncidentsListResponse>('/incidents');
    return response.data.incidents ?? [];
  },

  listMine: async (): Promise<IncidentWithAssignment[]> => {
    const response = await api.get<IncidentWithAssignment[]>('/incidents/my/all');
    return response.data;
  },

  listNearby: async (params: { lat: number; lng: number; radiusKm?: number }): Promise<IncidentWithAssignment[]> => {
    const response = await api.get<IncidentWithAssignment[]>('/incidents/nearby', { params });
    return response.data;
  },

  getById: async (id: string): Promise<IncidentWithAssignment> => {
    const response = await api.get<IncidentWithAssignment>(`/incidents/${id}`);
    return response.data;
  },

  getTracking: async (id: string): Promise<EmergencySimulationStatus> => {
    const response = await api.get<EmergencySimulationStatus>(`/incidents/${id}/tracking`);
    return response.data;
  },

  create: async (data: Partial<Incident>): Promise<Incident> => {
    const response = await api.post<Incident>('/incidents', data);
    return response.data;
  },

  updateStatus: async (id: string, status: Incident['status']): Promise<Incident> => {
    const response = await api.patch<Incident>(`/incidents/${id}/status`, { status });
    return response.data;
  },
};

export const simulationAPI = {
  createEmergency: async (payload: {
    userLocation: {
      lat: number;
      lng: number;
      address: string;
    };
    emergencyType: string;
    severity: string;
  }): Promise<EmergencySimulationResponse> => {
    const response = await api.post<EmergencySimulationResponse>('/simulate/emergency', payload);
    return response.data;
  },

  getStatus: async (simulationId: string): Promise<EmergencySimulationStatus> => {
    const response = await api.get<EmergencySimulationStatus>(`/simulate/status/${simulationId}`);
    return response.data;
  },
};

export const authAPI = {
  login: async (payload: {
    email: string;
    password: string;
    role: 'user' | 'responder';
  }): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/login', payload);
    return response.data;
  },

  registerUser: async (payload: {
    name: string;
    email: string;
    phone: string;
    password: string;
    city: string;
    state: string;
  }): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/register/user', payload);
    return response.data;
  },
};

export default api;
