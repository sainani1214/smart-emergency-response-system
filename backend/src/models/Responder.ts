import { Schema, model, Document, Types } from 'mongoose';

export enum ResponderStatus {
  AVAILABLE = 'available',
  ON_DUTY = 'on_duty',
  BUSY = 'busy',
  OFF_DUTY = 'off_duty',
}

export enum ResponderType {
  PARAMEDIC = 'paramedic',
  FIREFIGHTER = 'firefighter',
  POLICE = 'police',
  SECURITY = 'security',
  MAINTENANCE = 'maintenance',
}

export interface IResponder extends Document {
  responder_id: string;
  name: string;
  email: string;
  phone: string;
  password_hash: string;
  role: 'responder';
  responder_type: ResponderType;
  badge_number?: string;
  assigned_resource_id?: Types.ObjectId;
  status: ResponderStatus;
  location?: {
    lat: number;
    lng: number;
    last_updated?: Date;
  };
  skills: string[];
  certifications: string[];
  experience_years?: number;
  rating?: number;
  total_incidents_handled: number;
  created_at: Date;
  last_login?: Date;
  is_verified: boolean;
  is_active: boolean;
}

const ResponderSchema = new Schema<IResponder>({
  responder_id: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  phone: {
    type: String,
    required: true,
    unique: true,
  },
  password_hash: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['responder'],
    default: 'responder',
  },
  responder_type: {
    type: String,
    enum: Object.values(ResponderType),
    required: true,
  },
  badge_number: {
    type: String,
    unique: true,
    sparse: true, 
  },
  assigned_resource_id: {
    type: Schema.Types.ObjectId,
    ref: 'Resource',
  },
  status: {
    type: String,
    enum: Object.values(ResponderStatus),
    default: ResponderStatus.OFF_DUTY,
  },
  location: {
    lat: Number,
    lng: Number,
    last_updated: Date,
  },
  skills: {
    type: [String],
    default: [],
  },
  certifications: {
    type: [String],
    default: [],
  },
  experience_years: {
    type: Number,
    min: 0,
  },
  rating: {
    type: Number,
    min: 0,
    max: 5,
  },
  total_incidents_handled: {
    type: Number,
    default: 0,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
  last_login: {
    type: Date,
  },
  is_verified: {
    type: Boolean,
    default: false,
  },
  is_active: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});

// Compound indexes only (unique indexes already defined in schema)
ResponderSchema.index({ status: 1, responder_type: 1 });

export const Responder = model<IResponder>('Responder', ResponderSchema);
