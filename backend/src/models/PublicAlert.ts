import { Schema, model, Document, Types } from 'mongoose';

export enum AlertLevel {
  INFO = 'info',
  WARNING = 'warning',
  ALERT = 'alert',
  EMERGENCY = 'emergency',
}

export interface IPublicAlert extends Document {
  alert_id: string;
  title: string;
  message: string;
  alert_level: AlertLevel;
  incident_id?: Types.ObjectId;
  affected_area: {
    center: {
      lat: number;
      lng: number;
    };
    radius_km: number;
  };
  created_by: Types.ObjectId;
  created_at: Date;
  expires_at?: Date;
  active: boolean;
  notified_count?: number;
}

const PublicAlertSchema = new Schema<IPublicAlert>({
  alert_id: {
    type: String,
    required: true,
    unique: true,
  },
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  alert_level: {
    type: String,
    enum: Object.values(AlertLevel),
    required: true,
  },
  incident_id: {
    type: Schema.Types.ObjectId,
    ref: 'Incident',
  },
  affected_area: {
    center: {
      lat: {
        type: Number,
        required: true,
      },
      lng: {
        type: Number,
        required: true,
      },
    },
    radius_km: {
      type: Number,
      required: true,
      min: 0.1,
      max: 100,
    },
  },
  created_by: {
    type: Schema.Types.ObjectId,
    ref: 'Responder', 
    required: true,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
  expires_at: {
    type: Date,
  },
  active: {
    type: Boolean,
    default: true,
  },
  notified_count: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});

// Compound and specific indexes
PublicAlertSchema.index({ active: 1, alert_level: 1 });
PublicAlertSchema.index({ created_at: -1 });
PublicAlertSchema.index({ 'affected_area.center': '2dsphere' }); // Geo-spatial index

export const PublicAlert = model<IPublicAlert>('PublicAlert', PublicAlertSchema);
