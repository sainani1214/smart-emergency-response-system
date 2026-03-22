import { 
  MockResponder, 
  EmergencySimulation, 
  ResponderLocation, 
  ResponseEvent,
  LocationUpdate 
} from './simulation.types';
import { calculateDistance, calculateETA } from '../../utils/helpers';
import { v4 as uuidv4 } from 'uuid';

class SimulationService {
  private activeSimulations: Map<string, EmergencySimulation> = new Map();
  private mockResponders: MockResponder[] = [];
  private trackingIntervals: Map<string, NodeJS.Timeout> = new Map();

  generateRandomLocation(): ResponderLocation {
    const centralLat = 40.7128;
    const centralLng = -74.0060;
    const radius = 0.02;
    
    const angle = Math.random() * 2 * Math.PI;
    const distance = Math.random() * radius;
    const lat = centralLat + (distance * Math.cos(angle));
    const lng = centralLng + (distance * Math.sin(angle));
    
    return {
      lat: parseFloat(lat.toFixed(6)),
      lng: parseFloat(lng.toFixed(6)),
      address: `${Math.floor(Math.random() * 999) + 1} Emergency Street, New York, NY`
    };
  }

  async seedRespondersNearLocation(location: ResponderLocation): Promise<MockResponder[]> {
    const responderTypes = ['ambulance', 'fire_truck', 'police_vehicle', 'security_unit'];
    const names = [
      'Alpha Unit', 'Bravo Unit', 'Charlie Unit', 'Delta Unit', 'Echo Unit',
      'Foxtrot Unit', 'Golf Unit', 'Hotel Unit', 'India Unit', 'Juliet Unit'
    ];

    const skills = {
      ambulance: ['medical', 'first_aid', 'trauma_care', 'emergency_medicine'],
      fire_truck: ['fire_suppression', 'rescue', 'hazmat', 'water_rescue'],
      police_vehicle: ['security', 'crowd_control', 'investigation', 'patrol'],
      security_unit: ['security', 'access_control', 'surveillance', 'patrol']
    };

    const centralLat = location.lat;
    const centralLng = location.lng;
    const radius = 0.05; // ~5km radius

    const newResponders: MockResponder[] = [];

    for (let i = 0; i < 10; i++) {
      const type = responderTypes[i % responderTypes.length] as keyof typeof skills;
      
      const angle = Math.random() * 2 * Math.PI;
      const distance = Math.random() * radius;
      const lat = centralLat + (distance * Math.cos(angle));
      const lng = centralLng + (distance * Math.sin(angle));

      const responder: MockResponder = {
        id: uuidv4(),
        name: names[i],
        type,
        location: {
          lat: parseFloat(lat.toFixed(6)),
          lng: parseFloat(lng.toFixed(6)),
          address: `${i + 1} Emergency Plaza, Emergency City`
        },
        status: 'available',
        skills: skills[type],
        responseTimeEstimate: Math.floor(Math.random() * 10) + 2
      };

      newResponders.push(responder);
    }

    // Add to existing responders instead of replacing
    this.mockResponders.push(...newResponders);

    console.log(`Generated ${newResponders.length} mock responders near ${centralLat}, ${centralLng}`);
    return newResponders;
  }

  async seedMockResponders(): Promise<MockResponder[]> {
    this.mockResponders = [];

    const responderTypes = ['ambulance', 'fire_truck', 'police_vehicle', 'security_unit'];
    const names = [
      'Alpha Unit', 'Bravo Unit', 'Charlie Unit', 'Delta Unit', 'Echo Unit',
      'Foxtrot Unit', 'Golf Unit', 'Hotel Unit', 'India Unit', 'Juliet Unit'
    ];

    const skills = {
      ambulance: ['medical', 'first_aid', 'trauma_care', 'emergency_medicine'],
      fire_truck: ['fire_suppression', 'rescue', 'hazmat', 'water_rescue'],
      police_vehicle: ['security', 'crowd_control', 'investigation', 'patrol'],
      security_unit: ['security', 'access_control', 'surveillance', 'patrol']
    };

    const centralLat = 40.7128;
    const centralLng = -74.0060;
    const radius = 0.05;

    for (let i = 0; i < 10; i++) {
      const type = responderTypes[i % responderTypes.length] as keyof typeof skills;
      
      const angle = Math.random() * 2 * Math.PI;
      const distance = Math.random() * radius;
      const lat = centralLat + (distance * Math.cos(angle));
      const lng = centralLng + (distance * Math.sin(angle));

      const responder: MockResponder = {
        id: uuidv4(),
        name: names[i],
        type,
        location: {
          lat: parseFloat(lat.toFixed(6)),
          lng: parseFloat(lng.toFixed(6)),
          address: `${i + 1} Emergency Plaza, Emergency City`
        },
        status: 'available',
        skills: skills[type],
        responseTimeEstimate: Math.floor(Math.random() * 10) + 2
      };

      this.mockResponders.push(responder);
    }

    console.log(`Generated ${this.mockResponders.length} mock responders`);
    this.logResponderLocations();

    return this.mockResponders;
  }

  async createEmergencySimulation(params: {
    userLocation: ResponderLocation;
    emergencyType: string;
    severity: string;
  }): Promise<{
    emergencyId: string;
    nearestResponders: MockResponder[];
  }> {
    const emergencyId = uuidv4();
    
    console.log(`Emergency Created: ${emergencyId}`);
    console.log(`Location: ${params.userLocation.lat}, ${params.userLocation.lng}`);

    // Auto-seed responders if none exist or they're too far away
    if (this.mockResponders.length === 0) {
      console.log('No mock responders found, seeding dynamically near user location...');
      await this.seedRespondersNearLocation(params.userLocation);
    }

    let nearestResponders = this.findNearestResponders(params.userLocation, 3);
    
    // If no responders are within reasonable range (<50km), seed new ones near the user
    if (nearestResponders.length === 0 || nearestResponders.every(r => {
      const dist = calculateDistance(
        params.userLocation.lat,
        params.userLocation.lng,
        r.location.lat,
        r.location.lng
      );
      return dist > 50;
    })) {
      console.log('Responders too far, seeding near user location...');
      await this.seedRespondersNearLocation(params.userLocation);
      nearestResponders = this.findNearestResponders(params.userLocation, 3);
    }
    
    if (nearestResponders.length === 0) {
      throw new Error('No available responders found');
    }

    console.log(`Found ${nearestResponders.length} nearest responders:`);
    nearestResponders.forEach((responder, index) => {
      const distance = calculateDistance(
        params.userLocation.lat,
        params.userLocation.lng,
        responder.location.lat,
        responder.location.lng
      );
      console.log(`  ${index + 1}. ${responder.name} (${responder.type}) - ${distance.toFixed(2)}km away`);
    });

    const simulation: EmergencySimulation = {
      emergencyId,
      userLocation: params.userLocation,
      emergencyType: params.emergencyType,
      severity: params.severity,
      status: 'notifying',
      createdAt: new Date(),
      nearestResponders,
      responseHistory: [],
      trackingUpdates: []
    };

    this.activeSimulations.set(emergencyId, simulation);
    this.simulateBroadcastAndResponse(emergencyId);

    return {
      emergencyId,
      nearestResponders
    };
  }

  private findNearestResponders(userLocation: ResponderLocation, count: number): MockResponder[] {
    const availableResponders = this.mockResponders.filter(r => r.status === 'available');
    
    const respondersWithDistance = availableResponders.map(responder => ({
      responder,
      distance: calculateDistance(
        userLocation.lat,
        userLocation.lng,
        responder.location.lat,
        responder.location.lng
      )
    }));

    return respondersWithDistance
      .sort((a, b) => a.distance - b.distance)
      .slice(0, count)
      .map(item => item.responder);
  }

  private async simulateBroadcastAndResponse(emergencyId: string): Promise<void> {
    const simulation = this.activeSimulations.get(emergencyId);
    if (!simulation) return;

    console.log(`Broadcasting emergency ${emergencyId} to ${simulation.nearestResponders.length} responders`);

    const timeoutId = setTimeout(() => {
      this.handleTimeout(emergencyId);
    }, 10000);

    simulation.timeoutId = timeoutId;

    simulation.nearestResponders.forEach((responder, index) => {
      const responseDelay = Math.random() * 5000 + 1000;
      const willAccept = index === 0 ? true : Math.random() < 0.3;

      setTimeout(() => {
        this.simulateResponderResponse(emergencyId, responder.id, willAccept ? 'accept' : 'reject', responseDelay / 1000);
      }, responseDelay);
    });
  }

  private simulateResponderResponse(emergencyId: string, responderId: string, response: 'accept' | 'reject', delay: number): void {
    const simulation = this.activeSimulations.get(emergencyId);
    if (!simulation || simulation.status !== 'notifying') return;

    const responder = simulation.nearestResponders.find(r => r.id === responderId);
    if (!responder) return;

    console.log(`${responder.name} ${response.toUpperCase()} emergency ${emergencyId} (after ${delay.toFixed(1)}s)`);

    const responseEvent: ResponseEvent = {
      responderId,
      response,
      timestamp: new Date(),
      delay
    };

    simulation.responseHistory.push(responseEvent);

    if (response === 'accept') {
      this.assignResponder(emergencyId, responderId);
    } else {
      const totalResponders = simulation.nearestResponders.length;
      const totalResponses = simulation.responseHistory.length;
      const acceptedResponses = simulation.responseHistory.filter(r => r.response === 'accept').length;

      if (acceptedResponses === 0 && totalResponses === totalResponders) {
        console.log(`All responders rejected emergency ${emergencyId}, retrying...`);
        this.retryWithNextResponders(emergencyId);
      }
    }
  }

  private assignResponder(emergencyId: string, responderId: string): void {
    const simulation = this.activeSimulations.get(emergencyId);
    if (!simulation) return;

    const responder = simulation.nearestResponders.find(r => r.id === responderId);
    if (!responder) return;

    if (simulation.timeoutId) {
      clearTimeout(simulation.timeoutId);
    }

    const otherResponders = simulation.nearestResponders.filter(r => r.id !== responderId);
    console.log(`Cancelling requests for ${otherResponders.length} other responders`);

    simulation.status = 'assigned';
    simulation.assignedResponder = responder;

    const responderIndex = this.mockResponders.findIndex(r => r.id === responderId);
    if (responderIndex !== -1) {
      this.mockResponders[responderIndex].status = 'responding';
    }

    console.log(`Emergency ${emergencyId} assigned to ${responder.name}`);
    console.log(`Assignment completed! Starting real-time tracking...`);

    this.startTrackingSimulation(emergencyId);
  }

  private startTrackingSimulation(emergencyId: string): void {
    const simulation = this.activeSimulations.get(emergencyId);
    if (!simulation || !simulation.assignedResponder) return;

    console.log(`Starting real-time tracking for emergency ${emergencyId}`);

    simulation.status = 'responding';

    const trackingInterval = setInterval(() => {
      this.updateResponderLocation(emergencyId);
    }, 2000);

    this.trackingIntervals.set(emergencyId, trackingInterval);

    setTimeout(() => {
      this.completeEmergency(emergencyId);
    }, 30000);
  }

  private updateResponderLocation(emergencyId: string): void {
    const simulation = this.activeSimulations.get(emergencyId);
    if (!simulation || !simulation.assignedResponder) return;

    const responder = simulation.assignedResponder;
    const userLocation = simulation.userLocation;

    const currentLat = responder.location.lat;
    const currentLng = responder.location.lng;
    
    const targetLat = userLocation.lat;
    const targetLng = userLocation.lng;

    const newLat = currentLat + (targetLat - currentLat) * 0.1;
    const newLng = currentLng + (targetLng - currentLng) * 0.1;

    responder.location.lat = parseFloat(newLat.toFixed(6));
    responder.location.lng = parseFloat(newLng.toFixed(6));

    const distanceToUser = calculateDistance(newLat, newLng, targetLat, targetLng);
    const eta = calculateETA(distanceToUser);

    const locationUpdate: LocationUpdate = {
      responderId: responder.id,
      location: { ...responder.location },
      timestamp: new Date(),
      distanceToUser,
      estimatedArrival: eta
    };

    simulation.trackingUpdates.push(locationUpdate);

    console.log(`${responder.name} location update: ${distanceToUser.toFixed(2)}km away, ETA: ${eta} min`);

    this.broadcastLocationUpdate(emergencyId, locationUpdate);
  }

  private completeEmergency(emergencyId: string): void {
    const simulation = this.activeSimulations.get(emergencyId);
    if (!simulation) return;

    console.log(`Emergency ${emergencyId} completed!`);

    simulation.status = 'completed';

    const trackingInterval = this.trackingIntervals.get(emergencyId);
    if (trackingInterval) {
      clearInterval(trackingInterval);
      this.trackingIntervals.delete(emergencyId);
    }

    if (simulation.assignedResponder) {
      const responderIndex = this.mockResponders.findIndex(r => r.id === simulation.assignedResponder!.id);
      if (responderIndex !== -1) {
        this.mockResponders[responderIndex].status = 'available';
      }
    }

    this.broadcastEmergencyCompleted(emergencyId);
  }

  private handleTimeout(emergencyId: string): void {
    const simulation = this.activeSimulations.get(emergencyId);
    if (!simulation || simulation.status !== 'notifying') return;

    console.log(`⏰ Timeout reached for emergency ${emergencyId}, no responders accepted`);
    this.retryWithNextResponders(emergencyId);
  }

  private retryWithNextResponders(emergencyId: string): void {
    const simulation = this.activeSimulations.get(emergencyId);
    if (!simulation) return;

    console.log(`🔄 Retrying emergency ${emergencyId} with next nearest responders`);

    const notifiedResponderIds = simulation.nearestResponders.map(r => r.id);
    const nextResponders = this.findNearestResponders(simulation.userLocation, 6)
      .filter(r => !notifiedResponderIds.includes(r.id))
      .slice(0, 3);

    if (nextResponders.length === 0) {
      console.log(`No more responders available, escalating emergency ${emergencyId}`);
      simulation.status = 'timeout';
      return;
    }

    simulation.nearestResponders = nextResponders;
    simulation.status = 'notifying';
    simulation.responseHistory = [];

    this.simulateBroadcastAndResponse(emergencyId);
  }

  async handleResponderResponse(emergencyId: string, responderId: string, response: 'accept' | 'reject'): Promise<any> {
    const simulation = this.activeSimulations.get(emergencyId);
    if (!simulation) {
      throw new Error('Emergency not found');
    }

    const responder = simulation.nearestResponders.find(r => r.id === responderId);
    if (!responder) {
      throw new Error('Responder not found for this emergency');
    }

    this.simulateResponderResponse(emergencyId, responderId, response, 0);

    return {
      emergencyId,
      responderId,
      response,
      status: simulation.status
    };
  }

  async getEmergencyStatus(emergencyId: string): Promise<EmergencySimulation | null> {
    return this.activeSimulations.get(emergencyId) || null;
  }

  async getAllResponders(): Promise<MockResponder[]> {
    return this.mockResponders;
  }

  async clearAllSimulations(): Promise<void> {
    console.log('Clearing all simulations...');
    
    this.activeSimulations.forEach((simulation, emergencyId) => {
      if (simulation.timeoutId) {
        clearTimeout(simulation.timeoutId);
      }
      
      const trackingInterval = this.trackingIntervals.get(emergencyId);
      if (trackingInterval) {
        clearInterval(trackingInterval);
      }
    });

    this.mockResponders.forEach(responder => {
      responder.status = 'available';
    });

    this.activeSimulations.clear();
    this.trackingIntervals.clear();
    
    console.log('All simulations cleared');
  }

  private logResponderLocations(): void {
    console.log('\nMock Responders Created:');
    this.mockResponders.forEach((responder, index) => {
      console.log(`${index + 1}. ${responder.name} (${responder.type}) - ${responder.location.lat}, ${responder.location.lng}`);
    });
    console.log('');
  }

  private broadcastLocationUpdate(emergencyId: string, update: LocationUpdate): void {
  }

  private broadcastEmergencyCompleted(emergencyId: string): void {
  }
}

export default new SimulationService();

