import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { config } from './config';
import socketService from './services/socket.service';
import incidentRoutes from './modules/incident/incident.routes';
import resourceRoutes from './modules/resource/resource.routes';
import assignmentRoutes from './modules/assignment/assignment.routes';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: config.nodeEnv === 'development' ? 'info' : 'warn'
    }
  });

  // Register CORS
  await app.register(cors, {
    origin: config.cors.origin,
    credentials: config.cors.credentials
  });

  // Health check endpoint
  app.get('/health', async () => {
    return { 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      environment: config.nodeEnv
    };
  });

  // API Routes
  app.register(incidentRoutes, { prefix: '/api' });
  app.register(resourceRoutes, { prefix: '/api' });
  app.register(assignmentRoutes, { prefix: '/api' });

  // Attach socket service to fastify instance for route access
  (app as any).socketService = socketService;

  return app;
}
