import fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { config } from './config';
import socketService from './services/socket.service';
import incidentRoutes from './modules/incident/incident.routes';
import resourceRoutes from './modules/resource/resource.routes';
import assignmentRoutes from './modules/assignment/assignment.routes';
import notificationRoutes from './modules/notification/notification.routes';
import simulationRoutes from './modules/simulation/simulation.routes';
import { authRoutes } from './modules/auth/auth.routes';

export async function buildApp(): Promise<FastifyInstance> {
  const app = fastify({
    logger: {
      level: config.nodeEnv === 'development' ? 'info' : 'warn'
    }
  });

  await app.register(cors, {
    origin: config.cors.origin,
    credentials: config.cors.credentials
  });

  // Authentication routes
  await app.register(authRoutes, { prefix: '/api/auth' });

  await app.register(incidentRoutes, { prefix: '/api' });
  await app.register(resourceRoutes, { prefix: '/api' });
  await app.register(assignmentRoutes, { prefix: '/api' });
  await app.register(notificationRoutes, { prefix: '/api' });
  await app.register(simulationRoutes, { prefix: '/api' });

  app.get('/health', async () => {
    return { 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      environment: config.nodeEnv
    };
  });

  (app as any).socketService = socketService;

  return app;
}
