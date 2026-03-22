import { Schema, model, Document, Types } from 'mongoose';

export enum DeviceType {
  IOS = 'ios',
  ANDROID = 'android',
}

export enum UserType {
  USER = 'user',
  RESPONDER = 'responder',
}

export interface IPushToken extends Document {
  user_id: Types.ObjectId;
  user_type: UserType;
  token: string;
  device_type: DeviceType;
  device_name?: string;
  app_version?: string;
  active: boolean;
  created_at: Date;
  last_used?: Date;
}

const PushTokenSchema = new Schema<IPushToken>({
  user_id: {
    type: Schema.Types.ObjectId,
    required: true,
    refPath: 'user_type',
  },
  user_type: {
    type: String,
    enum: Object.values(UserType),
    required: true,
  },
  token: {
    type: String,
    required: true,
    unique: true,
  },
  device_type: {
    type: String,
    enum: Object.values(DeviceType),
    required: true,
  },
  device_name: {
    type: String,
  },
  app_version: {
    type: String,
  },
  active: {
    type: Boolean,
    default: true,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
  last_used: {
    type: Date,
  },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});

// Compound index for queries
PushTokenSchema.index({ user_id: 1, user_type: 1 });
PushTokenSchema.index({ active: 1 });

export const PushToken = model<IPushToken>('PushToken', PushTokenSchema);
