import mongoose, { Schema, Document } from 'mongoose';

export enum AssignmentStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  IN_PROGRESS = 'in-progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  REJECTED = 'rejected'
}

export interface IAssignment extends Document {
  incident_id: mongoose.Types.ObjectId;
  resource_id: mongoose.Types.ObjectId;
  assigned_at: Date;
  accepted_at?: Date;
  started_at?: Date;
  completed_at?: Date;
  cancelled_at?: Date;
  status: AssignmentStatus;
  distance: number; // in kilometers
  eta: number; // in minutes
  actual_response_time?: number; // in minutes
  score: number; // assignment optimization score
  notes?: string;
  metadata?: Record<string, any>;
}

const AssignmentSchema: Schema = new Schema({
  incident_id: {
    type: Schema.Types.ObjectId,
    ref: 'Incident',
    required: true,
    index: true
  },
  resource_id: {
    type: Schema.Types.ObjectId,
    ref: 'Resource',
    required: true,
    index: true
  },
  assigned_at: {
    type: Date,
    default: Date.now,
    index: true
  },
  accepted_at: {
    type: Date
  },
  started_at: {
    type: Date
  },
  completed_at: {
    type: Date
  },
  cancelled_at: {
    type: Date
  },
  status: {
    type: String,
    enum: Object.values(AssignmentStatus),
    default: AssignmentStatus.PENDING,
    index: true
  },
  distance: {
    type: Number,
    required: true
  },
  eta: {
    type: Number,
    required: true
  },
  actual_response_time: {
    type: Number
  },
  score: {
    type: Number,
    required: true
  },
  notes: {
    type: String
  },
  metadata: {
    type: Schema.Types.Mixed
  }
});

// Compound indexes
AssignmentSchema.index({ incident_id: 1, status: 1 });
AssignmentSchema.index({ resource_id: 1, status: 1 });
AssignmentSchema.index({ status: 1, assigned_at: -1 });

// Virtual for total time calculation
AssignmentSchema.virtual('total_time').get(function(this: IAssignment) {
  if (this.completed_at && this.assigned_at) {
    return Math.floor((this.completed_at.getTime() - this.assigned_at.getTime()) / 60000);
  }
  return null;
});

// Method to calculate actual response time
AssignmentSchema.methods.calculateResponseTime = function(this: IAssignment): number | null {
  if (this.started_at && this.assigned_at) {
    return Math.floor((this.started_at.getTime() - this.assigned_at.getTime()) / 60000);
  }
  return null;
};

export default mongoose.model<IAssignment>('Assignment', AssignmentSchema);
