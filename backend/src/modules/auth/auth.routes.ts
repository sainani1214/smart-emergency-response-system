import { FastifyInstance } from 'fastify';
import { authController } from './auth.controller';
import { authenticate } from '../../middleware/auth.middleware';

export async function authRoutes(app: FastifyInstance) {
  // Public routes (no auth required)
  app.post('/register/user', authController.registerUser.bind(authController));
  app.post('/register/responder', authController.registerResponder.bind(authController));
  app.post('/login', authController.login.bind(authController));

  // Protected routes (auth required)
  app.get('/me', {
    preHandler: [authenticate],
    handler: authController.getProfile.bind(authController),
  });

  app.patch('/profile', {
    preHandler: [authenticate],
    handler: authController.updateProfile.bind(authController),
  });
}
