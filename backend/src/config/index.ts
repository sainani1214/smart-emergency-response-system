export const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/emergency-response'
  },

  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true
  },

  escalation: {
    unassignedThresholdMinutes: 5,
    inProgressThresholdMinutes: 15,
    monitorIntervalSeconds: 30
  },

  assignment: {
    maxSearchRadiusKm: 50,
    averageEmergencySpeedKmh: 60
  },

  notification: {
    retryAttempts: 3,
    retryIntervalSeconds: 60
  }
};
