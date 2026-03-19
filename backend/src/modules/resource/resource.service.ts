import { Resource, IResource, ResourceStatus } from '../../models';
import { generateId } from '../../utils/helpers';

export class ResourceService {
  /**
   * Create a new resource
   */
  async createResource(data: {
    unit_id?: string;
    type: string;
    location: { lat: number; lng: number };
    capacity: { current?: number; max: number };
    skills?: string[];
    crew_size?: number;
    equipment?: string[];
    contact?: string;
    metadata?: Record<string, any>;
  }): Promise<IResource> {
    const unit_id = data.unit_id || generateId(this.getUnitPrefix(data.type));

    const resource = new Resource({
      unit_id,
      type: data.type,
      location: data.location,
      capacity: {
        current: data.capacity.current || 0,
        max: data.capacity.max
      },
      status: ResourceStatus.AVAILABLE,
      skills: data.skills || [],
      crew_size: data.crew_size,
      equipment: data.equipment,
      contact: data.contact,
      metadata: data.metadata
    });

    await resource.save();
    return resource;
  }

  private getUnitPrefix(type: string): string {
    const prefixes: Record<string, string> = {
      ambulance: 'AMB',
      fire_truck: 'FIRE',
      security: 'SEC',
      maintenance: 'MAINT',
      police: 'POL'
    };
    return prefixes[type] || 'UNIT';
  }

  /**
   * Get resource by unit ID
   */
  async getResourceByUnitId(unitId: string): Promise<IResource | null> {
    return Resource.findOne({ unit_id: unitId })
      .populate('assigned_to')
      .exec();
  }

  /**
   * Get resource by MongoDB ObjectId
   */
  async getResourceByObjectId(id: string): Promise<IResource | null> {
    return Resource.findById(id)
      .populate('assigned_to')
      .exec();
  }

  /**
   * Get all resources with filtering
   */
  async getResources(filters: {
    status?: string;
    type?: string;
    available?: boolean;
  }): Promise<IResource[]> {
    const query: any = {};
    
    if (filters.status) query.status = filters.status;
    if (filters.type) query.type = filters.type;
    
    if (filters.available === true) {
      query.status = ResourceStatus.AVAILABLE;
      query['capacity.current'] = { $lt: query['capacity.max'] || 999 };
    }

    return Resource.find(query)
      .populate('assigned_to')
      .sort({ last_updated: -1 })
      .exec();
  }

  /**
   * Get available resources by type
   */
  async getAvailableResourcesByType(type: string): Promise<IResource[]> {
    return Resource.find({
      type,
      status: ResourceStatus.AVAILABLE,
      $expr: { $lt: ['$capacity.current', '$capacity.max'] }
    }).exec();
  }

  /**
   * Update resource status
   */
  async updateResourceStatus(
    unitId: string,
    status: ResourceStatus
  ): Promise<IResource | null> {
    return Resource.findOneAndUpdate(
      { unit_id: unitId },
      { status },
      { new: true }
    ).populate('assigned_to').exec();
  }

  /**
   * Update resource location
   */
  async updateResourceLocation(
    unitId: string,
    location: { lat: number; lng: number }
  ): Promise<IResource | null> {
    return Resource.findOneAndUpdate(
      { unit_id: unitId },
      { location },
      { new: true }
    ).populate('assigned_to').exec();
  }

  /**
   * Assign resource to incident
   */
  async assignToIncident(
    resourceId: string,
    incidentId: string
  ): Promise<IResource | null> {
    const resource = await Resource.findById(resourceId);
    
    if (!resource) return null;

    resource.assigned_to = incidentId as any;
    resource.status = ResourceStatus.DISPATCHED;
    resource.capacity.current += 1;
    
    await resource.save();
    return resource.populate('assigned_to');
  }

  /**
   * Release resource from incident
   */
  async releaseFromIncident(resourceId: string): Promise<IResource | null> {
    const resource = await Resource.findById(resourceId);
    
    if (!resource) return null;

    resource.assigned_to = undefined;
    resource.status = ResourceStatus.AVAILABLE;
    resource.capacity.current = Math.max(0, resource.capacity.current - 1);
    
    await resource.save();
    return resource;
  }

  /**
   * Find resources near a location
   */
  async findResourcesNearLocation(
    lat: number,
    lng: number,
    radiusKm: number,
    type?: string
  ): Promise<IResource[]> {
    const query: any = {
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [lng, lat]
          },
          $maxDistance: radiusKm * 1000 // Convert to meters
        }
      }
    };

    if (type) {
      query.type = type;
    }

    return Resource.find(query)
      .populate('assigned_to')
      .limit(10)
      .exec();
  }

  /**
   * Get resource statistics
   */
  async getStatistics(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
    utilization: number;
  }> {
    const total = await Resource.countDocuments();

    const byStatus = await Resource.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const byType = await Resource.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);

    const utilizationResult = await Resource.aggregate([
      {
        $group: {
          _id: null,
          totalCapacity: { $sum: '$capacity.max' },
          usedCapacity: { $sum: '$capacity.current' }
        }
      }
    ]);

    const utilization = utilizationResult[0]
      ? (utilizationResult[0].usedCapacity / utilizationResult[0].totalCapacity) * 100
      : 0;

    return {
      total,
      byStatus: Object.fromEntries(byStatus.map(s => [s._id, s.count])),
      byType: Object.fromEntries(byType.map(t => [t._id, t.count])),
      utilization: Math.round(utilization * 100) / 100
    };
  }

  /**
   * Delete multiple resources matching criteria
   */
  async deleteResources(criteria: any): Promise<{ deletedCount: number }> {
    const result = await Resource.deleteMany(criteria);
    return { deletedCount: result.deletedCount || 0 };
  }
}

export default new ResourceService();
