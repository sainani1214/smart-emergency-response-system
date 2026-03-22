import { FastifyPluginAsync } from 'fastify';
import {
  createIncident,
  getIncidents,
  getActiveIncidents,
  getMyIncidents,
  getNearbyIncidents,
  getIncidentById,
  getIncidentTracking,
  startRealtimeTracking,
  getTrackingStatus,
  updateIncidentStatus,
  getStatistics,
  assignResource
} from './incident.controller';
import { IncidentSchemas } from '../../schemas';
import { authenticate } from '../../middleware/auth.middleware';

const incidentRoutes: FastifyPluginAsync = async (app) => {
  // POST routes
  app.post('/incidents', { preHandler: [authenticate], schema: IncidentSchemas.createIncidentSchema }, createIncident as any);
  
  // GET routes - IMPORTANT: specific paths must come before dynamic :id routes
  app.get('/incidents', { schema: IncidentSchemas.getIncidentsSchema }, getIncidents);
  app.get('/incidents/nearby', getNearbyIncidents);
  app.get('/incidents/active', getActiveIncidents);
  app.get('/incidents/statistics', getStatistics);
  app.get('/incidents/my/all', { preHandler: [authenticate] }, getMyIncidents);
  app.get('/incidents/:id/tracking', { preHandler: [authenticate] }, getIncidentTracking as any);
  app.get('/incidents/:id/tracking/status', getTrackingStatus as any);
  app.get('/incidents/:id', { schema: IncidentSchemas.getIncidentByIdSchema }, getIncidentById);
  
  // POST routes for tracking
  app.post('/incidents/:id/tracking/start', startRealtimeTracking as any);
  
  // PATCH routes
  app.patch('/incidents/:id/status', { schema: IncidentSchemas.updateIncidentStatusSchema }, updateIncidentStatus as any);
  app.patch('/incidents/:id/assign', { schema: IncidentSchemas.assignResourceSchema }, assignResource as any);
};

export default incidentRoutes;