export type ResponderAssignmentStatus = 'assigned' | 'en-route' | 'on-scene' | 'completed';

export interface Incident {
  incident_id: string;
  type: 'medical' | 'fire' | 'security' | 'water' | 'power';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  status: 'open' | 'assigned' | 'in-progress' | 'resolved' | 'closed';
  created_at: string;
  location: {
    lat: number;
    lng: number;
    address?: string;
  };
  reporter: {
    name: string;
    contact: string;
    email?: string;
  };
}

export interface Assignment {
  _id?: string;
  assignment_id?: string;
  incident_id: string | Incident;
  resource_id: string;
  status: ResponderAssignmentStatus | 'pending' | 'accepted' | 'in-progress' | 'completed' | 'cancelled' | 'rejected';
  assigned_at?: string;
  distance?: number;
  eta?: number;
  score?: number;
}