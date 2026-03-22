import { idParamSchema } from './common.schemas';

export const notificationTypes = ['incident_created', 'incident_updated', 'resource_assigned', 'resource_updated', 'assignment_created', 'escalation'] as const;
export const notificationChannels = ['in_app', 'email', 'sms', 'push'] as const;
export const notificationPriorities = ['low', 'medium', 'high', 'critical'] as const;
export const notificationStatuses = ['pending', 'sent', 'delivered', 'read', 'failed'] as const;

// Create notification schema
export const createNotificationSchema = {
  body: {
    type: 'object',
    required: ['type', 'recipient', 'title', 'message'],
    properties: {
      type: { type: 'string', enum: notificationTypes },
      recipient: { type: 'string', minLength: 1 },
      channel: { type: 'string', enum: notificationChannels, default: 'in_app' },
      priority: { type: 'string', enum: notificationPriorities, default: 'medium' },
      title: { type: 'string', minLength: 1, maxLength: 200 },
      message: { type: 'string', minLength: 1, maxLength: 1000 },
      data: { type: 'object' },
      related_incident: { type: 'string' },
      related_resource: { type: 'string' }
    }
  }
} as const;

// Get notifications schema
export const getNotificationsSchema = {
  querystring: {
    type: 'object',
    properties: {
      recipient: { type: 'string' },
      type: { type: 'string', enum: notificationTypes },
      channel: { type: 'string', enum: notificationChannels },
      priority: { type: 'string', enum: notificationPriorities },
      status: { type: 'string', enum: notificationStatuses },
      unread: { type: 'boolean' },
      limit: { type: 'number', minimum: 1, maximum: 100, default: 50 },
      skip: { type: 'number', minimum: 0, default: 0 }
    }
  }
} as const;

// Mark notification as read schema
export const markNotificationReadSchema = {
  params: idParamSchema
} as const;

// Mark all notifications as read schema
export const markAllNotificationsReadSchema = {
  querystring: {
    type: 'object',
    properties: {
      recipient: { type: 'string', minLength: 1 }
    }
  }
} as const;

export const NotificationSchemas = {
  createNotificationSchema,
  getNotificationsSchema,
  markNotificationReadSchema,
  markAllNotificationsReadSchema
};