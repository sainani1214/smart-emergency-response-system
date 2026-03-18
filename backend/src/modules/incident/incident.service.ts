import { Incident, IIncident, IncidentStatus } from '../../models';
import { calculatePriorityScore, generateId } from '../../utils/helpers';

export class IncidentService {
  /**
   * Create a new incident
   */
  async createIncident(data: {
    type: string;
    severity: string;
    location: { lat: number; lng: number; address?: string };
    description: string;
    reporter: { name: string; contact: string; email?: string };
    metadata?: Record<string, any>;
  }): Promise<IIncident> {
    const incident_id = generateId('INC');
    const priority_score = calculatePriorityScore(data.severity, data.type, 0);

    const incident = new Incident({
      incident_id,
      type: data.type,
      severity: data.severity,
      location: data.location,
      description: data.description,
      reporter: data.reporter,
      priority_score,
      escalation_level: 0,
      status: IncidentStatus.OPEN,
      metadata: data.metadata
    });

    await incident.save();
    return incident;
  }

  /**
   * Get incident by ID
   */
  async getIncidentById(incidentId: string): Promise<IIncident | null> {
    return Incident.findOne({ incident_id: incidentId })
      .populate('assigned_resource')
      .exec();
  }

  /**
   * Get incident by MongoDB ObjectId
   */
  async getIncidentByObjectId(id: string): Promise<IIncident | null> {
    return Incident.findById(id)
      .populate('assigned_resource')
      .exec();
  }

  /**
   * Get all incidents with filtering and pagination
   */
  async getIncidents(filters: {
    status?: string;
    type?: string;
    severity?: string;
    limit?: number;
    skip?: number;
  }): Promise<{ incidents: IIncident[]; total: number }> {
    const query: any = {};
    
    if (filters.status) query.status = filters.status;
    if (filters.type) query.type = filters.type;
    if (filters.severity) query.severity = filters.severity;

    const total = await Incident.countDocuments(query);
    const incidents = await Incident.find(query)
      .populate('assigned_resource')
      .sort({ priority_score: -1, created_at: -1 })
      .limit(filters.limit || 50)
      .skip(filters.skip || 0)
      .exec();

    return { incidents, total };
  }

  /**
   * Get active incidents (open, assigned, in-progress)
   */
  async getActiveIncidents(): Promise<IIncident[]> {
    return Incident.find({
      status: { 
        $in: [IncidentStatus.OPEN, IncidentStatus.ASSIGNED, IncidentStatus.IN_PROGRESS] 
      }
    })
      .populate('assigned_resource')
      .sort({ priority_score: -1, created_at: -1 })
      .exec();
  }

  /**
   * Update incident status
   */
  async updateIncidentStatus(
    incidentId: string, 
    status: IncidentStatus
  ): Promise<IIncident | null> {
    const updateData: any = { status };

    if (status === IncidentStatus.RESOLVED) {
      updateData.resolved_at = new Date();
    } else if (status === IncidentStatus.CLOSED) {
      updateData.closed_at = new Date();
    }

    return Incident.findOneAndUpdate(
      { incident_id: incidentId },
      updateData,
      { new: true }
    ).populate('assigned_resource').exec();
  }

  /**
   * Assign resource to incident
   */
  async assignResource(
    incidentId: string,
    resourceId: string
  ): Promise<IIncident | null> {
    return Incident.findOneAndUpdate(
      { incident_id: incidentId },
      { 
        assigned_resource: resourceId,
        status: IncidentStatus.ASSIGNED
      },
      { new: true }
    ).populate('assigned_resource').exec();
  }

  /**
   * Escalate incident
   */
  async escalateIncident(incidentId: string): Promise<IIncident | null> {
    const incident = await Incident.findOne({ incident_id: incidentId });
    
    if (!incident) return null;

    const newEscalationLevel = incident.escalation_level + 1;
    const newPriorityScore = calculatePriorityScore(
      incident.severity,
      incident.type,
      newEscalationLevel
    );

    incident.escalation_level = newEscalationLevel;
    incident.priority_score = newPriorityScore;
    await incident.save();

    return incident.populate('assigned_resource');
  }

  /**
   * Get incidents near a location
   */
  async getIncidentsNearLocation(
    lat: number,
    lng: number,
    radiusKm: number
  ): Promise<IIncident[]> {
    return Incident.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [lng, lat]
          },
          $maxDistance: radiusKm * 1000 // Convert to meters
        }
      }
    })
      .populate('assigned_resource')
      .limit(20)
      .exec();
  }

  /**
   * Get incident statistics
   */
  async getStatistics(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
    averageResponseTime: number | null;
  }> {
    const total = await Incident.countDocuments();

    const byStatus = await Incident.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const byType = await Incident.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);

    const bySeverity = await Incident.aggregate([
      { $group: { _id: '$severity', count: { $sum: 1 } } }
    ]);

    const responseTimeResult = await Incident.aggregate([
      { 
        $match: { 
          resolved_at: { $exists: true } 
        } 
      },
      {
        $project: {
          responseTime: {
            $divide: [
              { $subtract: ['$resolved_at', '$created_at'] },
              60000 // Convert to minutes
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          avgResponseTime: { $avg: '$responseTime' }
        }
      }
    ]);

    return {
      total,
      byStatus: Object.fromEntries(byStatus.map(s => [s._id, s.count])),
      byType: Object.fromEntries(byType.map(t => [t._id, t.count])),
      bySeverity: Object.fromEntries(bySeverity.map(s => [s._id, s.count])),
      averageResponseTime: responseTimeResult[0]?.avgResponseTime || null
    };
  }
}

export default new IncidentService();
