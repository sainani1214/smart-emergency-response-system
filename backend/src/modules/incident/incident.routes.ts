import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import incidentService from './incident.service';
import assignmentService from '../assignment/assignment.service';
import resourceService from '../resource/resource.service';
import notificationService from '../notification/notification.service';
import { IncidentStatus } from '../../models';

export default async function incidentRoutes(fastify: FastifyInstance) {
  // Create incident
  fastify.post('/incidents', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = request.body as any;
      const incident = await incidentService.createIncident(data);
      
      // Send notification for incident creation
      await notificationService.notifyIncidentCreated(
        incident._id.toString(),
        incident,
        ['dispatch'] // Send to dispatch center
      );
      
      // Broadcast incident creation to WebSocket clients
      const socketService = (fastify as any).socketService;
      if (socketService) {
        socketService.emitIncidentCreated(incident);
      }

      // Auto-assign resource if available
      try {
        const match = await assignmentService.findBestResource(incident);
        
        if (match) {
          // Create assignment
          const assignment = await assignmentService.createAssignment(
            incident._id.toString(),
            match.resource._id.toString(),
            match.distance,
            match.eta,
            match.score
          );

          // Update incident
          await incidentService.assignResource(incident.incident_id, match.resource._id.toString());

          // Update resource
          await resourceService.assignToIncident(match.resource._id.toString(), incident._id.toString());

          // Send notification
          await notificationService.notifyResourceAssigned(
            match.resource._id.toString(),
            incident,
            assignment
          );

          // Broadcast assignment via WebSocket
          if (socketService) {
            socketService.emitIncidentAssigned(incident, match.resource, assignment);
          }

          console.log(`✅ Auto-assigned ${match.resource.unit_id} to incident ${incident.incident_id}`);
        } else {
          console.log(`⚠️ No available resources for incident ${incident.incident_id} (type: ${incident.type})`);
        }
      } catch (assignmentError) {
        console.error('Auto-assignment failed:', assignmentError);
        // Don't fail the incident creation if assignment fails
      }
      
      return reply.code(201).send(incident);
    } catch (error: any) {
      console.error('❌ Error creating incident:', error);
      console.error('Error stack:', error.stack);
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
      
      console.log(`🔄 Updating incident status:`, { id, status });
      
      const incident = await incidentService.updateIncidentStatus(id, status);
      
      if (!incident) {
        console.log(`❌ Incident not found with ID: ${id}`);
        return reply.code(404).send({ error: 'Incident not found' });
      }

      console.log(`✅ Incident status updated:`, { 
        incident_id: incident.incident_id, 
        status: incident.status 
      });

      // Broadcast update
      const socketService = (fastify as any).socketService;
      if (socketService) {
        socketService.emitIncidentUpdated(incident);
      }
      
      return reply.send(incident);
    } catch (error: any) {
      console.error('❌ Error updating incident status:', error);
      console.error('Error stack:', error.stack);
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
