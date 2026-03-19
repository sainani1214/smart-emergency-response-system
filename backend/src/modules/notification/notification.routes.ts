import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import notificationService from './notification.service';

export default async function notificationRoutes(fastify: FastifyInstance) {
  // Get all notifications
  fastify.get('/notifications', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = request.query as any;
      const notifications = await notificationService.getNotifications(
        query.recipient || 'system',
        {
          limit: query.limit ? parseInt(query.limit) : 50
        }
      );
      
      return reply.send({ notifications, total: notifications.length });
    } catch (error: any) {
      return reply.code(500).send({ error: error.message });
    }
  });

  // Get unread notification count
  fastify.get('/notifications/unread-count', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = request.query as any;
      const count = await notificationService.getUnreadCount(query.recipient || 'system');
      
      return reply.send({ count });
    } catch (error: any) {
      return reply.code(500).send({ error: error.message });
    }
  });

  // Mark notification as read
  fastify.patch('/notifications/:id/read', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      await notificationService.markAsRead(id);
      
      return reply.send({ success: true });
    } catch (error: any) {
      return reply.code(500).send({ error: error.message });
    }
  });

  // Mark all notifications as read
  fastify.patch('/notifications/mark-all-read', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = request.query as any;
      await notificationService.markAllAsRead(query.recipient || 'system');
      
      return reply.send({ success: true });
    } catch (error: any) {
      return reply.code(500).send({ error: error.message });
    }
  });
}