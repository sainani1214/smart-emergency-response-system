import { FastifyReply } from 'fastify';
import assignmentService from './assignment.service';
import incidentService from '../incident/incident.service';
import resourceService from '../resource/resource.service';
import notificationService from '../notification/notification.service';
import { Responder } from '../../models/Responder';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import {
  TriggerSmartAssignmentRequest,
  CreateAssignmentRequest,
  GetAssignmentsRequest,
  UpdateStatusRequest,
  GetAssignmentByIdRequest,
  GetEligibleResourcesRequest
} from './assignment.types';

export const triggerSmartAssignment = async (request: TriggerSmartAssignmentRequest, reply: FastifyReply) => {
  try {
    const { incidentId } = request.body;
      
      const incident = await incidentService.getIncidentById(incidentId);
      if (!incident) {
        return reply.code(404).send({ error: 'Incident not found' });
      }

      const match = await assignmentService.findBestResource(incident);
      
      if (!match) {
        // Get resource statistics to provide helpful message
        const resourceStats = await resourceService.getStatistics();
        const eligibleResources = await assignmentService.getEligibleResources(incident.type);
        
        return reply.code(404).send({ 
          error: 'No available resources found',
          details: {
            message: eligibleResources.length === 0 
              ? `No resources available for incident type: ${incident.type}`
              : `All ${eligibleResources.length} eligible resources are currently busy`,
            totalResources: resourceStats.total,
            availableResources: resourceStats.byStatus?.available || 0,
            incidentType: incident.type,
            suggestion: resourceStats.total < 10 
              ? 'Consider adding more emergency resources to the system'
              : 'Resources are currently deployed. Consider escalating or waiting for availability'
          }
        });
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
      const socketService = (request.server as any).socketService;
      if (socketService) {
        socketService.emitIncidentAssigned(incident, match.resource, assignment);
      }

      return reply.code(201).send({
        assignment,
        incident,
        resource: match.resource,
        match_details: {
          distance: match.distance,
          eta: match.eta,
          score: match.score
        }
      });
  } catch (error: any) {
    return reply.code(500).send({ error: error.message });
  }
};

export const createAssignment = async (request: CreateAssignmentRequest, reply: FastifyReply) => {
  try {
    const { incidentId, resourceId, distance, eta, score } = request.body;
      
      const assignment = await assignmentService.createAssignment(
        incidentId,
        resourceId,
        distance || 0,
        eta || 0,
        score || 0
      );
      
    return reply.code(201).send(assignment);
  } catch (error: any) {
    return reply.code(500).send({ error: error.message });
  }
};

export const getAssignments = async (request: GetAssignmentsRequest, reply: FastifyReply) => {
  try {
    const query = request.query;
    
    console.log('[getAssignments] Query:', query);
    
    if (!query.incidentId) {
      return reply.code(400).send({ error: 'incidentId is required' });
    }
    
    const assignments = await assignmentService.getAssignmentsByIncident(
      query.incidentId
    );
    
    console.log('[getAssignments] Found assignments:', assignments.length);
    
    return reply.send(assignments);
  } catch (error: any) {
    console.error('[getAssignments] Error:', error);
    return reply.code(500).send({ error: error.message, stack: error.stack });
  }
};

export const updateAssignmentStatus = async (request: UpdateStatusRequest & AuthenticatedRequest, reply: FastifyReply) => {
  try {
    const { id } = request.params;
    const { status } = request.body;
    
    console.log('Update assignment status:', { id, status, user: request.user });
    
    let responderId, responderUserId;
    if (status === 'accepted' && request.user && request.user.role === 'responder') {
      console.log('Looking for responder with responder_id:', request.user.userId);
      const responder = await Responder.findOne({ responder_id: request.user.userId });
      console.log('Found responder:', responder ? responder.responder_id : 'NOT FOUND');
      
      if (responder) {
        responderId = responder._id.toString();
        responderUserId = responder.responder_id;
        
        // Increment incidents handled
        responder.total_incidents_handled += 1;
        await responder.save();
        console.log('Updated responder incidents count to:', responder.total_incidents_handled);
      } else {
        console.warn('Responder not found for userId:', request.user.userId);
      }
    }
      
    const assignment = await assignmentService.updateAssignmentStatus(id, status as any, responderId, responderUserId);
      
    if (!assignment) {
      return reply.code(404).send({ error: 'Assignment not found' });
    }
      
    return reply.send(assignment);
  } catch (error: any) {
    console.error('Error updating assignment status:', error);
    return reply.code(500).send({ error: error.message, stack: error.stack });
  }
};

export const getAssignmentById = async (request: GetAssignmentByIdRequest, reply: FastifyReply) => {
  try {
    const { id } = request.params;
      const assignment = await assignmentService.getAssignmentById(id);
      
      if (!assignment) {
        return reply.code(404).send({ error: 'Assignment not found' });
      }
      
    return reply.send(assignment);
  } catch (error: any) {
    return reply.code(500).send({ error: error.message });
  }
};

export const getEligibleResources = async (request: GetEligibleResourcesRequest, reply: FastifyReply) => {
  try {
    const { incidentType } = request.params;
      const resources = await assignmentService.getEligibleResources(incidentType as any);
      
    return reply.send(resources);
  } catch (error: any) {
    return reply.code(500).send({ error: error.message });
  }
};