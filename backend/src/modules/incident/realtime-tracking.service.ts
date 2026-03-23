import { calculateDistance, calculateETA } from '../../utils/helpers';
import incidentTrackingService from './incident-tracking.service';
import incidentService from './incident.service';
import socketService from '../../services/socket.service';
import resourceService from '../resource/resource.service';

interface ActiveTracking {
  incidentId: string;
  interval: NodeJS.Timeout;
  startTime: number;
  duration: number; // in milliseconds
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  responderId: string;
  responderName: string;
  responderType: string;
}

export class RealtimeTrackingService {
  private activeTrackings: Map<string, ActiveTracking> = new Map();

  /**
   * Start real-time tracking for an incident
   * Duration: 2-8 minutes randomized
   */
  async startTracking(incidentId: string): Promise<boolean> {
    try {
      // Don't start if already tracking
      if (this.activeTrackings.has(incidentId)) {
        console.log(`[RealtimeTracking] Already tracking incident ${incidentId}`);
        return true;
      }

      const tracking = await incidentTrackingService.getTrackingByIncidentId(incidentId);
      if (!tracking || !tracking.assignedResponder) {
        console.log(`[RealtimeTracking] No assignment found for incident ${incidentId}`);
        return false;
      }

      // Randomize duration between 2-8 minutes
      const durationMinutes = 2 + Math.random() * 6; // 2-8 minutes
      const duration = durationMinutes * 60 * 1000;

      const startLat = tracking.assignedResponder.location.lat;
      const startLng = tracking.assignedResponder.location.lng;
      const endLat = tracking.userLocation.lat;
      const endLng = tracking.userLocation.lng;

      const activeTracking: ActiveTracking = {
        incidentId,
        interval: null as any,
        startTime: Date.now(),
        duration,
        startLat,
        startLng,
        endLat,
        endLng,
        responderId: tracking.assignedResponder.id,
        responderName: tracking.assignedResponder.name,
        responderType: tracking.assignedResponder.type,
      };

      // Emit position updates every 2-4 seconds
      const updateInterval = 2000 + Math.random() * 2000; // 2-4 seconds
      activeTracking.interval = setInterval(() => {
        this.emitPositionUpdate(incidentId);
      }, updateInterval);

      this.activeTrackings.set(incidentId, activeTracking);

      // Emit initial position
      this.emitPositionUpdate(incidentId);

      console.log(`[RealtimeTracking] Started tracking ${incidentId} for ${durationMinutes.toFixed(1)} minutes`);

      // Auto-stop after duration
      setTimeout(() => {
        this.stopTracking(incidentId, true);
      }, duration);

      return true;
    } catch (error) {
      console.error(`[RealtimeTracking] Error starting tracking for ${incidentId}:`, error);
      return false;
    }
  }

  /**
   * Stop tracking for an incident
   */
  stopTracking(incidentId: string, reachedDestination: boolean = false): void {
    const tracking = this.activeTrackings.get(incidentId);
    if (!tracking) {
      return;
    }

    clearInterval(tracking.interval);
    this.activeTrackings.delete(incidentId);

    if (reachedDestination) {
      // Emit final position at destination
      console.log(`[RealtimeTracking] Emitting position update for ${incidentId}: progress=1, eta=0min, status=arrived`);
      socketService.emitToRoom(`incident:${incidentId}`, 'tracking:position_update' as any, {
        incidentId,
        position: {
          lat: tracking.endLat,
          lng: tracking.endLng,
          timestamp: new Date().toISOString(),
        },
        responderId: tracking.responderId,
        responderName: tracking.responderName,
        responderType: tracking.responderType,
        progress: 1.0,
        distanceRemaining: 0,
        etaMinutes: 0,
        status: 'arrived',
      });
      socketService.emitToAll('tracking:position_update' as any, {
        incidentId,
        position: {
          lat: tracking.endLat,
          lng: tracking.endLng,
          timestamp: new Date().toISOString(),
        },
        responderId: tracking.responderId,
        responderName: tracking.responderName,
        responderType: tracking.responderType,
        progress: 1.0,
        distanceRemaining: 0,
        etaMinutes: 0,
        status: 'arrived',
      });

      // Update incident status to resolved/completed and release resource
      console.log(`[RealtimeTracking] Updating incident ${incidentId} to resolved status`);
      incidentService.updateIncidentStatus(incidentId, 'resolved' as any)
        .then(async (incident) => {
          if (incident?.assigned_resource) {
            console.log(`[RealtimeTracking] Releasing resource ${incident.assigned_resource}`);
            await resourceService.releaseFromIncident(incident.assigned_resource.toString());
          }
        })
        .catch(console.error);
    }

    console.log(`[RealtimeTracking] Stopped tracking ${incidentId}`);
  }

  /**
   * Emit position update for an incident
   */
  private emitPositionUpdate(incidentId: string): void {
    const tracking = this.activeTrackings.get(incidentId);
    if (!tracking) {
      return;
    }

    const elapsed = Date.now() - tracking.startTime;
    const progress = Math.min(1.0, elapsed / tracking.duration);

    // Interpolate position with slight randomness for realistic movement
    const baseLat = tracking.startLat + (tracking.endLat - tracking.startLat) * progress;
    const baseLng = tracking.startLng + (tracking.endLng - tracking.startLng) * progress;

    // Add small random offset (±0.0001 degrees ≈ ±10 meters) for natural movement
    const randomOffset = 0.0001;
    const lat = baseLat + (Math.random() - 0.5) * randomOffset;
    const lng = baseLng + (Math.random() - 0.5) * randomOffset;

    // Calculate remaining distance and ETA
    const distanceRemaining = calculateDistance(lat, lng, tracking.endLat, tracking.endLng);
    const etaMinutes = Math.ceil((tracking.duration - elapsed) / 60000);

    const update = {
      incidentId,
      position: {
        lat: Number(lat.toFixed(6)),
        lng: Number(lng.toFixed(6)),
        timestamp: new Date().toISOString(),
      },
      responderId: tracking.responderId,
      responderName: tracking.responderName,
      responderType: tracking.responderType,
      progress: Number(progress.toFixed(3)),
      distanceRemaining: Number(distanceRemaining.toFixed(2)),
      etaMinutes: Math.max(0, etaMinutes),
      status: progress < 1.0 ? 'en_route' : 'arriving',
    };

    // Emit to incident room and global
    console.log(`[RealtimeTracking] Emitting position update for ${incidentId}: progress=${update.progress}, eta=${update.etaMinutes}min, status=${update.status}`);
    socketService.emitToRoom(`incident:${incidentId}`, 'tracking:position_update' as any, update);
    socketService.emitToAll('tracking:position_update' as any, update);
  }

  /**
   * Get all active trackings
   */
  getActiveTrackings(): string[] {
    return Array.from(this.activeTrackings.keys());
  }

  /**
   * Get tracking status for an incident
   */
  getTrackingStatus(incidentId: string): {
    active: boolean;
    progress?: number;
    etaMinutes?: number;
  } {
    const tracking = this.activeTrackings.get(incidentId);
    if (!tracking) {
      return { active: false };
    }

    const elapsed = Date.now() - tracking.startTime;
    const progress = Math.min(1.0, elapsed / tracking.duration);
    const etaMinutes = Math.ceil((tracking.duration - elapsed) / 60000);

    return {
      active: true,
      progress,
      etaMinutes: Math.max(0, etaMinutes),
    };
  }

  /**
   * Stop all trackings (for cleanup)
   */
  stopAllTrackings(): void {
    for (const incidentId of this.activeTrackings.keys()) {
      this.stopTracking(incidentId);
    }
  }
}

export default new RealtimeTrackingService();
