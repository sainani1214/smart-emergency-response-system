import { FastifyRequest } from 'fastify';

export interface CreateEmergencySimulationBody {
  userLocation: {
    lat: number;
    lng: number;
  };
  emergencyType?: 'medical' | 'fire' | 'security' | 'water' | 'power';
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

export interface GetEmergencyStatusParams {
  emergencyId: string;
}

export interface ResponderLocation {
  lat: number;
  lng: number;
  address?: string;
}

export interface MockResponder {
  id: string;
  name: string;
  type: 'ambulance' | 'fire_truck' | 'police_vehicle' | 'security_unit';
  location: ResponderLocation;
  status: 'available' | 'busy' | 'responding' | 'offline';
  skills: string[];
  responseTimeEstimate: number; // in minutes
}

export interface EmergencySimulation {
  emergencyId: string;
  userLocation: ResponderLocation;
  emergencyType: string;
  severity: string;
  status: 'pending' | 'notifying' | 'assigned' | 'responding' | 'completed' | 'cancelled' | 'timeout';
  createdAt: Date;
  nearestResponders: MockResponder[];
  assignedResponder?: MockResponder;
  responseHistory: ResponseEvent[];
  timeoutId?: NodeJS.Timeout;
  trackingUpdates: LocationUpdate[];
}

export interface ResponseEvent {
  responderId: string;
  response: 'accept' | 'reject' | 'timeout';
  timestamp: Date;
  delay: number; // delay in seconds before response
}

export interface LocationUpdate {
  responderId: string;
  location: ResponderLocation;
  timestamp: Date;
  distanceToUser: number; // in kilometers
  estimatedArrival: number; // in minutes
}

export interface SimulationResponse {
  success: boolean;
  emergencyId: string;
  message: string;
  userLocation: ResponderLocation;
  nearestResponders: MockResponder[];
}

export interface ResponderStatusResponse {
  success: boolean;
  responders: MockResponder[];
  total: number;
}

// Fastify request types
export type CreateEmergencySimulationRequest = FastifyRequest<{ Body: CreateEmergencySimulationBody }>;
export type GetEmergencyStatusRequest = FastifyRequest<{ Params: GetEmergencyStatusParams }>;