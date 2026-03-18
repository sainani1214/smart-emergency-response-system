import mongoose, { Schema, Document } from 'mongoose';

export enum NotificationType {
  INCIDENT_CREATED = 'incident_created',
  INCIDENT_ASSIGNED = 'incident_assigned',
  INCIDENT_ESCALATED = 'incident_escalated',
  INCIDENT_RESOLVED = 'incident_resolved',
  RESOURCE_ASSIGNED = 'resource_assigned',
  RESOURCE_STATUS_CHANGED = 'resource_status_changed',
  ALERT = 'alert',
  SYSTEM = 'system'
}

export enum NotificationChannel {
  PUSH = 'push',
  SMS = 'sms',
  EMAIL = 'email',
  IN_APP = 'in_app'
}

export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed'
}

export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

export interface INotification extends Document {
  type: NotificationType;
  recipient: string; // user ID, email, or phone
  channel: NotificationChannel;
  priority: NotificationPriority;
  title: string;
  message: string;
  data?: Record<string, any>; // Additional payload
  status: NotificationStatus;
  sent_at?: Date;
  delivered_at?: Date;
  read_at?: Date;
  created_at: Date;
  retry_count: number;
  error_message?: string;
  related_incident?: mongoose.Types.ObjectId;
  related_resource?: mongoose.Types.ObjectId;
  metadata?: Record<string, any>;
}

const NotificationSchema: Schema = new Schema({
  type: {
    type: String,
    enum: Object.values(NotificationType),
    required: true,
    index: true
  },
  recipient: {
    type: String,
    required: true,
    index: true
  },
  channel: {
    type: String,
    enum: Object.values(NotificationChannel),
    required: true,
    index: true
  },
  priority: {
    type: String,
    enum: Object.values(NotificationPriority),
    default: NotificationPriority.MEDIUM,
    index: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  data: {
    type: Schema.Types.Mixed
  },
  status: {
    type: String,
    enum: Object.values(NotificationStatus),
    default: NotificationStatus.PENDING,
    index: true
  },
  sent_at: {
    type: Date
  },
  delivered_at: {
    type: Date
  },
  read_at: {
    type: Date
  },
  created_at: {
    type: Date,
    default: Date.now,
    index: true
  },
  retry_count: {
    type: Number,
    default: 0
  },
  error_message: {
    type: String
  },
  related_incident: {
    type: Schema.Types.ObjectId,
    ref: 'Incident',
    index: true
  },
  related_resource: {
    type: Schema.Types.ObjectId,
    ref: 'Resource',
    index: true
  },
  metadata: {
    type: Schema.Types.Mixed
  }
});

// Compound indexes
NotificationSchema.index({ recipient: 1, status: 1, created_at: -1 });
NotificationSchema.index({ status: 1, priority: -1, created_at: 1 });
NotificationSchema.index({ channel: 1, status: 1 });

// TTL index to auto-delete old read notifications after 30 days
NotificationSchema.index(
  { read_at: 1 },
  { expireAfterSeconds: 30 * 24 * 60 * 60, partialFilterExpression: { read_at: { $exists: true } } }
);

export default mongoose.model<INotification>('Notification', NotificationSchema);
