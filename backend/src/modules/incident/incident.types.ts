import { FastifyRequest } from 'fastify';

// Request body types
export interface CreateIncidentBody {
  type: string;
  severity: string;
  location: {
    lat: number;
    lng: number;
    address?: string;
  };
  description: string;
  reporter: {
    name: string;
    contact: string;
    type: string;
    user_id?: string;
  };
}

export interface UpdateStatusBody {
  status: string;
}

export interface AssignResourceBody {
  resourceId: string;
}

// Request query types
export interface GetIncidentsQuery {
  limit?: string;
  skip?: string;
  status?: string;
  type?: string;
  severity?: string;
}

// Request parameter types
export interface IdParam {
  id: string;
}

// Fastify request types
export type CreateIncidentRequest = FastifyRequest<{ Body: CreateIncidentBody }>;
export type GetIncidentsRequest = FastifyRequest<{ Querystring: GetIncidentsQuery }>;
export type GetIncidentByIdRequest = FastifyRequest<{ Params: IdParam }>;
export type UpdateIncidentStatusRequest = FastifyRequest<{ Params: IdParam; Body: UpdateStatusBody }>;
export type AssignResourceRequest = FastifyRequest<{ Params: IdParam; Body: AssignResourceBody }>;