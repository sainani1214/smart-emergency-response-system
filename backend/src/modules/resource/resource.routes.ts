import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import resourceService from './resource.service';
import { resourceSeedService } from './resource.seed';
import { ResourceStatus } from '../../models';

export default async function resourceRoutes(fastify: FastifyInstance) {
  // Create resource
  fastify.post('/resources', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = request.body as any;
      const resource = await resourceService.createResource(data);
      
      // Broadcast to WebSocket clients
      const socketService = (fastify as any).socketService;
      if (socketService) {
        socketService.emitToAll('resource:created' as any, resource);
      }
      
      return reply.code(201).send(resource);
    } catch (error: any) {
      return reply.code(500).send({ error: error.message });
    }
  });

  // Get all resources
  fastify.get('/resources', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = request.query as any;
      const resources = await resourceService.getResources({
        status: query.status,
        type: query.type,
        available: query.available === 'true'
      });
      
      return reply.send(resources);
    } catch (error: any) {
      return reply.code(500).send({ error: error.message });
    }
  });

  // Get resource by unit ID
  fastify.get('/resources/:unitId', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { unitId } = request.params as { unitId: string };
      const resource = await resourceService.getResourceByUnitId(unitId);
      
      if (!resource) {
        return reply.code(404).send({ error: 'Resource not found' });
      }
      
      return reply.send(resource);
    } catch (error: any) {
      return reply.code(500).send({ error: error.message });
    }
  });

  // Update resource status
  fastify.patch('/resources/:unitId/status', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { unitId } = request.params as { unitId: string };
      const { status } = request.body as { status: ResourceStatus };
      
      const resource = await resourceService.updateResourceStatus(unitId, status);
      
      if (!resource) {
        return reply.code(404).send({ error: 'Resource not found' });
      }

      // Broadcast update
      const socketService = (fastify as any).socketService;
      if (socketService) {
        socketService.emitResourceStatusChanged(resource);
      }
      
      return reply.send(resource);
    } catch (error: any) {
      return reply.code(500).send({ error: error.message });
    }
  });

  // Update resource location
  fastify.patch('/resources/:unitId/location', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { unitId } = request.params as { unitId: string };
      const { lat, lng } = request.body as { lat: number; lng: number };
      
      const resource = await resourceService.updateResourceLocation(unitId, { lat, lng });
      
      if (!resource) {
        return reply.code(404).send({ error: 'Resource not found' });
      }

      // Broadcast update
      const socketService = (fastify as any).socketService;
      if (socketService) {
        socketService.emitResourceLocationUpdated(resource);
      }
      
      return reply.send(resource);
    } catch (error: any) {
      return reply.code(500).send({ error: error.message });
    }
  });

  // Get resource statistics
  fastify.get('/resources/stats/summary', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const stats = await resourceService.getStatistics();
      return reply.send(stats);
    } catch (error: any) {
      return reply.code(500).send({ error: error.message });
    }
  });

  // Seed resources (for development/demo)
  fastify.post('/resources/seed', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await resourceSeedService.seedResources();
      const stats = await resourceService.getStatistics();
      
      // Broadcast to WebSocket clients
      const socketService = (fastify as any).socketService;
      if (socketService) {
        socketService.emitToAll('resources:updated' as any, stats);
      }
      
      return reply.send({ 
        message: 'Resources seeded successfully', 
        stats 
      });
    } catch (error: any) {
      return reply.code(500).send({ error: error.message });
    }
  });
}
