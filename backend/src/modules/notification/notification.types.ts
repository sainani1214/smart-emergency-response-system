import { FastifyRequest } from 'fastify';

// Request body types
export interface CreateNotificationBody {
  type: string;
  recipient: string;
  channel?: string;
  priority?: string;
  title: string;
  message: string;
  data?: any;
  related_incident?: string;
  related_resource?: string;
}

// Request query types
export interface GetNotificationsQuery {
  recipient?: string;
  type?: string;
  channel?: string;
  priority?: string;
  status?: string;
  unread?: string;
  limit?: string;
  skip?: string;
}

export interface MarkAllReadQuery {
  recipient?: string;
}

// Request parameter types
export interface IdParam {
  id: string;
}

// Fastify request types
export type CreateNotificationRequest = FastifyRequest<{ Body: CreateNotificationBody }>;
export type GetNotificationsRequest = FastifyRequest<{ Querystring: GetNotificationsQuery }>;
export type MarkNotificationAsReadRequest = FastifyRequest<{ Params: IdParam }>;
export type MarkAllNotificationsAsReadRequest = FastifyRequest<{ Querystring: MarkAllReadQuery }>;
export type DeleteNotificationRequest = FastifyRequest<{ Params: IdParam }>;