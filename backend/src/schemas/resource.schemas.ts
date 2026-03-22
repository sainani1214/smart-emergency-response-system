import { locationSchema, paginationSchema, idParamSchema } from './common.schemas';

export const resourceTypes = ['ambulance', 'fire_truck', 'police_vehicle', 'security_unit', 'maintenance_truck'] as const;
export const resourceStatuses = ['available', 'dispatched', 'busy', 'maintenance'] as const;

// Create resource schema
export const createResourceSchema = {
  body: {
    type: 'object',
    required: ['unit_id', 'type', 'location', 'crew'],
    properties: {
      unit_id: { type: 'string', minLength: 3, maxLength: 20 },
      type: { type: 'string', enum: resourceTypes },
      location: locationSchema,
      crew: {
        type: 'object',
        required: ['size'],
        properties: {
          size: { type: 'number', minimum: 1, maximum: 10 },
          lead: { type: 'string', minLength: 2, maxLength: 100 },
          contact: { type: 'string', minLength: 10, maxLength: 20 }
        }
      },
      equipment: {
        type: 'array',
        items: { type: 'string' }
      },
      capacity: {
        type: 'object',
        properties: {
          max: { type: 'number', minimum: 1 },
          current: { type: 'number', minimum: 0 }
        }
      },
      skills: {
        type: 'array',
        items: { type: 'string' }
      }
    }
  }
} as const;

// Get resources query schema
export const getResourcesSchema = {
  querystring: {
    type: 'object',
    properties: {
      ...paginationSchema.properties,
      status: { type: 'string', enum: resourceStatuses },
      type: { type: 'string', enum: resourceTypes },
      available: { type: 'boolean' }
    }
  }
} as const;

// Get resource by ID schema
export const getResourceByIdSchema = {
  params: {
    type: 'object',
    required: ['unitId'],
    properties: {
      unitId: { type: 'string', minLength: 1 }
    }
  }
} as const;

// Update resource status schema
export const updateResourceStatusSchema = {
  params: {
    type: 'object',
    required: ['unitId'],
    properties: {
      unitId: { type: 'string', minLength: 1 }
    }
  },
  body: {
    type: 'object',
    required: ['status'],
    properties: {
      status: { type: 'string', enum: resourceStatuses }
    }
  }
} as const;

// Update resource location schema
export const updateResourceLocationSchema = {
  params: {
    type: 'object',
    required: ['unitId'],
    properties: {
      unitId: { type: 'string', minLength: 1 }
    }
  },
  body: {
    type: 'object',
    required: ['location'],
    properties: {
      location: locationSchema
    }
  }
} as const;

export const ResourceSchemas = {
  createResourceSchema,
  getResourcesSchema,
  getResourceByIdSchema,
  updateResourceStatusSchema,
  updateResourceLocationSchema
};