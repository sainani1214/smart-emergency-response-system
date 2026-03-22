import { FastifyRequest, FastifyReply } from 'fastify';
import { verifyToken } from '../utils/auth';
import { User } from '../models/User';
import { Responder } from '../models/Responder';

export interface AuthenticatedRequest extends FastifyRequest {
  user?: {
    userId: string;
    role: 'user' | 'responder';
    email: string;
  };
}

/**
 * Middleware to authenticate JWT token
 */
export const authenticate = async (
  request: AuthenticatedRequest,
  reply: FastifyReply
) => {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({
        success: false,
        error: 'No token provided. Please include Authorization: Bearer <token> header',
      });
    }

    const token = authHeader.substring(7); 

    // Verify token
    const payload = verifyToken(token);

    // Check if user exists and is active
    if (payload.role === 'user') {
      const user = await User.findOne({ user_id: payload.userId, is_active: true });
      if (!user) {
        return reply.status(401).send({
          success: false,
          error: 'User not found or inactive',
        });
      }
    } else if (payload.role === 'responder') {
      const responder = await Responder.findOne({ responder_id: payload.userId, is_active: true });
      if (!responder) {
        return reply.status(401).send({
          success: false,
          error: 'Responder not found or inactive',
        });
      }
    }

    // Attach user info to request
    request.user = payload;

  } catch (error: any) {
    return reply.status(401).send({
      success: false,
      error: error.message || 'Invalid token',
    });
  }
};

/**
 * Middleware to check if user is a responder
 */
export const requireResponder = async (
  request: AuthenticatedRequest,
  reply: FastifyReply
) => {
  if (!request.user) {
    return reply.status(401).send({
      success: false,
      error: 'Not authenticated',
    });
  }

  if (request.user.role !== 'responder') {
    return reply.status(403).send({
      success: false,
      error: 'Access denied. Responders only.',
    });
  }
};

/**
 * Middleware to check if user is a citizen (regular user)
 */
export const requireUser = async (
  request: AuthenticatedRequest,
  reply: FastifyReply
) => {
  if (!request.user) {
    return reply.status(401).send({
      success: false,
      error: 'Not authenticated',
    });
  }

  if (request.user.role !== 'user') {
    return reply.status(403).send({
      success: false,
      error: 'Access denied. Users only.',
    });
  }
};
