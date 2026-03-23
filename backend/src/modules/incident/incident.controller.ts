import { FastifyRequest, FastifyReply } from 'fastify';
import incidentService from './incident.service';
import incidentTrackingService from './incident-tracking.service';
import realtimeTrackingService from './realtime-tracking.service';
import assignmentService from '../assignment/assignment.service';
import resourceService from '../resource/resource.service';
import notificationService from '../notification/notification.service';
import { IncidentStatus } from '../../models';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import {
  CreateIncidentRequest,
  GetIncidentsRequest,
  GetIncidentByIdRequest,
  UpdateIncidentStatusRequest,
  AssignResourceRequest
} from './incident.types';

export const createIncident = async (request: CreateIncidentRequest & AuthenticatedRequest, reply: FastifyReply) => {
  try {
    const data = request.body;
    
    // Add authenticated user ID to reporter if available
    if (request.user && request.user.role === 'user') {
      data.reporter = {
        ...data.reporter,
        user_id: request.user.userId
      };
    }
    
    const incident = await incidentService.createIncident(data);
    
    await notificationService.notifyIncidentCreated(
      incident._id.toString(),
      incident,
      ['dispatch']
    );

    await notificationService.notifyUserIncidentUpdate(incident, {
      type: 'incident_created' as any,
      title: 'Emergency report submitted',
      message: `Your report ${incident.incident_id} has been created and is being processed.`,
      priority: incident.severity === 'critical' ? 'urgent' as any : 'high' as any,
      data: {
        status: incident.status,
      },
    });
    
    const socketService = (request.server as any).socketService;
    if (socketService) {
      socketService.emitIncidentCreated(incident);
    }

    try {
      console.log(`[CreateIncident] Attempting auto-assignment for incident ${incident.incident_id}`);
      const match = await assignmentService.findBestResource(incident);
      if (match) {
        console.log(`[CreateIncident] Found match: ${match.resource.unit_id}, ETA: ${match.eta}min`);
        const assignment = await assignmentService.createAssignment(
          incident._id.toString(),
          match.resource._id.toString(),
          match.distance,
          match.eta,
          match.score
        );
        
        await incidentService.assignResource(incident.incident_id, match.resource._id.toString());
        await resourceService.assignToIncident(match.resource._id.toString(), incident._id.toString());
        
        await notificationService.notifyResourceAssigned(
          match.resource._id.toString(),
          incident,
          { eta: match.eta, distance: match.distance }
        );

        await notificationService.notifyUserIncidentUpdate(incident, {
          type: 'incident_assigned' as any,
          title: 'Responder assigned',
          message: `${match.resource.unit_id} has been assigned to ${incident.incident_id}. ETA: ${match.eta} min.`,
          priority: 'high' as any,
          data: {
            eta: match.eta,
            distance: match.distance,
            resourceUnitId: match.resource.unit_id,
            resourceType: match.resource.type,
          },
        });
        
        if (socketService) {
          socketService.emitIncidentAssigned(incident, match.resource, assignment);
        }

        // Start real-time tracking simulation
        console.log(`[CreateIncident] Scheduling tracking start for incident ${incident.incident_id}`);
        setTimeout(() => {
          console.log(`[CreateIncident] Starting tracking for incident ${incident.incident_id}`);
          realtimeTrackingService.startTracking(incident.incident_id).catch((err) => {
            console.error('[CreateIncident] Failed to start tracking:', err);
          });
        }, 1000);
      } else {
        console.log(`[CreateIncident] No match found for incident ${incident.incident_id}`);
      }
    } catch (assignmentError) {
      console.log('Auto-assignment failed:', assignmentError);
    }
    
    return reply.code(201).send(incident);
  } catch (error: any) {
    return reply.code(500).send({ error: error.message });
  }
};

export const getIncidents = async (request: GetIncidentsRequest, reply: FastifyReply) => {
  try {
    const query = request.query;
    const incidents = await incidentService.getIncidents({
      limit: query.limit ? parseInt(query.limit) : 50,
      skip: query.skip ? parseInt(query.skip) : 0,
      status: query.status as any,
      type: query.type as any,
      severity: query.severity as any
    });
    
    return reply.send(incidents);
  } catch (error: any) {
    return reply.code(500).send({ error: error.message });
  }
};

export const getActiveIncidents = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const incidents = await incidentService.getActiveIncidents();
    return reply.send(incidents);
  } catch (error: any) {
    return reply.code(500).send({ error: error.message });
  }
};

export const getMyIncidents = async (request: AuthenticatedRequest, reply: FastifyReply) => {
  try {
    if (!request.user) {
      return reply.code(401).send({ error: 'Not authenticated' });
    }

    const incidents = await incidentService.getIncidentsByUserWithAssignments(request.user.userId);
    return reply.send(incidents);
  } catch (error: any) {
    return reply.code(500).send({ error: error.message });
  }
};

export const getIncidentById = async (request: GetIncidentByIdRequest, reply: FastifyReply) => {
  try {
    const { id } = request.params;
    const incident = await incidentService.getIncidentWithAssignmentDetails(id);
    
    if (!incident) {
      return reply.code(404).send({ error: 'Incident not found' });
    }
    
    return reply.send(incident);
  } catch (error: any) {
    return reply.code(500).send({ error: error.message });
  }
};

export const getIncidentTracking = async (request: GetIncidentByIdRequest, reply: FastifyReply) => {
  try {
    const { id } = request.params;
    console.log(`[Controller] Getting tracking for incident: ${id}`);
    
    const tracking = await incidentTrackingService.getTrackingByIncidentId(id);

    if (!tracking) {
      console.log(`[Controller] No tracking data found for incident: ${id}`);
      return reply.code(404).send({ error: 'Incident not found' });
    }

    console.log(`[Controller] Returning tracking data for ${id}, status: ${tracking.status}`);
    return reply.send(tracking);
  } catch (error: any) {
    console.error(`[Controller] Error getting tracking:`, error);
    return reply.code(500).send({ error: error.message });
  }
};

export const getNearbyIncidents = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const query = request.query as {
      lat?: string;
      lng?: string;
      radiusKm?: string;
    };

    if (!query.lat || !query.lng) {
      return reply.code(400).send({ error: 'lat and lng are required' });
    }

    const incidents = await incidentService.getNearbyIncidentsWithAssignments(
      Number(query.lat),
      Number(query.lng),
      query.radiusKm ? Number(query.radiusKm) : 10
    );

    return reply.send(incidents);
  } catch (error: any) {
    return reply.code(500).send({ error: error.message });
  }
};

export const updateIncidentStatus = async (request: UpdateIncidentStatusRequest, reply: FastifyReply) => {
  try {
    const { id } = request.params;
    const { status } = request.body;
    
    const incident = await incidentService.updateIncidentStatus(id, status as IncidentStatus);
    
    if (!incident) {
      return reply.code(404).send({ error: 'Incident not found' });
    }

    const socketService = (request.server as any).socketService;
    if (socketService) {
      socketService.emitIncidentUpdated(incident);
    }
    
    return reply.send(incident);
  } catch (error: any) {
    return reply.code(500).send({ error: error.message });
  }
};

export const getStatistics = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const stats = await incidentService.getStatistics();
    return reply.send(stats);
  } catch (error: any) {
    return reply.code(500).send({ error: error.message });
  }
};

export const assignResource = async (request: AssignResourceRequest, reply: FastifyReply) => {
  try {
    const { id } = request.params;
    const { resourceId } = request.body;
    
    const incident = await incidentService.assignResource(id, resourceId);
    
    if (!incident) {
      return reply.code(404).send({ error: 'Incident not found' });
    }
    
    await resourceService.assignToIncident(resourceId, incident._id.toString());
    
    const socketService = (request.server as any).socketService;
    if (socketService) {
      socketService.emitIncidentUpdated(incident);
    }
    
    return reply.send(incident);
  } catch (error: any) {
    return reply.code(500).send({ error: error.message });
  }
};

export const startRealtimeTracking = async (request: GetIncidentByIdRequest, reply: FastifyReply) => {
  try {
    const { id } = request.params;
    console.log(`[Controller] Manual start tracking requested for incident: ${id}`);
    
    const success = await realtimeTrackingService.startTracking(id);
    
    if (!success) {
      console.log(`[Controller] Failed to start tracking for ${id}`);
      return reply.code(400).send({ 
        error: 'Unable to start tracking',
        message: 'Incident may not have an assigned responder yet' 
      });
    }

    console.log(`[Controller] Successfully started tracking for ${id}`);
    return reply.send({ 
      success: true,
      message: 'Realtime tracking started',
      incidentId: id 
    });
  } catch (error: any) {
    console.error(`[Controller] Error starting tracking:`, error);
    return reply.code(500).send({ error: error.message });
  }
};

export const getTrackingStatus = async (request: GetIncidentByIdRequest, reply: FastifyReply) => {
  try {
    const { id } = request.params;
    const status = realtimeTrackingService.getTrackingStatus(id);
    const activeTrackings = realtimeTrackingService.getActiveTrackings();
    
    return reply.send({
      incidentId: id,
      ...status,
      allActiveTrackings: activeTrackings,
    });
  } catch (error: any) {
    return reply.code(500).send({ error: error.message });
  }
};