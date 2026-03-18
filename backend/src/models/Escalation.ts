import mongoose, { Schema, Document } from 'mongoose';

export enum EscalationType {
  TIME_BASED = 'time_based',
  SEVERITY_BASED = 'severity_based',
  CAPACITY_BASED = 'capacity_based',
  MANUAL = 'manual'
}

export enum EscalationStatus {
  PENDING = 'pending',
  NOTIFIED = 'notified',
  ACKNOWLEDGED = 'acknowledged',
  RESOLVED = 'resolved',
  CANCELLED = 'cancelled'
}

export interface IEscalationRule {
  condition: string;
  threshold: number;
  action: string;
}

export interface IEscalation extends Document {
  incident_id: mongoose.Types.ObjectId;
  type: EscalationType;
  from_level: number;
  to_level: number;
  reason: string;
  triggered_at: Date;
  acknowledged_at?: Date;
  resolved_at?: Date;
  status: EscalationStatus;
  notified_users: string[];
  rule?: IEscalationRule;
  metadata?: Record<string, any>;
}

const EscalationSchema: Schema = new Schema({
  incident_id: {
    type: Schema.Types.ObjectId,
    ref: 'Incident',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: Object.values(EscalationType),
    required: true,
    index: true
  },
  from_level: {
    type: Number,
    required: true
  },
  to_level: {
    type: Number,
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  triggered_at: {
    type: Date,
    default: Date.now,
    index: true
  },
  acknowledged_at: {
    type: Date
  },
  resolved_at: {
    type: Date
  },
  status: {
    type: String,
    enum: Object.values(EscalationStatus),
    default: EscalationStatus.PENDING,
    index: true
  },
  notified_users: {
    type: [String],
    default: []
  },
  rule: {
    condition: String,
    threshold: Number,
    action: String
  },
  metadata: {
    type: Schema.Types.Mixed
  }
});

// Compound indexes
EscalationSchema.index({ incident_id: 1, triggered_at: -1 });
EscalationSchema.index({ status: 1, triggered_at: -1 });
EscalationSchema.index({ type: 1, status: 1 });

// Virtual for escalation duration
EscalationSchema.virtual('escalation_duration').get(function(this: IEscalation) {
  const endTime = this.resolved_at || new Date();
  return Math.floor((endTime.getTime() - this.triggered_at.getTime()) / 60000);
});

export default mongoose.model<IEscalation>('Escalation', EscalationSchema);
