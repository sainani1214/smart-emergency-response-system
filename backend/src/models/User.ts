import { Schema, model, Document } from 'mongoose';

export interface IUser extends Document {
  user_id: string;
  name: string;
  email: string;
  phone: string;
  password_hash: string;
  role: 'user';
  profile_picture?: string;
  address?: {
    street?: string;
    city: string;
    state: string;
    zip_code?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  preferences?: {
    notifications_enabled: boolean;
    sms_alerts: boolean;
    email_alerts: boolean;
  };
  created_at: Date;
  last_login?: Date;
  is_verified: boolean;
  is_active: boolean;
}

const UserSchema = new Schema<IUser>({
  user_id: {
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
    enum: ['user'],
    default: 'user',
  },
  profile_picture: {
    type: String,
  },
  address: {
    street: String,
    city: {
      type: String,
      required: true,
    },
    state: {
      type: String,
      required: true,
    },
    zip_code: String,
    coordinates: {
      lat: Number,
      lng: Number,
    },
  },
  preferences: {
    notifications_enabled: {
      type: Boolean,
      default: true,
    },
    sms_alerts: {
      type: Boolean,
      default: true,
    },
    email_alerts: {
      type: Boolean,
      default: false,
    },
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

// Unique indexes already defined in schema with 'unique: true'
// No additional indexes needed

export const User = model<IUser>('User', UserSchema);
