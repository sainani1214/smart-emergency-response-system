import 'dotenv/config';
import { buildApp } from './app';
import { connectDatabase } from './config/database';
import { config } from './config';
import socketService from './services/socket.service';
import escalationService from './modules/escalation/escalation.service';
import SimulationService from './services/simulation.service';
import { IncidentService } from './modules/incident/incident.service';
import { resourceSeedService } from './modules/resource/resource.seed';

async function start() {
  try {
    // Connect to database
    await connectDatabase();

    // Build Fastify app
    const app = await buildApp();

    // Start HTTP server
    const address = await app.listen({
      port: config.port as number,
      host: '0.0.0.0'
    });

    console.log(`Server listening on ${address}`);

    // Initialize Socket.io
    socketService.initialize(app.server);

    // Start escalation monitor
    startEscalationMonitor();

    // Start simulation service if enabled
    startSimulationService();

    // Seed resources if needed
    await resourceSeedService.seedIfNeeded();

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

function startEscalationMonitor() {
  // Monitor incidents for escalation every 30 seconds
  const intervalSeconds = config.escalation.monitorIntervalSeconds;
  
  setInterval(async () => {
    try {
      await escalationService.monitorActiveIncidents();
    } catch (error) {
      console.error('Escalation monitor error:', error);
    }
  }, intervalSeconds * 1000);

  console.log(`Escalation monitor started (interval: ${intervalSeconds}s)`);
}

function startSimulationService() {
  const incidentService = new IncidentService();
  const simulationService = new SimulationService(incidentService);
  
  if (process.env.ENABLE_SIMULATION === 'true') {
    simulationService.start();
  } else {
    console.log('Simulation service disabled (set ENABLE_SIMULATION=true to enable)');
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

start();
