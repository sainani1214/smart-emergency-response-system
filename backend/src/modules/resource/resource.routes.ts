import { FastifyPluginAsync } from 'fastify';
import {
  createResource,
  getResources,
  getResourceByUnitId,
  updateResourceStatus,
  updateResourceLocation,
  getResourceStatistics,
  getAvailableResources
} from './resource.controller';
import { ResourceSchemas } from '../../schemas';
import { resourceSeedService } from './resource.seed';

const resourceRoutes: FastifyPluginAsync = async (app) => {
  app.post('/resources', { schema: ResourceSchemas.createResourceSchema }, createResource);
  app.get('/resources', { schema: ResourceSchemas.getResourcesSchema }, getResources);
  app.get('/resources/statistics', getResourceStatistics);
  app.get('/resources/available', getAvailableResources);
  app.get('/resources/:unitId', { schema: ResourceSchemas.getResourceByIdSchema }, getResourceByUnitId);
  app.patch('/resources/:unitId/status', { schema: ResourceSchemas.updateResourceStatusSchema }, updateResourceStatus);
  app.patch('/resources/:unitId/location', { schema: ResourceSchemas.updateResourceLocationSchema }, updateResourceLocation);
  app.post('/resources/seed', async (request, reply) => {
    try {
      await resourceSeedService.seedResources();
      return reply.send({ message: 'Resources seeded successfully' });
    } catch (error: any) {
      return reply.code(500).send({ error: error.message });
    }
  });
};

export default resourceRoutes;