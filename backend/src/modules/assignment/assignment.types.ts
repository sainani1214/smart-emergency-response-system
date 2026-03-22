import { FastifyRequest } from 'fastify';

// Request body types
export interface TriggerSmartAssignmentBody {
  incidentId: string;
}

export interface CreateAssignmentBody {
  incidentId: string;
  resourceId: string;
  distance?: number;
  eta?: number;
  score?: number;
}

// Request query types
export interface GetAssignmentsQuery {
  incidentId?: string;
  resourceId?: string;
  status?: string;
  limit?: string;
  skip?: string;
}

// Request parameter types
export interface IdParam {
  id: string;
}

export interface IncidentTypeParam {
  incidentType: string;
}

// Request body types
export interface UpdateStatusBody {
  status: string;
}

// Fastify request types
export type TriggerSmartAssignmentRequest = FastifyRequest<{ Body: TriggerSmartAssignmentBody }>;
export type CreateAssignmentRequest = FastifyRequest<{ Body: CreateAssignmentBody }>;
export type GetAssignmentsRequest = FastifyRequest<{ Querystring: GetAssignmentsQuery }>;
export type UpdateStatusRequest = FastifyRequest<{ Params: IdParam; Body: UpdateStatusBody }>;
export type GetAssignmentByIdRequest = FastifyRequest<{ Params: IdParam }>;
export type GetEligibleResourcesRequest = FastifyRequest<{ Params: IncidentTypeParam }>;