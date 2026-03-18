export interface Location {
  lat: number;
  lng: number;
  address?: string;
}

export interface Reporter {
  name: string;
  contact: string;
  email?: string;
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
  _id: string;
  incident_id: string;
  type: IncidentType;
  severity: IncidentSeverity;
  location: Location;
  description: string;
  reporter: Reporter;
  status: IncidentStatus;
  priority_score: number;
  assigned_resource?: Resource;
  escalation_level: number;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  closed_at?: string;
}

export enum ResourceType {
  AMBULANCE = 'ambulance',
  FIRE_TRUCK = 'fire_truck',
  SECURITY = 'security',
  MAINTENANCE = 'maintenance',
  POLICE = 'police',
}

export enum ResourceStatus {
  AVAILABLE = 'available',
  DISPATCHED = 'dispatched',
  BUSY = 'busy',
  OFFLINE = 'offline',
}

export interface Resource {
  _id: string;
  unit_id: string;
  type: ResourceType;
  status: ResourceStatus;
  location: {
    lat: number;
    lng: number;
  };
  capacity: {
    current: number;
    max: number;
  };
  assigned_to?: Incident;
  skills?: string[];
  crew_size?: number;
  equipment?: string[];
  contact?: string;
  last_updated: string;
}

export enum AssignmentStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  IN_PROGRESS = 'in-progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  REJECTED = 'rejected',
}

export interface Assignment {
  _id: string;
  incident_id: Incident;
  resource_id: Resource;
  assigned_at: string;
  accepted_at?: string;
  started_at?: string;
  completed_at?: string;
  status: AssignmentStatus;
  distance: number;
  eta: number;
  actual_response_time?: number;
  score: number;
}

export interface Statistics {
  total: number;
  byStatus: Record<string, number>;
  byType?: Record<string, number>;
  bySeverity?: Record<string, number>;
  averageResponseTime?: number;
  utilization?: number;
}
