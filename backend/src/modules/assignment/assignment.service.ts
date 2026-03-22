import { Assignment, IAssignment, AssignmentStatus, IResource, IIncident } from '../../models';
import { calculateDistance, calculateETA, normalize } from '../../utils/helpers';
import resourceService from '../resource/resource.service';

interface AssignmentScore {
  resource: IResource;
  score: number;
  distance: number;
  eta: number;
  factors: {
    distanceScore: number;
    availabilityScore: number;
    typeMatchScore: number;
    workloadScore: number;
    priorityScore: number;
  };
}

export class AssignmentService {
  
  async getEligibleResources(incidentType: string): Promise<IResource[]> {
    return this.findEligibleResources(incidentType);
  }

  async findBestResource(incident: IIncident): Promise<{
    resource: IResource;
    score: number;
    distance: number;
    eta: number;
  } | null> {
    const availableResources = await this.findEligibleResources(incident.type);

    if (availableResources.length === 0) {
      return null;
    }

    const scores = await Promise.all(
      availableResources.map(resource => this.calculateAssignmentScore(incident, resource))
    );

    scores.sort((a, b) => b.score - a.score);

    const best = scores[0];
    
    return {
      resource: best.resource,
      score: best.score,
      distance: best.distance,
      eta: best.eta
    };
  }

  /**
   * Calculate assignment score using multi-factor optimization
   */
  private async calculateAssignmentScore(
    incident: IIncident,
    resource: IResource
  ): Promise<AssignmentScore> {
    const distance = calculateDistance(
      incident.location.lat,
      incident.location.lng,
      resource.location.lat,
      resource.location.lng
    );

    const eta = calculateETA(distance);

    const maxDistance = 50;
    const normalizedDistance = normalize(distance, 0, maxDistance);
    const distanceScore = (1 - normalizedDistance) * 0.35;

    const capacityUtilization = resource.capacity.current / resource.capacity.max;
    const availabilityScore = (1 - capacityUtilization) * 0.25;

    const typeMatchScore = this.getTypeMatchScore(incident.type, resource.type) * 0.20;
    const workloadScore = await this.calculateWorkloadScore(resource) * 0.15;
    const priorityScore = normalize(incident.priority_score, 0, 100) * 0.05;

    const totalScore = 
      distanceScore + 
      availabilityScore + 
      typeMatchScore + 
      workloadScore + 
      priorityScore;

    return {
      resource,
      score: totalScore,
      distance,
      eta,
      factors: {
        distanceScore,
        availabilityScore,
        typeMatchScore,
        workloadScore,
        priorityScore
      }
    };
  }

  /**
   * Get type match score
   */
  private getTypeMatchScore(incidentType: string, resourceType: string): number {
    const perfectMatches: Record<string, string[]> = {
      medical: ['ambulance'],
      fire: ['fire_truck'],
      security: ['security', 'police'],
      water: ['maintenance'],
      power: ['maintenance']
    };

    const matches = perfectMatches[incidentType] || [];
    return matches.includes(resourceType) ? 1.0 : 0.3;
  }

  /**
   * Calculate workload score based on recent assignments
   */
  private async calculateWorkloadScore(resource: IResource): Promise<number> {
    // Count active assignments for this resource in the last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const recentAssignments = await Assignment.countDocuments({
      resource_id: resource._id,
      assigned_at: { $gte: oneDayAgo },
      status: { $in: [AssignmentStatus.IN_PROGRESS, AssignmentStatus.COMPLETED] }
    });

    
    return Math.max(0, 1 - (recentAssignments / 10));
  }

  /**
   * Get eligible resources for an incident type
   */
  private async findEligibleResources(incidentType: string): Promise<IResource[]> {
    const typeMapping: Record<string, string[]> = {
      medical: ['ambulance'],
      fire: ['fire_truck'],
      security: ['security', 'police'],
      water: ['maintenance'],
      power: ['maintenance']
    };

    const eligibleTypes = typeMapping[incidentType] || [];
    
    // Get available resources of eligible types
    const resources = await resourceService.getResources({
      status: 'available'
    });

    return resources.filter(r => 
      eligibleTypes.includes(r.type) && 
      r.capacity.current < r.capacity.max
    );
  }

  /**
   * Create an assignment
   */
  async createAssignment(
    incidentId: string,
    resourceId: string,
    distance: number,
    eta: number,
    score: number,
    responderId?: string,
    responderUserId?: string
  ): Promise<IAssignment> {
    const assignment = new Assignment({
      incident_id: incidentId,
      resource_id: resourceId,
      responder_id: responderId,
      accepted_by: responderUserId,
      distance,
      eta,
      score,
      status: AssignmentStatus.PENDING
    });

    await assignment.save();
    return assignment.populate(['incident_id', 'resource_id', 'responder_id']);
  }

  /**
   * Get assignment by ID
   */
  async getAssignmentById(id: string): Promise<IAssignment | null> {
    return Assignment.findById(id)
      .populate(['incident_id', 'resource_id'])
      .exec();
  }

  /**
   * Get assignments for an incident
   */
  async getAssignmentsByIncident(incidentId: string): Promise<IAssignment[]> {
    return Assignment.find({ incident_id: incidentId })
      .populate(['incident_id', 'resource_id', 'responder_id'])
      .sort({ assigned_at: -1 })
      .exec();
  }

  async getLatestAssignmentByIncident(incidentId: string): Promise<IAssignment | null> {
    return Assignment.findOne({ incident_id: incidentId })
      .populate(['incident_id', 'resource_id', 'responder_id'])
      .sort({ assigned_at: -1 })
      .exec();
  }

  /**
   * Get assignments for a resource
   */
  async getAssignmentsByResource(resourceId: string): Promise<IAssignment[]> {
    return Assignment.find({ resource_id: resourceId })
      .populate(['incident_id', 'resource_id'])
      .sort({ assigned_at: -1 })
      .exec();
  }

  /**
   * Get active assignments
   */
  async getActiveAssignments(): Promise<IAssignment[]> {
    return Assignment.find({
      status: { $in: [AssignmentStatus.PENDING, AssignmentStatus.ACCEPTED, AssignmentStatus.IN_PROGRESS] }
    })
      .populate(['incident_id', 'resource_id'])
      .sort({ assigned_at: -1 })
      .exec();
  }

  /**
   * Update assignment status
   */
  async updateAssignmentStatus(
    assignmentId: string,
    status: AssignmentStatus,
    responderId?: string,
    responderUserId?: string
  ): Promise<IAssignment | null> {
    const updateData: any = { status };

    if (status === AssignmentStatus.ACCEPTED) {
      updateData.accepted_at = new Date();
      if (responderId) updateData.responder_id = responderId;
      if (responderUserId) updateData.accepted_by = responderUserId;
    } else if (status === AssignmentStatus.IN_PROGRESS) {
      updateData.started_at = new Date();
    } else if (status === AssignmentStatus.COMPLETED) {
      updateData.completed_at = new Date();
    } else if (status === AssignmentStatus.CANCELLED) {
      updateData.cancelled_at = new Date();
    }

    const assignment = await Assignment.findByIdAndUpdate(
      assignmentId,
      updateData,
      { new: true }
    ).populate(['incident_id', 'resource_id']).exec();

    // Calculate actual response time if started
    if (assignment && assignment.started_at && assignment.assigned_at) {
      const responseTime = Math.floor((assignment.started_at.getTime() - assignment.assigned_at.getTime()) / 60000);
      assignment.actual_response_time = responseTime;
      await assignment.save();
    }

    return assignment;
  }

  /**
   * Dynamic re-routing: Reassign incident if higher priority incident comes in
   */
  async considerReassignment(newIncident: IIncident): Promise<boolean> {
    // Only consider for critical incidents
    if (newIncident.severity !== 'critical') {
      return false;
    }

    // Get all pending assignments (not yet accepted)
    const pendingAssignments = await Assignment.find({
      status: AssignmentStatus.PENDING
    }).populate(['incident_id', 'resource_id']);

    for (const assignment of pendingAssignments) {
      const oldIncident = assignment.incident_id as any;
      
      // If new incident has much higher priority, consider reassigning
      if (newIncident.priority_score > oldIncident.priority_score * 1.5) {
        const resource = assignment.resource_id as any;
        
        // Check if this resource would be better for the new incident
        const newDistance = calculateDistance(
          newIncident.location.lat,
          newIncident.location.lng,
          resource.location.lat,
          resource.location.lng
        );

        const oldDistance = assignment.distance;

        // If significantly closer to new incident, reassign
        if (newDistance < oldDistance * 0.7) {
          // Cancel old assignment
          await this.updateAssignmentStatus(assignment._id.toString(), AssignmentStatus.CANCELLED);
          
          // This will trigger new assignment search for both incidents
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Get assignment statistics
   */
  async getStatistics(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    averageResponseTime: number | null;
    averageDistance: number | null;
  }> {
    const total = await Assignment.countDocuments();

    const byStatus = await Assignment.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const avgStats = await Assignment.aggregate([
      {
        $match: {
          actual_response_time: { $exists: true }
        }
      },
      {
        $group: {
          _id: null,
          avgResponseTime: { $avg: '$actual_response_time' },
          avgDistance: { $avg: '$distance' }
        }
      }
    ]);

    return {
      total,
      byStatus: Object.fromEntries(byStatus.map((s: any) => [s._id, s.count])),
      averageResponseTime: avgStats[0]?.avgResponseTime || null,
      averageDistance: avgStats[0]?.avgDistance || null
    };
  }
}

export default new AssignmentService();
