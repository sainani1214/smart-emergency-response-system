import { FastifyRequest, FastifyReply } from 'fastify';
import { authService } from './auth.service';
import type { RegisterUserDTO, RegisterResponderDTO, LoginDTO, UpdateProfileDTO } from './auth.types';
import type { AuthenticatedRequest } from '../../middleware/auth.middleware';

export class AuthController {
  /**
   * POST /api/auth/register/user
   */
  async registerUser(request: FastifyRequest, reply: FastifyReply) {
    const data = request.body as RegisterUserDTO;
    const result = await authService.registerUser(data);

    if (result.success) {
      return reply.status(201).send(result);
    } else {
      return reply.status(400).send(result);
    }
  }

  /**
   * POST /api/auth/register/responder
   */
  async registerResponder(request: FastifyRequest, reply: FastifyReply) {
    const data = request.body as RegisterResponderDTO;
    const result = await authService.registerResponder(data);

    if (result.success) {
      return reply.status(201).send(result);
    } else {
      return reply.status(400).send(result);
    }
  }

  /**
   * POST /api/auth/login
   */
  async login(request: FastifyRequest, reply: FastifyReply) {
    const data = request.body as LoginDTO;
    const result = await authService.login(data);

    if (result.success) {
      return reply.status(200).send(result);
    } else {
      return reply.status(401).send(result);
    }
  }

  /**
   * GET /api/auth/me
   */
  async getProfile(request: AuthenticatedRequest, reply: FastifyReply) {
    if (!request.user) {
      return reply.status(401).send({
        success: false,
        error: 'Not authenticated',
      });
    }

    const result = await authService.getProfile(request.user.userId, request.user.role);

    if (result.success) {
      return reply.status(200).send(result);
    } else {
      return reply.status(400).send(result);
    }
  }

  /**
   * PATCH /api/auth/profile
   */
  async updateProfile(request: AuthenticatedRequest, reply: FastifyReply) {
    if (!request.user) {
      return reply.status(401).send({
        success: false,
        error: 'Not authenticated',
      });
    }

    const data = request.body as UpdateProfileDTO;
    const result = await authService.updateProfile(
      request.user.userId,
      request.user.role,
      data
    );

    if (result.success) {
      return reply.status(200).send(result);
    } else {
      return reply.status(400).send(result);
    }
  }
}

export const authController = new AuthController();
