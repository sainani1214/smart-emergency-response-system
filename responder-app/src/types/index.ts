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

export interface AppNotification {
  _id: string;
  type: 'incident_created' | 'incident_assigned' | 'incident_escalated' | 'incident_resolved' | 'resource_assigned' | 'resource_status_changed' | 'alert' | 'system';
  recipient: string;
  channel: 'push' | 'sms' | 'email' | 'in_app';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  message: string;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  created_at: string;
  read_at?: string;
  related_incident?: string;
  related_resource?: string;
  data?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}