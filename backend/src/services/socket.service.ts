import { Server as SocketServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';

export enum SocketEvent {
  // Incident events
  INCIDENT_CREATED = 'incident:created',
  INCIDENT_UPDATED = 'incident:updated',
  INCIDENT_ASSIGNED = 'incident:assigned',
  INCIDENT_STATUS_CHANGED = 'incident:status_changed',
  INCIDENT_ESCALATED = 'incident:escalated',
  INCIDENT_RESOLVED = 'incident:resolved',

  // Resource events
  RESOURCE_CREATED = 'resource:created',
  RESOURCE_UPDATED = 'resource:updated',
  RESOURCE_STATUS_CHANGED = 'resource:status_changed',
  RESOURCE_LOCATION_UPDATED = 'resource:location_updated',
  RESOURCE_ASSIGNED = 'resource:assigned',

  // Assignment events
  ASSIGNMENT_CREATED = 'assignment:created',
  ASSIGNMENT_ACCEPTED = 'assignment:accepted',
  ASSIGNMENT_STARTED = 'assignment:started',
  ASSIGNMENT_COMPLETED = 'assignment:completed',
  ASSIGNMENT_CANCELLED = 'assignment:cancelled',

  // Tracking events
  TRACKING_POSITION_UPDATE = 'tracking:position_update',
  TRACKING_STARTED = 'tracking:started',
  TRACKING_STOPPED = 'tracking:stopped',

  // Notification events
  NOTIFICATION = 'notification',
  
  // Alert events
  ALERT = 'alert',
  SYSTEM_MESSAGE = 'system:message',

  // Connection events
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  SUBSCRIBE = 'subscribe',
  UNSUBSCRIBE = 'unsubscribe'
}

export enum SocketRoom {
  ALL_OPERATORS = 'operators',
  ALL_RESPONDERS = 'responders',
  RESOURCE_PREFIX = 'resource:',
  INCIDENT_PREFIX = 'incident:'
}

export class SocketService {
  private io: SocketServer | null = null;
  private connectedClients: Map<string, Socket> = new Map();

  /**
   * Initialize Socket.io server
   */
  initialize(httpServer: HttpServer): void {
    this.io = new SocketServer(httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      },
      transports: ['websocket', 'polling']
    });

    this.setupEventHandlers();
    console.log('Socket.io initialized');
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    if (!this.io) return;

    this.io.on(SocketEvent.CONNECT, (socket: Socket) => {
      console.log(`Client connected: ${socket.id}`);
      this.connectedClients.set(socket.id, socket);

      // Handle subscription
      socket.on(SocketEvent.SUBSCRIBE, (room: string) => {
        socket.join(room);
        console.log(`Client ${socket.id} subscribed to ${room}`);
      });

      // Handle unsubscription
      socket.on(SocketEvent.UNSUBSCRIBE, (room: string) => {
        socket.leave(room);
        console.log(`Client ${socket.id} unsubscribed from ${room}`);
      });

      // Handle disconnection
      socket.on(SocketEvent.DISCONNECT, () => {
        console.log(`Client disconnected: ${socket.id}`);
        this.connectedClients.delete(socket.id);
      });
    });
  }

  /**
   * Emit event to all clients
   */
  emitToAll(event: SocketEvent, data: any): void {
    if (!this.io) return;
    this.io.emit(event, data);
  }

  /**
   * Emit event to specific room
   */
  emitToRoom(room: string, event: SocketEvent, data: any): void {
    if (!this.io) return;
    this.io.to(room).emit(event, data);
  }

  /**
   * Emit event to specific socket
   */
  emitToSocket(socketId: string, event: SocketEvent, data: any): void {
    const socket = this.connectedClients.get(socketId);
    if (socket) {
      socket.emit(event, data);
    }
  }

  /**
   * Emit incident created event
   */
  emitIncidentCreated(incident: any): void {
    this.emitToRoom(SocketRoom.ALL_OPERATORS, SocketEvent.INCIDENT_CREATED, incident);
  }

  /**
   * Emit incident updated event
   */
  emitIncidentUpdated(incident: any): void {
    this.emitToAll(SocketEvent.INCIDENT_UPDATED, incident);
    this.emitToRoom(`${SocketRoom.INCIDENT_PREFIX}${incident._id}`, SocketEvent.INCIDENT_UPDATED, incident);
  }

  /**
   * Emit incident assigned event
   */
  emitIncidentAssigned(incident: any, resource: any, assignment: any): void {
    this.emitToAll(SocketEvent.INCIDENT_ASSIGNED, {
      incident,
      resource,
      assignment
    });

    // Notify the specific resource
    this.emitToRoom(`${SocketRoom.RESOURCE_PREFIX}${resource.unit_id}`, SocketEvent.RESOURCE_ASSIGNED, {
      incident,
      assignment
    });
  }

  /**
   * Emit incident escalated event
   */
  emitIncidentEscalated(incident: any, escalation: any): void {
    this.emitToRoom(SocketRoom.ALL_OPERATORS, SocketEvent.INCIDENT_ESCALATED, {
      incident,
      escalation
    });
  }

  /**
   * Emit resource status changed event
   */
  emitResourceStatusChanged(resource: any): void {
    this.emitToAll(SocketEvent.RESOURCE_STATUS_CHANGED, resource);
  }

  /**
   * Emit resource location updated event
   */
  emitResourceLocationUpdated(resource: any): void {
    this.emitToAll(SocketEvent.RESOURCE_LOCATION_UPDATED, resource);
  }

  /**
   * Emit assignment status changed event
   */
  emitAssignmentStatusChanged(assignment: any): void {
    this.emitToAll(SocketEvent.ASSIGNMENT_CREATED, assignment);
  }

  /**
   * Send notification to specific user/resource
   */
  emitNotification(recipient: string, notification: any): void {
    this.emitToRoom(`${SocketRoom.RESOURCE_PREFIX}${recipient}`, SocketEvent.NOTIFICATION, notification);
  }

  /**
   * Send alert to all operators
   */
  emitAlert(alert: any): void {
    this.emitToRoom(SocketRoom.ALL_OPERATORS, SocketEvent.ALERT, alert);
  }

  /**
   * Send system message
   */
  emitSystemMessage(message: string): void {
    this.emitToAll(SocketEvent.SYSTEM_MESSAGE, { message, timestamp: new Date() });
  }

  /**
   * Get connected clients count
   */
  getConnectedClientsCount(): number {
    return this.connectedClients.size;
  }

  /**
   * Get Socket.io server instance
   */
  getIO(): SocketServer | null {
    return this.io;
  }
}

export default new SocketService();
