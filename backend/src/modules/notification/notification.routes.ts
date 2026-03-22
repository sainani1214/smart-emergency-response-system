import { FastifyPluginAsync } from 'fastify';
import {
  createNotification,
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification
} from './notification.controller';
import { NotificationSchemas } from '../../schemas';

const notificationRoutes: FastifyPluginAsync = async (app) => {
  app.post('/notifications', { schema: NotificationSchemas.createNotificationSchema }, createNotification);
  app.get('/notifications', { schema: NotificationSchemas.getNotificationsSchema }, getNotifications);
  app.patch('/notifications/:id/read', { schema: NotificationSchemas.markNotificationReadSchema }, markNotificationAsRead);
  app.patch('/notifications/read-all', { schema: NotificationSchemas.markAllNotificationsReadSchema }, markAllNotificationsAsRead);
  app.delete('/notifications/:id', deleteNotification);
};

export default notificationRoutes;