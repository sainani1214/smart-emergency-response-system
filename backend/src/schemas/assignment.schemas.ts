import { idParamSchema } from './common.schemas';

export const assignmentStatuses = ['pending', 'assigned', 'en_route', 'on_scene', 'completed', 'cancelled'] as const;

// Smart assignment trigger schema
export const triggerSmartAssignmentSchema = {
  body: {
    type: 'object',
    required: ['incidentId'],
    properties: {
      incidentId: { type: 'string', minLength: 1 }
    }
  }
} as const;

// Create assignment schema
export const createAssignmentSchema = {
  body: {
    type: 'object',
    required: ['incidentId', 'resourceId'],
    properties: {
      incidentId: { type: 'string', minLength: 1 },
      resourceId: { type: 'string', minLength: 1 },
      distance: { type: 'number', minimum: 0 },
      eta: { type: 'number', minimum: 0 },
      score: { type: 'number', minimum: 0 }
    }
  }
} as const;

// Get assignments schema
export const getAssignmentsSchema = {
  querystring: {
    type: 'object',
    properties: {
      incidentId: { type: 'string' },
      resourceId: { type: 'string' },
      status: { type: 'string', enum: assignmentStatuses },
      limit: { type: 'number', minimum: 1, maximum: 100, default: 50 },
      skip: { type: 'number', minimum: 0, default: 0 }
    }
  }
} as const;

// Update assignment status schema
export const updateAssignmentStatusSchema = {
  params: idParamSchema,
  body: {
    type: 'object',
    required: ['status'],
    properties: {
      status: { type: 'string', enum: assignmentStatuses }
    }
  }
} as const;

export const AssignmentSchemas = {
  triggerSmartAssignmentSchema,
  createAssignmentSchema,
  getAssignmentsSchema,
  updateAssignmentStatusSchema
};