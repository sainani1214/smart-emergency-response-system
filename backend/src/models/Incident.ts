import mongoose, { Schema, Document } from 'mongoose';

export enum IncidentType {
  MEDICAL = 'medical',
  FIRE = 'fire',
  SECURITY = 'security',
  WATER = 'water',
  POWER = 'power'
}

export enum IncidentSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum IncidentStatus {
  OPEN = 'open',
  ASSIGNED = 'assigned',
  IN_PROGRESS = 'in-progress',
  RESOLVED = 'resolved',
  CLOSED = 'closed'
}

export interface ILocation {
  lat: number;
  lng: number;
  address?: string;
}

export interface IReporter {
  name: string;
  contact: string;
  email?: string;
  user_id?: string;
}

export interface IIncident extends Document {
  incident_id: string;
  type: IncidentType;
  severity: IncidentSeverity;
  location: ILocation;
  description: string;
  reporter: IReporter;
  status: IncidentStatus;
  priority_score: number;
  assigned_resource?: mongoose.Types.ObjectId;
  escalation_level: number;
  created_at: Date;
  updated_at: Date;
  resolved_at?: Date;
  closed_at?: Date;
  metadata?: Record<string, any>;
}

const IncidentSchema: Schema = new Schema({
  incident_id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  type: {
    type: String,
    enum: Object.values(IncidentType),
    required: true,
    index: true
  },
  severity: {
    type: String,
    enum: Object.values(IncidentSeverity),
    required: true,
    index: true
  },
  location: {
    type: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
      address: { type: String }
    },
    required: true,
    index: '2dsphere' // Geospatial index for location queries
  },
  description: {
    type: String,
    required: true
  },
  reporter: {
    name: { type: String, required: true },
    contact: { type: String, required: true },
    email: { type: String },
    user_id: { type: String, index: true }
  },
  status: {
    type: String,
    enum: Object.values(IncidentStatus),
    default: IncidentStatus.OPEN,
    index: true
  },
  priority_score: {
    type: Number,
    default: 0,
    index: true
  },
  assigned_resource: {
    type: Schema.Types.ObjectId,
    ref: 'Resource',
    index: true
  },
  escalation_level: {
    type: Number,
    default: 0,
    index: true
  },
  created_at: {
    type: Date,
    default: Date.now,
    index: true
  },
  updated_at: {
    type: Date,
    default: Date.now
  },
  resolved_at: {
    type: Date
  },
  closed_at: {
    type: Date
  },
  metadata: {
    type: Schema.Types.Mixed
  }
});

// Compound indexes for common queries
IncidentSchema.index({ status: 1, priority_score: -1 });
IncidentSchema.index({ status: 1, created_at: -1 });
IncidentSchema.index({ type: 1, status: 1 });
IncidentSchema.index({ 'reporter.user_id': 1, created_at: -1 });

// Update updated_at before save
IncidentSchema.pre('save', function(this: IIncident) {
  this.updated_at = new Date();
});

// Virtual for response time calculation
IncidentSchema.virtual('response_time').get(function(this: IIncident) {
  if (this.resolved_at) {
    return this.resolved_at.getTime() - this.created_at.getTime();
  }
  return null;
});

export default mongoose.model<IIncident>('Incident', IncidentSchema);
