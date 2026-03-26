import mongoose, { Schema, Document } from 'mongoose';

export enum ResourceType {
  AMBULANCE = 'ambulance',
  FIRE_TRUCK = 'fire_truck',
  SECURITY = 'security',
  MAINTENANCE = 'maintenance',
  POLICE = 'police'
}

export enum ResourceStatus {
  AVAILABLE = 'available',
  DISPATCHED = 'dispatched',
  BUSY = 'busy',
  OFFLINE = 'offline'
}

export interface ICapacity {
  current: number;
  max: number;
}

export interface IResourceLocation {
  lat: number;
  lng: number;
}

export interface IResource extends Document {
  unit_id: string;
  type: ResourceType;
  status: ResourceStatus;
  location: IResourceLocation;
  capacity: ICapacity;
  assigned_to?: mongoose.Types.ObjectId; 
  skills: string[];
  last_updated: Date;
  crew_size?: number;
  equipment?: string[];
  contact?: string;
  metadata?: Record<string, any>;
}

const ResourceSchema: Schema = new Schema({
  unit_id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  type: {
    type: String,
    enum: Object.values(ResourceType),
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: Object.values(ResourceStatus),
    default: ResourceStatus.AVAILABLE,
    index: true
  },
  location: {
    type: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true }
    },
    required: true,
    index: '2dsphere' // Geospatial index for location queries
  },
  capacity: {
    current: { type: Number, default: 0 },
    max: { type: Number, required: true }
  },
  assigned_to: {
    type: Schema.Types.ObjectId,
    ref: 'Incident',
    index: true
  },
  skills: {
    type: [String],
    default: []
  },
  last_updated: {
    type: Date,
    default: Date.now,
    index: true
  },
  crew_size: {
    type: Number,
    default: 1
  },
  equipment: {
    type: [String],
    default: []
  },
  contact: {
    type: String
  },
  metadata: {
    type: Schema.Types.Mixed
  }
});

// Compound indexes for efficient queries
ResourceSchema.index({ type: 1, status: 1 });
ResourceSchema.index({ status: 1, location: '2dsphere' });

// Update last_updated before save
ResourceSchema.pre('save', function(this: IResource) {
  this.last_updated = new Date();
});

// Virtual for availability check
ResourceSchema.virtual('is_available').get(function(this: IResource) {
  return this.status === ResourceStatus.AVAILABLE && 
         this.capacity.current < this.capacity.max;
});

// Method to check if resource can handle incident type
ResourceSchema.methods.canHandle = function(incidentType: string): boolean {
  const typeMapping: Record<string, ResourceType[]> = {
    medical: [ResourceType.AMBULANCE],
    fire: [ResourceType.FIRE_TRUCK],
    security: [ResourceType.SECURITY, ResourceType.POLICE],
    water: [ResourceType.MAINTENANCE],
    power: [ResourceType.MAINTENANCE]
  };
  
  return typeMapping[incidentType]?.includes(this.type) || false;
};

export default mongoose.model<IResource>('Resource', ResourceSchema);
