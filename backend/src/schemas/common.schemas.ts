// Common validation schemas used across modules

export const locationSchema = {
  type: 'object',
  required: ['lat', 'lng'],
  properties: {
    lat: { type: 'number' },
    lng: { type: 'number' },
    address: { type: 'string' }
  }
} as const;

export const reporterSchema = {
  type: 'object',
  required: ['name', 'contact'],
  properties: {
    name: { type: 'string', minLength: 2, maxLength: 100 },
    contact: { type: 'string', minLength: 10, maxLength: 20 },
    email: { type: 'string', format: 'email' }
  }
} as const;

export const paginationSchema = {
  type: 'object',
  properties: {
    limit: { type: 'number', minimum: 1, maximum: 100, default: 50 },
    skip: { type: 'number', minimum: 0, default: 0 },
    page: { type: 'number', minimum: 1 }
  }
} as const;

export const idParamSchema = {
  type: 'object',
  required: ['id'],
  properties: {
    id: { type: 'string', minLength: 1 }
  }
} as const;

export const responseSchema = {
  success: {
    type: 'object',
    properties: {
      success: { type: 'boolean', const: true },
      data: {}
    }
  },
  error: {
    type: 'object',
    properties: {
      success: { type: 'boolean', const: false },
      error: { type: 'string' },
      details: {}
    }
  }
} as const;