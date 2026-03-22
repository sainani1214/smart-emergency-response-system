import { FastifyInstance } from 'fastify';
import * as simulationController from './simulation.controller';

async function simulationRoutes(fastify: FastifyInstance) {
  fastify.register(async function (fastify) {
    fastify.post('/seed', simulationController.seedResponders);
    fastify.post('/emergency', simulationController.simulateEmergency);
    fastify.get('/status/:emergencyId', simulationController.getEmergencyStatus);
    fastify.get('/responders', simulationController.getAllResponders);
    fastify.post('/emergency/:emergencyId/respond', simulationController.respondToEmergency);
    fastify.delete('/clear', simulationController.clearSimulation);
  }, { prefix: '/simulate' });
}

export default simulationRoutes;