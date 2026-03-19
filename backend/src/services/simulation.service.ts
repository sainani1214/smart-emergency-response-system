import { IncidentService } from '../modules/incident/incident.service';
import { IncidentType, IncidentSeverity } from '../models/Incident';

interface SimulationConfig {
  enabled: boolean;
  interval: number; // milliseconds
  minDelay: number;
  maxDelay: number;
}

class SimulationService {
  private incidentService: IncidentService;
  private config: SimulationConfig;
  private intervalId?: NodeJS.Timeout;
  private running: boolean = false;

  constructor(incidentService: IncidentService) {
    this.incidentService = incidentService;
    this.config = {
      enabled: process.env.ENABLE_SIMULATION === 'true',
      interval: parseInt(process.env.SIMULATION_INTERVAL || '60000'), // 60 seconds default
      minDelay: 5000, // 5 seconds
      maxDelay: 120000, // 2 minutes
    };
  }

  start() {
    if (!this.config.enabled || this.running) {
      console.log('Simulation service not enabled or already running');
      return;
    }

    console.log('🎭 Starting simulation service...');
    console.log(`   Interval: ${this.config.interval / 1000}s`);
    this.running = true;

    // Generate first incident after a short delay
    setTimeout(() => this.generateRandomIncident(), 5000);

    // Set up recurring generation
    this.intervalId = setInterval(
      () => this.generateRandomIncident(),
      this.config.interval
    );
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    this.running = false;
    console.log('🎭 Simulation service stopped');
  }

  private async generateRandomIncident() {
    try {
      const incident = this.generateIncidentData();
      console.log(`🎭 Simulating incident: ${incident.type} - ${incident.severity}`);
      
      await this.incidentService.createIncident(incident);
    } catch (error) {
      console.error('Error generating simulated incident:', error);
    }
  }

  private generateIncidentData() {
    // Incident types with their probabilities
    const types = [
      { type: IncidentType.MEDICAL, weight: 35 },
      { type: IncidentType.FIRE, weight: 15 },
      { type: IncidentType.SECURITY, weight: 25 },
      { type: IncidentType.WATER, weight: 15 },
      { type: IncidentType.POWER, weight: 10 },
    ];

    // Severity levels with their probabilities
    const severities = [
      { severity: IncidentSeverity.LOW, weight: 30 },
      { severity: IncidentSeverity.MEDIUM, weight: 40 },
      { severity: IncidentSeverity.HIGH, weight: 20 },
      { severity: IncidentSeverity.CRITICAL, weight: 10 },
    ];

    const type = this.weightedRandom(types).type;
    const severity = this.weightedRandom(severities).severity;

    // Generate location in Pune area
    const baseLocation = { lat: 18.5204, lng: 73.8567 }; // Pune coordinates
    const location = {
      lat: baseLocation.lat + (Math.random() - 0.5) * 0.1, // ~11km range
      lng: baseLocation.lng + (Math.random() - 0.5) * 0.1,
      address: this.generateAddress(type),
    };

    const description = this.generateDescription(type, severity);
    const reporter = this.generateReporter();

    return {
      type,
      severity,
      location,
      description,
      reporter,
    };
  }

  private weightedRandom<T extends { weight: number }>(items: T[]): T {
    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
    let random = Math.random() * totalWeight;

    for (const item of items) {
      random -= item.weight;
      if (random <= 0) {
        return item;
      }
    }

    return items[items.length - 1];
  }

  private generateDescription(type: IncidentType, severity: IncidentSeverity): string {
    const descriptions: Record<IncidentType, string[]> = {
      [IncidentType.MEDICAL]: [
        'Person collapsed with chest pain',
        'Traffic accident with multiple injuries',
        'Elderly person fallen and unable to get up',
        'Severe allergic reaction reported',
        'Child with breathing difficulties',
        'Heart attack symptoms reported',
        'Unconscious person found',
      ],
      [IncidentType.FIRE]: [
        'Kitchen fire with smoke visible',
        'Electrical fire in building',
        'Garbage fire spreading to nearby structures',
        'Vehicle fire with explosion risk',
        'Wildfire spotted near residential area',
        'Building fire with people trapped',
        'Gas leak with fire hazard',
      ],
      [IncidentType.SECURITY]: [
        'Suspicious activity near ATM',
        'Break-in reported at commercial property',
        'Assault in progress',
        'Theft reported with suspect still on premises',
        'Domestic disturbance with weapons',
        'Armed robbery at store',
        'Vandalism of public property',
      ],
      [IncidentType.WATER]: [
        'Major water main break flooding street',
        'Sewage backup affecting multiple homes',
        'Water contamination reported',
        'Burst pipe causing property damage',
        'Flash flooding in low-lying area',
        'Water supply interruption',
        'Leaking fire hydrant',
      ],
      [IncidentType.POWER]: [
        'Power outage affecting entire block',
        'Downed power lines on roadway',
        'Electrical transformer explosion',
        'Sparking electrical wires',
        'Complete neighborhood blackout',
        'Power surge damaging equipment',
        'Emergency generator failure',
      ],
    };

    const options = descriptions[type] || ['Simulated incident'];
    const base = options[Math.floor(Math.random() * options.length)];

    if (severity === IncidentSeverity.CRITICAL) {
      return `URGENT: ${base}. Multiple casualties reported.`;
    } else if (severity === IncidentSeverity.HIGH) {
      return `${base}. Immediate attention required.`;
    }

    return base;
  }

  private generateAddress(type: IncidentType): string {
    const areas = [
      'Koregaon Park',
      'Viman Nagar',
      'Hinjewadi',
      'Baner',
      'Wakad',
      'Kharadi',
      'Hadapsar',
      'Pimpri',
      'Chinchwad',
      'Magarpatta',
      'Aundh',
      'Shivajinagar',
    ];

    const landmarks: Record<IncidentType, string[]> = {
      [IncidentType.MEDICAL]: ['Hospital', 'Clinic', 'Shopping Mall', 'Park', 'Office Complex'],
      [IncidentType.FIRE]: ['Building', 'Factory', 'Warehouse', 'Market', 'Apartment Complex'],
      [IncidentType.SECURITY]: ['Bank', 'Store', 'ATM', 'Mall', 'Parking Lot'],
      [IncidentType.WATER]: ['Residential Area', 'Main Road', 'Society', 'Complex'],
      [IncidentType.POWER]: ['Substation', 'Street', 'Complex', 'Area'],
    };

    const area = areas[Math.floor(Math.random() * areas.length)];
    const landmark = landmarks[type][Math.floor(Math.random() * landmarks[type].length)];

    return `Near ${landmark}, ${area}, Pune`;
  }

  private generateReporter(): { name: string; contact: string; email?: string } {
    const firstNames = ['Rahul', 'Priya', 'Amit', 'Sneha', 'Vijay', 'Anjali', 'Rohan', 'Pooja'];
    const lastNames = ['Sharma', 'Patel', 'Kumar', 'Singh', 'Desai', 'Gupta', 'Rao', 'Mehta'];

    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const name = `${firstName} ${lastName}`;

    const contact = `+91 ${Math.floor(7000000000 + Math.random() * 2999999999)}`;
    const email = Math.random() > 0.5 
      ? `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`
      : undefined;

    return { name, contact, email };
  }

  isRunning(): boolean {
    return this.running;
  }

  getConfig(): SimulationConfig {
    return { ...this.config };
  }

  updateConfig(config: Partial<SimulationConfig>) {
    this.config = { ...this.config, ...config };
    
    if (this.running && this.intervalId) {
      // Restart with new config
      this.stop();
      this.start();
    }
  }
}

export default SimulationService;
