import { 
  Notification, 
  INotification, 
  NotificationType, 
  NotificationChannel, 
  NotificationPriority,
  NotificationStatus 
} from '../../models';

interface NotificationPayload {
  type: NotificationType;
  recipient: string;
  channel: NotificationChannel;
  priority: NotificationPriority;
  title: string;
  message: string;
  data?: Record<string, any>;
  related_incident?: string;
  related_resource?: string;
}

export class NotificationService {
  /**
   * Send notification
   */
  async sendNotification(payload: NotificationPayload): Promise<INotification> {
    const notification = new Notification({
      type: payload.type,
      recipient: payload.recipient,
      channel: payload.channel,
      priority: payload.priority,
      title: payload.title,
      message: payload.message,
      data: payload.data,
      status: NotificationStatus.PENDING,
      related_incident: payload.related_incident,
      related_resource: payload.related_resource
    });

    await notification.save();

    // Simulate sending (in real app, integrate with push service/SMS/email)
    await this.deliverNotification(notification);

    return notification;
  }

  /**
   * Deliver notification via appropriate channel
   */
  private async deliverNotification(notification: INotification): Promise<void> {
    try {
      // Simulate delivery based on channel
      switch (notification.channel) {
        case NotificationChannel.PUSH:
          await this.sendPushNotification(notification);
          break;
        case NotificationChannel.SMS:
          await this.sendSMS(notification);
          break;
        case NotificationChannel.EMAIL:
          await this.sendEmail(notification);
          break;
        case NotificationChannel.IN_APP:
          await this.sendInAppNotification(notification);
          break;
      }

      notification.status = NotificationStatus.SENT;
      notification.sent_at = new Date();
      await notification.save();

      // Simulate delivery confirmation
      setTimeout(async () => {
        notification.status = NotificationStatus.DELIVERED;
        notification.delivered_at = new Date();
        await notification.save();
      }, 1000);

    } catch (error: any) {
      notification.status = NotificationStatus.FAILED;
      notification.error_message = error.message;
      notification.retry_count += 1;
      await notification.save();
    }
  }

  /**
   * Send push notification (stub)
   */
  private async sendPushNotification(notification: INotification): Promise<void> {
    // TODO: Integrate with Firebase Cloud Messaging or similar
    console.log(`[PUSH] To: ${notification.recipient}, Title: ${notification.title}`);
  }

  /**
   * Send SMS (stub)
   */
  private async sendSMS(notification: INotification): Promise<void> {
    // TODO: Integrate with Twilio or similar
    console.log(`[SMS] To: ${notification.recipient}, Message: ${notification.message}`);
  }

  /**
   * Send email (stub)
   */
  private async sendEmail(notification: INotification): Promise<void> {
    // TODO: Integrate with SendGrid or similar
    console.log(`[EMAIL] To: ${notification.recipient}, Subject: ${notification.title}`);
  }

  /**
   * Send in-app notification (WebSocket will handle this)
   */
  private async sendInAppNotification(notification: INotification): Promise<void> {
    console.log(`[IN-APP] To: ${notification.recipient}, Message: ${notification.message}`);
  }

  /**
   * Notify about new incident
   */
  async notifyIncidentCreated(
    incidentId: string,
    incidentData: any,
    recipients: string[]
  ): Promise<void> {
    const promises = recipients.map(recipient =>
      this.sendNotification({
        type: NotificationType.INCIDENT_CREATED,
        recipient,
        channel: NotificationChannel.IN_APP,
        priority: this.mapSeverityToPriority(incidentData.severity),
        title: `New ${incidentData.severity} ${incidentData.type} incident`,
        message: `Incident ${incidentData.incident_id}: ${incidentData.description}`,
        data: incidentData,
        related_incident: incidentId
      })
    );

    await Promise.all(promises);
  }

  /**
   * Notify about resource assignment
   */
  async notifyResourceAssigned(
    resourceId: string,
    incidentData: any,
    assignmentData: any
  ): Promise<void> {
    await this.sendNotification({
      type: NotificationType.RESOURCE_ASSIGNED,
      recipient: resourceId,
      channel: NotificationChannel.PUSH,
      priority: NotificationPriority.HIGH,
      title: 'New Assignment',
      message: `You have been assigned to ${incidentData.type} incident at ${incidentData.location.address || 'location'}. ETA: ${assignmentData.eta} mins`,
      data: {
        incident: incidentData,
        assignment: assignmentData
      },
      related_incident: incidentData._id,
      related_resource: resourceId
    });
  }

  /**
   * Notify about escalation
   */
  async notifyEscalation(
    incidentData: any,
    escalationData: any,
    supervisors: string[]
  ): Promise<void> {
    const promises = supervisors.map(supervisor =>
      this.sendNotification({
        type: NotificationType.INCIDENT_ESCALATED,
        recipient: supervisor,
        channel: NotificationChannel.PUSH,
        priority: NotificationPriority.URGENT,
        title: `Incident Escalated to Level ${escalationData.to_level}`,
        message: `${incidentData.incident_id}: ${escalationData.reason}`,
        data: {
          incident: incidentData,
          escalation: escalationData
        },
        related_incident: incidentData._id
      })
    );

    await Promise.all(promises);
  }

  /**
   * Notify about incident resolution
   */
  async notifyIncidentResolved(
    incidentData: any,
    recipients: string[]
  ): Promise<void> {
    const promises = recipients.map(recipient =>
      this.sendNotification({
        type: NotificationType.INCIDENT_RESOLVED,
        recipient,
        channel: NotificationChannel.IN_APP,
        priority: NotificationPriority.MEDIUM,
        title: 'Incident Resolved',
        message: `Incident ${incidentData.incident_id} has been resolved`,
        data: incidentData,
        related_incident: incidentData._id
      })
    );

    await Promise.all(promises);
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<INotification | null> {
    return Notification.findByIdAndUpdate(
      notificationId,
      {
        status: NotificationStatus.READ,
        read_at: new Date()
      },
      { new: true }
    ).exec();
  }

  /**
   * Get notifications for a user
   */
  async getNotifications(
    recipient: string,
    filters: {
      status?: NotificationStatus;
      unreadOnly?: boolean;
      limit?: number;
    } = {}
  ): Promise<INotification[]> {
    const query: any = { recipient };
    
    if (filters.status) {
      query.status = filters.status;
    }
    
    if (filters.unreadOnly) {
      query.status = { $ne: NotificationStatus.READ };
    }

    return Notification.find(query)
      .sort({ created_at: -1 })
      .limit(filters.limit || 50)
      .exec();
  }

  /**
   * Get unread count for a user
   */
  async getUnreadCount(recipient: string): Promise<number> {
    return Notification.countDocuments({
      recipient,
      status: { $ne: NotificationStatus.READ }
    });
  }

  /**
   * Map severity to notification priority
   */
  private mapSeverityToPriority(severity: string): NotificationPriority {
    const mapping: Record<string, NotificationPriority> = {
      low: NotificationPriority.LOW,
      medium: NotificationPriority.MEDIUM,
      high: NotificationPriority.HIGH,
      critical: NotificationPriority.URGENT
    };
    
    return mapping[severity] || NotificationPriority.MEDIUM;
  }

  /**
   * Retry failed notifications
   */
  async retryFailedNotifications(): Promise<void> {
    const failed = await Notification.find({
      status: NotificationStatus.FAILED,
      retry_count: { $lt: 3 }
    }).limit(10);

    for (const notification of failed) {
      await this.deliverNotification(notification);
    }
  }

  /**
   * Get notification statistics
   */
  async getStatistics(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byChannel: Record<string, number>;
    byType: Record<string, number>;
    failureRate: number;
  }> {
    const total = await Notification.countDocuments();

    const byStatus = await Notification.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const byChannel = await Notification.aggregate([
      { $group: { _id: '$channel', count: { $sum: 1 } } }
    ]);

    const byType = await Notification.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);

    const failed = await Notification.countDocuments({ status: NotificationStatus.FAILED });
    const failureRate = total > 0 ? (failed / total) * 100 : 0;

    return {
      total,
      byStatus: Object.fromEntries(byStatus.map((s: any) => [s._id, s.count])),
      byChannel: Object.fromEntries(byChannel.map((c: any) => [c._id, c.count])),
      byType: Object.fromEntries(byType.map((t: any) => [t._id, t.count])),
      failureRate: Math.round(failureRate * 100) / 100
    };
  }
}

export default new NotificationService();
