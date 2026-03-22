import { Responder } from '../../models/Responder';
import { calculateDistance, calculateETA } from '../../utils/helpers';
import incidentService from './incident.service';
import assignmentService from '../assignment/assignment.service';
import resourceService from '../resource/resource.service';

function interpolate(start: number, end: number, ratio: number) {
  return start + (end - start) * ratio;
}

function formatRouteAddress(label: string, step: number, total: number) {
  return `${label} · checkpoint ${step}/${total}`;
}

export class IncidentTrackingService {
  async getTrackingByIncidentId(incidentId: string) {
    console.log(`[IncidentTracking] Getting tracking for incident: ${incidentId}`);
    
    const detail = await incidentService.getIncidentWithAssignmentDetails(incidentId);
    if (!detail) {
      console.log(`[IncidentTracking] No incident found for ID: ${incidentId}`);
      return null;
    }

    const incident = detail.incident;
    const assignment = detail.latestAssignment;
    
    console.log('[IncidentTracking] Assignment:', assignment ? {
      id: assignment._id,
      status: assignment.status,
      eta: assignment.eta,
      resource_id: assignment.resource_id?._id,
      responder_id: assignment.responder_id?._id,
    } : 'None');
  
    const assignedResource = assignment?.resource_id?._id
      ? await resourceService.getResourceByObjectId(String(assignment.resource_id._id))
      : incident.assigned_resource?._id
        ? await resourceService.getResourceByObjectId(String(incident.assigned_resource._id))
        : null;

    console.log('[IncidentTracking] Assigned resource:', assignedResource ? {
      id: assignedResource._id,
      unit_id: assignedResource.unit_id,
      type: assignedResource.type,
      location: assignedResource.location,
    } : 'None');

    let assignedResponder = assignment?.responder_id?._id
      ? await Responder.findById(String(assignment.responder_id._id)).exec()
      : null;

    if (!assignedResponder && assignedResource?.assigned_responder_id) {
      assignedResponder = await Responder.findById(String(assignedResource.assigned_responder_id)).exec();
    }

    console.log('[IncidentTracking] Assigned responder:', assignedResponder ? {
      id: assignedResponder._id,
      name: assignedResponder.name,
      type: assignedResponder.responder_type,
      location: assignedResponder.location,
    } : 'None');

    const eligibleResources = await assignmentService.getEligibleResources(incident.type);
    const nearbyUnits = eligibleResources
      .filter((resource) => !assignedResource || String(resource._id) !== String(assignedResource._id))
      .slice(0, 3);

    const responderLat = assignedResponder?.location?.lat ?? assignedResource?.location?.lat ?? incident.location.lat + 0.012;
    const responderLng = assignedResponder?.location?.lng ?? assignedResource?.location?.lng ?? incident.location.lng + 0.012;
    const distanceKm = calculateDistance(incident.location.lat, incident.location.lng, responderLat, responderLng);
    const fallbackEta = Math.max(5, Math.min(10, Math.round(calculateETA(distanceKm) || 7)));
    const eta = assignment?.eta ?? fallbackEta;
    const routeSteps = 5;
    const trackingUpdates = Array.from({ length: routeSteps }, (_, index) => {
      const ratio = (index + 1) / routeSteps;
      const lat = interpolate(responderLat, incident.location.lat, ratio);
      const lng = interpolate(responderLng, incident.location.lng, ratio);
      const remainingDistance = Number((distanceKm * (1 - ratio)).toFixed(2));
      const remainingEta = Math.max(0, Math.round(eta * (1 - ratio)));

      return {
        responderId: assignedResponder?.responder_id || assignedResponder?._id?.toString() || assignedResource?._id?.toString() || 'estimated-unit',
        location: {
          lat: Number(lat.toFixed(6)),
          lng: Number(lng.toFixed(6)),
          address: formatRouteAddress(incident.location.address || 'Incident approach route', index + 1, routeSteps),
        },
        timestamp: new Date(Date.now() - (routeSteps - index - 1) * 60_000).toISOString(),
        distanceToUser: remainingDistance,
        estimatedArrival: remainingEta,
      };
    });

    const result = {
      success: true,
      incidentId: incident.incident_id,
      mode: 'real-assignment',
      status:
        incident.status === 'closed' || incident.status === 'resolved'
          ? 'completed'
          : assignedResponder || assignedResource
            ? 'responding'
            : 'notifying',
      emergencyType: incident.type,
      severity: incident.severity,
      createdAt: incident.created_at,
      userLocation: {
        lat: incident.location.lat,
        lng: incident.location.lng,
        address: incident.location.address || 'Incident location',
      },
      assignedResponder: assignedResponder
        ? {
            id: assignedResponder._id.toString(),
            name: assignedResponder.name,
            type: assignedResponder.responder_type,
            location: {
              lat: responderLat,
              lng: responderLng,
              address: incident.location.address || 'Incident response area',
            },
            status: assignedResponder.status,
            skills: assignedResponder.skills,
            responseTimeEstimate: eta,
          }
        : assignedResource
          ? {
              id: assignedResource._id.toString(),
              name: assignedResource.operator_name || assignedResource.unit_id,
              type: assignedResource.type,
              location: {
                lat: responderLat,
                lng: responderLng,
                address: incident.location.address || 'Incident response area',
              },
              status: assignedResource.status,
              skills: assignedResource.skills,
              responseTimeEstimate: eta,
            }
          : undefined,
      nearestResponders: [assignedResource, ...nearbyUnits]
        .filter(Boolean)
        .map((resource) => ({
          id: resource!._id.toString(),
          name: resource!.operator_name || resource!.unit_id,
          type: resource!.type as any,
          location: {
            lat: resource!.location.lat,
            lng: resource!.location.lng,
            address: incident.location.address || 'Operational zone',
          },
          status: resource === assignedResource ? 'responding' : resource!.status === 'available' ? 'available' : 'busy',
          skills: resource!.skills,
          responseTimeEstimate: Math.max(2, Math.round(calculateETA(calculateDistance(incident.location.lat, incident.location.lng, resource!.location.lat, resource!.location.lng)) || 6)),
        })),
      responseHistory: assignedResponder || assignedResource
        ? [
            {
              responderId: assignedResponder?.responder_id || assignedResponder?._id?.toString() || assignedResource!._id.toString(),
              response: 'accept',
              timestamp: assignment?.accepted_at || assignment?.assigned_at || incident.created_at,
              delay: eta,
            },
          ]
        : [],
      trackingUpdates,
      assignment: {
        eta,
        distance: Number(distanceKm.toFixed(2)),
        resourceId: assignedResource?._id?.toString(),
        responderId: assignedResponder?._id?.toString(),
      },
    };

    console.log('[IncidentTracking] Returning tracking result:', {
      success: result.success,
      status: result.status,
      hasAssignedResponder: !!result.assignedResponder,
      nearestRespondersCount: result.nearestResponders.length,
      trackingUpdatesCount: result.trackingUpdates.length,
      eta: result.assignment.eta,
      distance: result.assignment.distance,
    });

    return result;
  }
}

export default new IncidentTrackingService();
