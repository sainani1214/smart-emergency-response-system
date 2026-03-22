import { FastifyRequest } from 'fastify';

// Request body types
export interface CreateResourceBody {
  unit_id: string;
  type: string;
  location: {
    lat: number;
    lng: number;
    address?: string;
  };
  crew: {
    size: number;
    lead?: string;
    contact?: string;
  };
  equipment?: string[];
  capacity: {
    max: number;
    current?: number;
  };
  skills?: string[];
}

export interface UpdateStatusBody {
  status: string;
}

export interface UpdateLocationBody {
  location: {
    lat: number;
    lng: number;
    address?: string;
  };
}

// Request query types
export interface GetResourcesQuery {
  limit?: string;
  skip?: string;
  status?: string;
  type?: string;
  available?: string;
}

// Request parameter types
export interface UnitIdParam {
  unitId: string;
}

// Fastify request types
export type CreateResourceRequest = FastifyRequest<{ Body: CreateResourceBody }>;
export type GetResourcesRequest = FastifyRequest<{ Querystring: GetResourcesQuery }>;
export type GetResourceByUnitIdRequest = FastifyRequest<{ Params: UnitIdParam }>;
export type UpdateResourceStatusRequest = FastifyRequest<{ Params: UnitIdParam; Body: UpdateStatusBody }>;
export type UpdateResourceLocationRequest = FastifyRequest<{ Params: UnitIdParam; Body: UpdateLocationBody }>;