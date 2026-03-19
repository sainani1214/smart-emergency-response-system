import 'dotenv/config';
import { buildApp } from './app';
import { connectDatabase } from './config/database';
import { config } from './config';
import socketService from './services/socket.service';
import escalationService from './modules/escalation/escalation.service';

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
