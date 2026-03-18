import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import incidentService from './incident.service';
import { IncidentStatus } from '../../models';

export default async function incidentRoutes(fastify: FastifyInstance) {
  // Create incident
  fastify.post('/incidents', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = request.body as any;
      const incident = await incidentService.createIncident(data);
      
      // Broadcast to WebSocket clients
      const socketService = (fastify as any).socketService;
      if (socketService) {
        socketService.emitIncidentCreated(incident);
      }
      
      return reply.code(201).send(incident);
    } catch (error: any) {
      return reply.code(500).send({ error: error.message });
    }
  });

  // Get all incidents
  fastify.get('/incidents', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = request.query as any;
      const result = await incidentService.getIncidents({
        status: query.status,
        type: query.type,
        severity: query.severity,
        limit: query.limit ? parseInt(query.limit) : 50,
        skip: query.skip ? parseInt(query.skip) : 0
      });
      
      return reply.send(result);
    } catch (error: any) {
      return reply.code(500).send({ error: error.message });
    }
  });

  // Get active incidents
  fastify.get('/incidents/active', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const incidents = await incidentService.getActiveIncidents();
      return reply.send(incidents);
    } catch (error: any) {
      return reply.code(500).send({ error: error.message });
    }
  });

  // Get incident by ID
  fastify.get('/incidents/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const incident = await incidentService.getIncidentById(id);
      
      if (!incident) {
        return reply.code(404).send({ error: 'Incident not found' });
      }
      
      return reply.send(incident);
    } catch (error: any) {
      return reply.code(500).send({ error: error.message });
    }
  });

  // Update incident status
  fastify.patch('/incidents/:id/status', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const { status } = request.body as { status: IncidentStatus };
      
      const incident = await incidentService.updateIncidentStatus(id, status);
      
      if (!incident) {
        return reply.code(404).send({ error: 'Incident not found' });
      }

      // Broadcast update
      const socketService = (fastify as any).socketService;
      if (socketService) {
        socketService.emitIncidentUpdated(incident);
      }
      
      return reply.send(incident);
    } catch (error: any) {
      return reply.code(500).send({ error: error.message });
    }
  });

  // Get incident statistics
  fastify.get('/incidents/stats/summary', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const stats = await incidentService.getStatistics();
      return reply.send(stats);
    } catch (error: any) {
      return reply.code(500).send({ error: error.message });
    }
  });
}
