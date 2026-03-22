import { FastifyRequest, FastifyReply } from 'fastify';
import resourceService from './resource.service';
import {
  CreateResourceRequest,
  GetResourcesRequest,
  GetResourceByUnitIdRequest,
  UpdateResourceStatusRequest,
  UpdateResourceLocationRequest
} from './resource.types';

export const createResource = async (request: CreateResourceRequest, reply: FastifyReply) => {
  try {
    const data = request.body;
    const resource = await resourceService.createResource(data);
    return reply.code(201).send(resource);
  } catch (error: any) {
    return reply.code(500).send({ error: error.message });
  }
};

export const getResources = async (request: GetResourcesRequest, reply: FastifyReply) => {
  try {
    const query = request.query;
    const resources = await resourceService.getResources({
      status: query.status as any,
      type: query.type as any,
      available: query.available ? query.available === 'true' : undefined
    });
    
    return reply.send(resources);
  } catch (error: any) {
    return reply.code(500).send({ error: error.message });
  }
};

export const getResourceByUnitId = async (request: GetResourceByUnitIdRequest, reply: FastifyReply) => {
  try {
    const { unitId } = request.params;
    const resource = await resourceService.getResourceByUnitId(unitId);
    
    if (!resource) {
      return reply.code(404).send({ error: 'Resource not found' });
    }
    
    return reply.send(resource);
  } catch (error: any) {
    return reply.code(500).send({ error: error.message });
  }
};

export const updateResourceStatus = async (request: UpdateResourceStatusRequest, reply: FastifyReply) => {
  try {
    const { unitId } = request.params;
    const { status } = request.body;
    
    const resource = await resourceService.updateStatus(unitId, status as any);
    
    if (!resource) {
      return reply.code(404).send({ error: 'Resource not found' });
    }
    
    const socketService = (request.server as any).socketService;
    if (socketService) {
      socketService.emitResourceUpdated(resource);
    }
    
    return reply.send(resource);
  } catch (error: any) {
    return reply.code(500).send({ error: error.message });
  }
};

export const updateResourceLocation = async (request: UpdateResourceLocationRequest, reply: FastifyReply) => {
  try {
    const { unitId } = request.params;
    const { location } = request.body;
    
    const resource = await resourceService.updateLocation(unitId, location);
    
    if (!resource) {
      return reply.code(404).send({ error: 'Resource not found' });
    }
    
    const socketService = (request.server as any).socketService;
    if (socketService) {
      socketService.emitResourceUpdated(resource);
    }
    
    return reply.send(resource);
  } catch (error: any) {
    return reply.code(500).send({ error: error.message });
  }
};

export const getResourceStatistics = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const stats = await resourceService.getStatistics();
    return reply.send(stats);
  } catch (error: any) {
    return reply.code(500).send({ error: error.message });
  }
};

export const getAvailableResources = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const resources = await resourceService.getAvailableResourcesByType('');
    return reply.send(resources);
  } catch (error: any) {
    return reply.code(500).send({ error: error.message });
  }
};