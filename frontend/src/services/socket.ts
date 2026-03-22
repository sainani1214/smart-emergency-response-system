import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '../constants/theme';

const SOCKET_URL = API_BASE_URL.replace('/api', '');

class AppSocketService {
  private socket: Socket | null = null;

  connect() {
    if (this.socket?.connected) {
      return this.socket;
    }

    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
    });

    return this.socket;
  }

  subscribe(room: string) {
    this.socket?.emit('subscribe', room);
  }

  unsubscribe(room: string) {
    this.socket?.emit('unsubscribe', room);
  }

  on(event: string, handler: (...args: any[]) => void) {
    this.socket?.on(event, handler);
  }

  off(event: string, handler?: (...args: any[]) => void) {
    this.socket?.off(event, handler);
  }
}

export const socketService = new AppSocketService();