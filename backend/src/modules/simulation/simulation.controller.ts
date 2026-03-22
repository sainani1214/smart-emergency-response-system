import { FastifyRequest, FastifyReply } from 'fastify';
import simulationService from './simulation.service';

interface CreateEmergencyRequest {
  Body: {
    userLocation?: {
      lat: number;
      lng: number;
      address: string;
    };
    emergencyType?: string;
    severity?: string;
  };
}

interface EmergencyStatusRequest {
  Params: {
    emergencyId: string;
  };
}

interface ResponderResponseRequest {
  Params: {
    emergencyId: string;
  };
  Body: {
    responderId: string;
    response: 'accept' | 'reject';
  };
}

export const simulateEmergency = async (request: FastifyRequest<CreateEmergencyRequest>, reply: FastifyReply) => {
  try {
    const { userLocation, emergencyType, severity } = request.body;
    
    let finalUserLocation;
    if (!userLocation) {
      finalUserLocation = simulationService.generateRandomLocation();
      console.log('Generated random user location:', finalUserLocation.lat, finalUserLocation.lng);
    } else {
      finalUserLocation = userLocation;
      console.log('User location received:', finalUserLocation.lat, finalUserLocation.lng);
    }
    
    console.log('Emergency created');
    
    const simulation = await simulationService.createEmergencySimulation({
      userLocation: finalUserLocation,
      emergencyType: emergencyType || 'medical',
      severity: severity || 'high'
    });
    
    return reply.code(201).send({
      success: true,
      emergencyId: simulation.emergencyId,
      message: 'Emergency simulation started',
      userLocation: finalUserLocation,
      nearestResponders: simulation.nearestResponders
    });
  } catch (error: any) {
    console.error('Emergency simulation error:', error.message);
    return reply.code(500).send({ 
      success: false,
      error: error.message 
    });
  }
};

export const getEmergencyStatus = async (request: FastifyRequest<EmergencyStatusRequest>, reply: FastifyReply) => {
  try {
    const { emergencyId } = request.params;
    
    const status = await simulationService.getEmergencyStatus(emergencyId);
    
    if (!status) {
      return reply.code(404).send({
        success: false,
        error: 'Emergency not found'
      });
    }
    
    return reply.send({
      success: true,
      ...status
    });
  } catch (error: any) {
    return reply.code(500).send({
      success: false,
      error: error.message
    });
  }
};

export const getAllResponders = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const responders = await simulationService.getAllResponders();
    
    return reply.send({
      success: true,
      responders,
      total: responders.length
    });
  } catch (error: any) {
    return reply.code(500).send({
      success: false,
      error: error.message
    });
  }
};

export const seedResponders = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    console.log('Seeding responders...');
    
    const responders = await simulationService.seedMockResponders();
    
    console.log(`Created ${responders.length} mock responders`);
    
    return reply.send({
      success: true,
      message: `Created ${responders.length} mock responders`,
      responders
    });
  } catch (error: any) {
    return reply.code(500).send({
      success: false,
      error: error.message
    });
  }
};

export const respondToEmergency = async (request: FastifyRequest<ResponderResponseRequest>, reply: FastifyReply) => {
  try {
    const { emergencyId } = request.params;
    const { responderId, response } = request.body;
    
    console.log(`Responder ${responderId} ${response.toUpperCase()} emergency ${emergencyId}`);
    
    const result = await simulationService.handleResponderResponse(emergencyId, responderId, response);
    
    return reply.send({
      success: true,
      ...result
    });
  } catch (error: any) {
    return reply.code(500).send({
      success: false,
      error: error.message
    });
  }
};

export const clearSimulation = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    await simulationService.clearAllSimulations();
    
    return reply.send({
      success: true,
      message: 'All simulations cleared'
    });
  } catch (error: any) {
    return reply.code(500).send({
      success: false,
      error: error.message
    });
  }
};