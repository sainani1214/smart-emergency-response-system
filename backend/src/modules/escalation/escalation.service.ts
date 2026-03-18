import { Escalation, IEscalation, EscalationType, EscalationStatus, IIncident } from '../../models';
import { hasTimeElapsed } from '../../utils/helpers';
import incidentService from '../incident/incident.service';

interface EscalationRule {
  type: EscalationType;
  condition: (incident: IIncident) => boolean;
  threshold: number;
  action: string;
  reason: string;
}

export class EscalationService {
  private rules: EscalationRule[] = [
    {
      type: EscalationType.TIME_BASED,
      condition: (incident: IIncident) => 
        incident.status === 'open' && hasTimeElapsed(incident.created_at, 5),
      threshold: 5,
      action: 'escalate_to_supervisor',
      reason: 'Incident unassigned for more than 5 minutes'
    },
    {
      type: EscalationType.TIME_BASED,
      condition: (incident: IIncident) => 
        incident.status === 'assigned' && hasTimeElapsed(incident.updated_at, 15),
      threshold: 15,
      action: 'escalate_to_manager',
      reason: 'No progress for 15 minutes after assignment'
    },
    {
      type: EscalationType.SEVERITY_BASED,
      condition: (incident: IIncident) => 
        incident.severity === 'critical' && incident.escalation_level === 0,
      threshold: 0,
      action: 'immediate_supervisor_notification',
      reason: 'Critical incident requires immediate attention'
    },
    {
      type: EscalationType.CAPACITY_BASED,
      condition: () => false, // Checked separately
      threshold: 0,
      action: 'request_external_resources',
      reason: 'All internal resources at capacity'
    }
  ];

  /**
   * Check if incident needs escalation
   */
  async checkEscalation(incident: IIncident): Promise<boolean> {
    for (const rule of this.rules) {
      if (rule.condition(incident)) {
        await this.triggerEscalation(incident, rule);
        return true;
      }
    }
    return false;
  }

  /**
   * Monitor all active incidents for escalation
   */
  async monitorActiveIncidents(): Promise<void> {
    const activeIncidents = await incidentService.getActiveIncidents();
    
    for (const incident of activeIncidents) {
      await this.checkEscalation(incident);
    }
  }

  /**
   * Trigger escalation
   */
  async triggerEscalation(
    incident: IIncident,
    rule: EscalationRule
  ): Promise<IEscalation> {
    const escalation = new Escalation({
      incident_id: incident._id,
      type: rule.type,
      from_level: incident.escalation_level,
      to_level: incident.escalation_level + 1,
      reason: rule.reason,
      status: EscalationStatus.PENDING,
      rule: {
        condition: rule.condition.toString(),
        threshold: rule.threshold,
        action: rule.action
      }
    });

    await escalation.save();

    // Update incident escalation level
    await incidentService.escalateIncident(incident.incident_id);

    return escalation;
  }

  /**
   * Manual escalation
   */
  async manualEscalation(
    incidentId: string,
    reason: string,
    userId: string
  ): Promise<IEscalation> {
    const incident = await incidentService.getIncidentById(incidentId);
    
    if (!incident) {
      throw new Error('Incident not found');
    }

    const escalation = new Escalation({
      incident_id: incident._id,
      type: EscalationType.MANUAL,
      from_level: incident.escalation_level,
      to_level: incident.escalation_level + 1,
      reason: `Manual escalation by ${userId}: ${reason}`,
      status: EscalationStatus.PENDING
    });

    await escalation.save();
    await incidentService.escalateIncident(incidentId);

    return escalation;
  }

  /**
   * Acknowledge escalation
   */
  async acknowledgeEscalation(
    escalationId: string,
    userId: string
  ): Promise<IEscalation | null> {
    return Escalation.findByIdAndUpdate(
      escalationId,
      {
        status: EscalationStatus.ACKNOWLEDGED,
        acknowledged_at: new Date(),
        $push: { notified_users: userId }
      },
      { new: true }
    ).exec();
  }

  /**
   * Resolve escalation
   */
  async resolveEscalation(escalationId: string): Promise<IEscalation | null> {
    return Escalation.findByIdAndUpdate(
      escalationId,
      {
        status: EscalationStatus.RESOLVED,
        resolved_at: new Date()
      },
      { new: true }
    ).exec();
  }

  /**
   * Get escalations for an incident
   */
  async getEscalationsByIncident(incidentId: string): Promise<IEscalation[]> {
    const incident = await incidentService.getIncidentById(incidentId);
    
    if (!incident) {
      return [];
    }

    return Escalation.find({ incident_id: incident._id })
      .sort({ triggered_at: -1 })
      .exec();
  }

  /**
   * Get pending escalations
   */
  async getPendingEscalations(): Promise<IEscalation[]> {
    return Escalation.find({ status: EscalationStatus.PENDING })
      .populate('incident_id')
      .sort({ triggered_at: -1 })
      .exec();
  }

  /**
   * Get escalation statistics
   */
  async getStatistics(): Promise<{
    total: number;
    byType: Record<string, number>;
    byStatus: Record<string, number>;
    averageResolutionTime: number | null;
  }> {
    const total = await Escalation.countDocuments();

    const byType = await Escalation.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);

    const byStatus = await Escalation.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const resolutionTimeResult = await Escalation.aggregate([
      {
        $match: {
          resolved_at: { $exists: true }
        }
      },
      {
        $project: {
          resolutionTime: {
            $divide: [
              { $subtract: ['$resolved_at', '$triggered_at'] },
              60000
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          avgResolutionTime: { $avg: '$resolutionTime' }
        }
      }
    ]);

    return {
      total,
      byType: Object.fromEntries(byType.map((t: any) => [t._id, t.count])),
      byStatus: Object.fromEntries(byStatus.map((s: any) => [s._id, s.count])),
      averageResolutionTime: resolutionTimeResult[0]?.avgResolutionTime || null
    };
  }
}

export default new EscalationService();
