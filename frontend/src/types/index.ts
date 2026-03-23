export interface Location {
  lat: number;
  lng: number;
  address?: string;
}

export interface Reporter {
  name: string;
  contact: string;
  email?: string;
  user_id?: string;
}

export interface AssignedResourceSummary {
  _id?: string;
  unit_id?: string;
  type?: string;
  status?: string;
  location?: Location;
}

export interface AcceptedResponderSummary {
  _id?: string;
  responder_id?: string;
  name?: string;
  email?: string;
  phone?: string;
  responder_type?: string;
}

export interface AssignmentSummary {
  _id?: string;
  status: string;
  eta?: number;
  distance?: number;
  score?: number;
  assigned_at?: string;
  accepted_at?: string;
  started_at?: string;
  completed_at?: string;
  accepted_by?: string;
  resource_id?: AssignedResourceSummary;
  responder_id?: AcceptedResponderSummary;
}

export enum IncidentType {
  MEDICAL = 'medical',
  FIRE = 'fire',
  SECURITY = 'security',
  WATER = 'water',
  POWER = 'power',
}

export enum IncidentSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum IncidentStatus {
  OPEN = 'open',
  ASSIGNED = 'assigned',
  IN_PROGRESS = 'in-progress',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

export interface Incident {
  _id?: string;
  incident_id: string;
  type: IncidentType;
  severity: IncidentSeverity;
  location: Location;
  description: string;
  reporter: Reporter;
  status: IncidentStatus;
  priority_score?: number;
  escalation_level?: number;
  assigned_resource?: AssignedResourceSummary;
  created_at: string;
  updated_at?: string;
  resolved_at?: string;
  closed_at?: string;
}

export interface IncidentWithAssignment {
  incident: Incident;
  latestAssignment: AssignmentSummary | null;
}

export interface IncidentsListResponse {
  incidents: Incident[];
  total: number;
}

export interface NearbyResponder {
  id: string;
  name: string;
  type: 'ambulance' | 'fire_truck' | 'police_vehicle' | 'security_unit';
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  status: 'available' | 'responding' | 'busy';
  skills: string[];
  responseTimeEstimate: number;
}

export interface TrackingUpdate {
  responderId: string;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  timestamp: string | Date;
  distanceToUser: number;
  estimatedArrival: number;
}

export interface EmergencySimulationResponse {
  success: boolean;
  emergencyId: string;
  message?: string;
  userLocation: {
    lat: number;
    lng: number;
    address: string;
  };
  nearestResponders: NearbyResponder[];
}

export interface EmergencySimulationStatus {
  success: boolean;
  emergencyId: string;
  userLocation: {
    lat: number;
    lng: number;
    address: string;
  };
  emergencyType: string;
  severity: string;
  status: 'notifying' | 'assigned' | 'responding' | 'completed' | 'timeout';
  createdAt: string;
  nearestResponders: NearbyResponder[];
  assignedResponder?: NearbyResponder;
  responseHistory: Array<{
    responderId: string;
    response: 'accept' | 'reject';
    timestamp: string;
    delay: number;
  }>;
  trackingUpdates: TrackingUpdate[];
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'responder';
}

export interface AuthSuccessResponse {
  success: true;
  data: {
    token: string;
    user: AuthUser;
  };
}

export interface AuthErrorResponse {
  success: false;
  error: string;
}

export type AuthResponse = AuthSuccessResponse | AuthErrorResponse;

export type NotificationTypeValue =
  | 'incident_created'
  | 'incident_assigned'
  | 'incident_escalated'
  | 'incident_resolved'
  | 'resource_assigned'
  | 'resource_status_changed'
  | 'alert'
  | 'system';

export type NotificationPriorityValue = 'low' | 'medium' | 'high' | 'urgent';

export type NotificationStatusValue = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface AppNotification {
  _id: string;
  type: NotificationTypeValue;
  recipient: string;
  channel: 'push' | 'sms' | 'email' | 'in_app';
  priority: NotificationPriorityValue;
  title: string;
  message: string;
  status: NotificationStatusValue;
  created_at: string;
  read_at?: string;
  related_incident?: string;
  related_resource?: string;
  data?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}
