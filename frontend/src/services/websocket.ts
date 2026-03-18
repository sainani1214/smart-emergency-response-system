import { io, Socket } from 'socket.io-client';
import { WEBSOCKET_URL } from '../constants/theme';
import { Incident, Resource, Assignment } from '../types';

export enum SocketEvent {
  INCIDENT_CREATED = 'incident:created',
  INCIDENT_UPDATED = 'incident:updated',
  INCIDENT_ESCALATED = 'incident:escalated',
  RESOURCE_UPDATED = 'resource:updated',
  RESOURCE_LOCATION_CHANGED = 'resource:location',
  ASSIGNMENT_CREATED = 'assignment:created',
  ASSIGNMENT_UPDATED = 'assignment:updated',
}

type EventCallback<T = any> = (data: T) => void;

class WebSocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<EventCallback>> = new Map();

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        resolve();
        return;
      }

      this.socket = io(WEBSOCKET_URL, {
        transports: ['websocket'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
      });

      this.socket.on('connect', () => {
        console.log('WebSocket connected:', this.socket?.id);
        this.socket?.emit('join', 'incidents');
        this.socket?.emit('join', 'resources');
        this.socket?.emit('join', 'assignments');
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
        reject(error);
      });

      this.socket.on('disconnect', (reason) => {
        console.log('WebSocket disconnected:', reason);
      });

      // Set up event listeners
      Object.values(SocketEvent).forEach((event) => {
        this.socket?.on(event, (data) => {
          this.notifyListeners(event, data);
        });
      });
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.listeners.clear();
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  on<T = any>(event: SocketEvent, callback: EventCallback<T>) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off<T = any>(event: SocketEvent, callback: EventCallback<T>) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(callback);
    }
  }

  private notifyListeners(event: string, data: any) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach((callback) => callback(data));
    }
  }

  // Helper methods for specific events
  onIncidentCreated(callback: EventCallback<Incident>) {
    this.on(SocketEvent.INCIDENT_CREATED, callback);
  }

  onIncidentUpdated(callback: EventCallback<Incident>) {
    this.on(SocketEvent.INCIDENT_UPDATED, callback);
  }

  onIncidentEscalated(callback: EventCallback<Incident>) {
    this.on(SocketEvent.INCIDENT_ESCALATED, callback);
  }

  onResourceUpdated(callback: EventCallback<Resource>) {
    this.on(SocketEvent.RESOURCE_UPDATED, callback);
  }

  onResourceLocationChanged(callback: EventCallback<Resource>) {
    this.on(SocketEvent.RESOURCE_LOCATION_CHANGED, callback);
  }

  onAssignmentCreated(callback: EventCallback<Assignment>) {
    this.on(SocketEvent.ASSIGNMENT_CREATED, callback);
  }

  onAssignmentUpdated(callback: EventCallback<Assignment>) {
    this.on(SocketEvent.ASSIGNMENT_UPDATED, callback);
  }
}

export default new WebSocketService();
