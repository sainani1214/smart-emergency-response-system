import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import assignmentService from './assignment.service';
import incidentService from '../incident/incident.service';
import resourceService from '../resource/resource.service';
import notificationService from '../notification/notification.service';
import { AssignmentStatus } from '../../models';

export default async function assignmentRoutes(fastify: FastifyInstance) {
  // Trigger smart assignment for an incident
  fastify.post('/assignments/match', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { incidentId } = request.body as { incidentId: string };
      
      const incident = await incidentService.getIncidentById(incidentId);
      if (!incident) {
        return reply.code(404).send({ error: 'Incident not found' });
      }

      const match = await assignmentService.findBestResource(incident);
      
      if (!match) {
        return reply.code(404).send({ error: 'No available resources found' });
      }

      // Create assignment
      const assignment = await assignmentService.createAssignment(
        incident._id.toString(),
        match.resource._id.toString(),
        match.distance,
        match.eta,
        match.score
      );

      // Update incident
      await incidentService.assignResource(incidentId, match.resource._id.toString());

      // Update resource
      await resourceService.assignToIncident(match.resource._id.toString(), incident._id.toString());

      // Send notification
      await notificationService.notifyResourceAssigned(
        match.resource.unit_id,
        incident,
        assignment
      );

      // Broadcast via WebSocket
      const socketService = (fastify as any).socketService;
      if (socketService) {
        socketService.emitIncidentAssigned(incident, match.resource, assignment);
      }

      return reply.code(201).send(assignment);
    } catch (error: any) {
      return reply.code(500).send({ error: error.message });
    }
  });

  // Get all assignments
  fastify.get('/assignments', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const assignments = await assignmentService.getActiveAssignments();
      return reply.send(assignments);
    } catch (error: any) {
      return reply.code(500).send({ error: error.message });
    }
  });

  // Get assignment by ID
  fastify.get('/assignments/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const assignment = await assignmentService.getAssignmentById(id);
      
      if (!assignment) {
        return reply.code(404).send({ error: 'Assignment not found' });
      }
      
      return reply.send(assignment);
    } catch (error: any) {
      return reply.code(500).send({ error: error.message });
    }
  });

  // Update assignment status
  fastify.patch('/assignments/:id/status', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const { status } = request.body as { status: AssignmentStatus };
      
      const assignment = await assignmentService.updateAssignmentStatus(id, status);
      
      if (!assignment) {
        return reply.code(404).send({ error: 'Assignment not found' });
      }

      // Broadcast update
      const socketService = (fastify as any).socketService;
      if (socketService) {
        socketService.emitAssignmentStatusChanged(assignment);
      }
      
      return reply.send(assignment);
    } catch (error: any) {
      return reply.code(500).send({ error: error.message });
    }
  });

  // Get assignment statistics
  fastify.get('/assignments/stats/summary', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const stats = await assignmentService.getStatistics();
      return reply.send(stats);
    } catch (error: any) {
      return reply.code(500).send({ error: error.message });
    }
  });
}
