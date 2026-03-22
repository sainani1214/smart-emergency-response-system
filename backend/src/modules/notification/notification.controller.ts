import { FastifyRequest, FastifyReply } from 'fastify';
import notificationService from './notification.service';
import {
  GetNotificationsRequest,
  MarkNotificationAsReadRequest,
  MarkAllNotificationsAsReadRequest,
  DeleteNotificationRequest
} from './notification.types';

export const createNotification = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    return reply.code(501).send({ error: 'Not implemented' });
  } catch (error: any) {
    return reply.code(500).send({ error: error.message });
  }
};

export const getNotifications = async (request: GetNotificationsRequest, reply: FastifyReply) => {
  try {
    const query = request.query;
    const notifications = await notificationService.getNotifications({
      recipient: query.recipient,
      type: query.type as any,
      channel: query.channel as any,
      priority: query.priority as any,
      status: query.status as any,
      unread: query.unread ? query.unread === 'true' : undefined,
      limit: query.limit ? parseInt(query.limit) : 50,
      skip: query.skip ? parseInt(query.skip) : 0
    });
    
    return reply.send(notifications);
  } catch (error: any) {
    return reply.code(500).send({ error: error.message });
  }
};

export const markNotificationAsRead = async (request: MarkNotificationAsReadRequest, reply: FastifyReply) => {
  try {
    const { id } = request.params;
    const notification = await notificationService.markAsRead(id);
    
    if (!notification) {
      return reply.code(404).send({ error: 'Notification not found' });
    }
    
    return reply.send(notification);
  } catch (error: any) {
    return reply.code(500).send({ error: error.message });
  }
};

export const markAllNotificationsAsRead = async (request: MarkAllNotificationsAsReadRequest, reply: FastifyReply) => {
  try {
    const { recipient } = request.query;
    if (!recipient) {
      return reply.code(400).send({ error: 'Recipient is required' });
    }
    
    await notificationService.markAllAsRead(recipient);
    return reply.send({ success: true });
  } catch (error: any) {
    return reply.code(500).send({ error: error.message });
  }
};

export const deleteNotification = async (request: DeleteNotificationRequest, reply: FastifyReply) => {
  try {
    const { id } = request.params;
    const notification = await notificationService.deleteNotification(id);
    
    if (!notification) {
      return reply.code(404).send({ error: 'Notification not found' });
    }
    
    return reply.send({ success: true });
  } catch (error: any) {
    return reply.code(500).send({ error: error.message });
  }
};