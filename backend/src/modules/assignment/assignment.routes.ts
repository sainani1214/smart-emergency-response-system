import { FastifyPluginAsync } from 'fastify';
import {
  triggerSmartAssignment,
  createAssignment,
  getAssignments,
  updateAssignmentStatus,
  getAssignmentById,
  getEligibleResources
} from './assignment.controller';
import { AssignmentSchemas } from '../../schemas';

const assignmentRoutes: FastifyPluginAsync = async (app) => {
  app.post('/assignments/match', { schema: AssignmentSchemas.triggerSmartAssignmentSchema }, triggerSmartAssignment as any);
  app.post('/assignments', { schema: AssignmentSchemas.createAssignmentSchema }, createAssignment as any);
  app.get('/assignments', { schema: AssignmentSchemas.getAssignmentsSchema }, getAssignments);
  app.get('/assignments/:id', getAssignmentById);
  app.patch('/assignments/:id/status', { schema: AssignmentSchemas.updateAssignmentStatusSchema }, updateAssignmentStatus as any);
  app.get('/assignments/resources/eligible/:incidentType', getEligibleResources);
};

export default assignmentRoutes;