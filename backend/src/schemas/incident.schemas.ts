import { locationSchema, reporterSchema, paginationSchema, idParamSchema } from './common.schemas';

export const incidentTypes = ['medical', 'fire', 'security', 'water', 'power'] as const;
export const incidentSeverities = ['low', 'medium', 'high', 'critical'] as const;
export const incidentStatuses = ['open', 'assigned', 'in-progress', 'resolved', 'closed'] as const;

// Create incident schema
export const createIncidentSchema = {
  body: {
    type: 'object',
    required: ['type', 'severity', 'location', 'description', 'reporter'],
    properties: {
      type: { type: 'string', enum: incidentTypes },
      severity: { type: 'string', enum: incidentSeverities },
      location: locationSchema,
      description: { type: 'string', minLength: 10, maxLength: 1000 },
      reporter: reporterSchema
    }
  }
} as const;

// Get incidents query schema
export const getIncidentsSchema = {
  querystring: {
    type: 'object',
    properties: {
      ...paginationSchema.properties,
      status: { type: 'string', enum: incidentStatuses },
      type: { type: 'string', enum: incidentTypes },
      severity: { type: 'string', enum: incidentSeverities }
    }
  }
} as const;

// Get incident by ID schema
export const getIncidentByIdSchema = {
  params: idParamSchema
} as const;

// Update incident status schema
export const updateIncidentStatusSchema = {
  params: idParamSchema,
  body: {
    type: 'object',
    required: ['status'],
    properties: {
      status: { type: 'string', enum: incidentStatuses }
    }
  }
} as const;

// Assign resource schema
export const assignResourceSchema = {
  params: idParamSchema,
  body: {
    type: 'object',
    required: ['resourceId'],
    properties: {
      resourceId: { type: 'string', minLength: 1 }
    }
  }
} as const;

export const IncidentSchemas = {
  createIncidentSchema,
  getIncidentsSchema,
  getIncidentByIdSchema,
  updateIncidentStatusSchema,
  assignResourceSchema
};