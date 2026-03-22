import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { UserAppStackParamList } from '../../App';
import { COLORS, SIZES } from '../constants/theme';
import { incidentsAPI, simulationAPI } from '../services/api';
import { socketService } from '../services/socket';
import { EmergencySimulationStatus, IncidentSeverity, IncidentWithAssignment, IncidentType, TrackingUpdate } from '../types';

type Props = NativeStackScreenProps<UserAppStackParamList, 'LiveTracking'>;

interface RealtimePosition {
  lat: number;
  lng: number;
  timestamp: string;
}

interface MapPoint {
  lat: number;
  lng: number;
}

export default function LiveTrackingScreen({ navigation, route }: Props) {
  const { incidentId, simulationId } = route.params;
  const [incident, setIncident] = useState<IncidentWithAssignment | null>(null);
  const [tracking, setTracking] = useState<EmergencySimulationStatus | null>(null);
  const [realtimePosition, setRealtimePosition] = useState<RealtimePosition | null>(null);
  const [displayPosition, setDisplayPosition] = useState<MapPoint | null>(null);
  const [markerHeading, setMarkerHeading] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const markerScale = useRef(new Animated.Value(0.96)).current;
  const mapRef = useRef<MapView>(null);
  const lastRealtimePositionRef = useRef<MapPoint | null>(null);
  const hasSimulationId = Boolean(simulationId && simulationId !== incidentId && simulationId.trim().length > 0);

  const loadState = useCallback(async () => {
    try {
      setError(null);
      const incidentData = await incidentsAPI.getById(incidentId);
      setIncident(incidentData);

      try {
        const realTracking = await incidentsAPI.getTracking(incidentId);
        setTracking(realTracking);
        return;
      } catch (realTrackingError: any) {
        console.warn('[LiveTracking] Real incident tracking unavailable, checking simulation/fallback mode.', realTrackingError?.response?.status);
      }

      if (hasSimulationId && simulationId) {
        try {
          const trackingData = await simulationAPI.getStatus(simulationId);
          setTracking(trackingData);
        } catch (trackingError: any) {
          console.warn('[LiveTracking] No simulation status found for this incident. Falling back to detail mode.', trackingError?.response?.status);
          setTracking(buildEstimatedTracking(incidentData));
        }
      } else {
        setTracking(buildEstimatedTracking(incidentData));
      }
    } catch (err: any) {
      console.error('Failed to load tracking state:', err);
      setError(extractTrackingErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [hasSimulationId, incidentId, simulationId]);

  useEffect(() => {
    loadState();

    const socket = socketService.connect();
    socketService.subscribe(`incident:${incidentId}`);

    const onIncidentUpdated = (payload: IncidentWithAssignment['incident']) => {
      if (payload.incident_id === incidentId || payload._id === incidentId) {
        setIncident((current) => (current ? { ...current, incident: payload } : current));
      }
    };

    const onTrackingPositionUpdate = (update: {
      incidentId: string;
      position: RealtimePosition;
      responderId: string;
      responderName: string;
      responderType: string;
      progress: number;
      distanceRemaining: number;
      etaMinutes: number;
      status: string;
    }) => {
      if (update.incidentId === incidentId) {
        console.log('[LiveTracking] Realtime position update:', update);
        setRealtimePosition(update.position);

        const nextPoint = { lat: update.position.lat, lng: update.position.lng };
        const previousPoint = lastRealtimePositionRef.current;
        if (previousPoint) {
          setMarkerHeading(calculateBearing(previousPoint, nextPoint));
        }
        lastRealtimePositionRef.current = nextPoint;
        setDisplayPosition(nextPoint);
        Animated.sequence([
          Animated.timing(markerScale, {
            toValue: 1.05,
            duration: 180,
            useNativeDriver: true,
          }),
          Animated.timing(markerScale, {
            toValue: 1,
            duration: 220,
            useNativeDriver: true,
          }),
        ]).start();
        
        // Update tracking ETA
        setTracking((current) => {
          if (!current) return current;
          return {
            ...current,
            assignedResponder: current.assignedResponder ? {
              ...current.assignedResponder,
              responseTimeEstimate: update.etaMinutes,
            } : undefined,
          };
        });

        // Animate map to show both positions
        if (mapRef.current && incident) {
          const userLat = incident.incident.location.lat;
          const userLng = incident.incident.location.lng;
          const midLat = (update.position.lat + userLat) / 2;
          const midLng = (update.position.lng + userLng) / 2;
          const latDelta = Math.abs(update.position.lat - userLat) * 2.5;
          const lngDelta = Math.abs(update.position.lng - userLng) * 2.5;

          mapRef.current.animateToRegion({
            latitude: midLat,
            longitude: midLng,
            latitudeDelta: Math.max(0.02, latDelta),
            longitudeDelta: Math.max(0.02, lngDelta),
          }, 1000);
        }
      }
    };

    socket.on('incident:updated', onIncidentUpdated);
    socket.on('tracking:position_update', onTrackingPositionUpdate);

    const interval = hasSimulationId && simulationId
      ? setInterval(() => {
          simulationAPI.getStatus(simulationId).then(setTracking).catch(() => undefined);
        }, 2000)
      : null;

    let estimatedInterval: ReturnType<typeof setInterval> | null = null;
    if (!hasSimulationId) {
      estimatedInterval = setInterval(() => {
        setTracking((current) => {
          if (!current || current.success !== true) {
            return current;
          }

          return advanceEstimatedTracking(current);
        });
      }, 7000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
      if (estimatedInterval) {
        clearInterval(estimatedInterval);
      }
      socket.off('incident:updated', onIncidentUpdated);
      socket.off('tracking:position_update', onTrackingPositionUpdate);
      socketService.unsubscribe(`incident:${incidentId}`);
    };
  }, [hasSimulationId, incidentId, loadState, simulationId, incident]);

  const latestTrackingPoint = useMemo(() => {
    if (realtimePosition) {
      return {
        location: realtimePosition,
        estimatedArrival: tracking?.assignedResponder?.responseTimeEstimate ?? 0,
      };
    }
    if (!tracking?.trackingUpdates?.length) return null;
    return tracking.trackingUpdates[tracking.trackingUpdates.length - 1];
  }, [tracking, realtimePosition]);

  useEffect(() => {
    if (realtimePosition) {
      return;
    }

    if (tracking?.assignedResponder?.location) {
      const fallbackPoint = {
        lat: tracking.assignedResponder.location.lat,
        lng: tracking.assignedResponder.location.lng,
      };
      setDisplayPosition(fallbackPoint);
      lastRealtimePositionRef.current = fallbackPoint;
      return;
    }

    if (latestTrackingPoint?.location) {
      const fallbackPoint = {
        lat: latestTrackingPoint.location.lat,
        lng: latestTrackingPoint.location.lng,
      };
      setDisplayPosition(fallbackPoint);
      lastRealtimePositionRef.current = fallbackPoint;
    }
  }, [latestTrackingPoint, realtimePosition, tracking]);

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingTitle}>Building live dispatch view…</Text>
        <Text style={styles.loadingSubtitle}>Finding the nearest available responder and syncing ETA.</Text>
      </SafeAreaView>
    );
  }

  if (error || !incident) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>Unable to load tracking</Text>
        <Text style={styles.errorSubtitle}>
          {error || 'The incident data could not be found. It may have been recently created and needs a moment to sync.'}
        </Text>
        <Pressable style={styles.retryButton} onPress={() => { setLoading(true); loadState(); }}>
          <Text style={styles.retryButtonText}>Try again</Text>
        </Pressable>
        <Pressable style={styles.secondaryAction} onPress={() => navigation.navigate('MyReports')}>
          <Text style={styles.secondaryActionText}>Go to my reports</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const responderLocation = displayPosition || realtimePosition || latestTrackingPoint?.location || tracking?.assignedResponder?.location;
  const userLocation = tracking?.userLocation || {
    lat: incident.incident.location.lat,
    lng: incident.incident.location.lng,
    address: incident.incident.location.address || 'Incident location',
  };
  const acceptedResponder = incident.latestAssignment?.responder_id;
  const assignedResource = incident.latestAssignment?.resource_id || incident.incident.assigned_resource;
  const hasLiveTracking = Boolean(tracking);
  const activeTracking = tracking;
  const queueCount = tracking?.nearestResponders.length ?? (acceptedResponder || assignedResource ? 1 : 0);
  
  // Get ETA - prioritize real-time updates, then assignment, then tracking
  const etaMinutes = tracking?.assignedResponder?.responseTimeEstimate 
    ?? latestTrackingPoint?.estimatedArrival 
    ?? incident.latestAssignment?.eta;
  const etaLabel = etaMinutes ? `${etaMinutes} min` : '0 min';

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadState(); }} />}
      >
        <View style={styles.heroCard}>
          <Text style={styles.heroEyebrow}>{hasLiveTracking ? 'LIVE DISPATCH' : 'INCIDENT DETAIL'}</Text>
          <Text style={styles.heroTitle}>{activeTracking ? getStatusHeadline(activeTracking.status) : getIncidentHeadline(incident)}</Text>
          <Text style={styles.heroSubtitle}>{activeTracking ? getStatusSubtitle(activeTracking) : getIncidentSubtitle(incident)}</Text>
          <View style={styles.heroMetaRow}>
            <MetaPill label={`Ref #${incident.incident.incident_id}`} />
            <MetaPill label={formatLabel(incident.incident.severity)} />
            <MetaPill label={formatLabel(incident.incident.type)} />
          </View>
        </View>

        {!hasLiveTracking ? (
          <View style={styles.noticeCard}>
            <Text style={styles.noticeTitle}>Estimated responder route is active for this report</Text>
            <Text style={styles.noticeText}>
              We’re showing a simulated 5–10 minute tracking experience so users still get a clean dispatch map and ETA view while waiting for live backend simulation data.
            </Text>
          </View>
        ) : null}

        <View style={styles.statsGrid}>
          <TrackingStatCard title="Response coverage" value={String(queueCount)} helper={hasLiveTracking ? 'Available units in match queue' : 'Known assigned unit coverage'} />
          <TrackingStatCard title="ETA" value={etaLabel} helper={hasLiveTracking ? 'Live arrival estimate' : 'Latest known dispatch estimate'} />
        </View>

        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Current status</Text>
            <Text style={styles.summaryValue}>{formatLabel(incident.incident.status)}</Text>
            <Text style={styles.summaryHint}>{statusLabel(incident.incident.status)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Reported time</Text>
            <Text style={styles.summaryValue}>{new Date(incident.incident.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
            <Text style={styles.summaryHint}>{new Date(incident.incident.created_at).toLocaleDateString()}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Assigned responder</Text>
          <Text style={styles.cardSubtitle}>Auto-assigned resource based on proximity and availability.</Text>
          <View style={[styles.resourceRow, (acceptedResponder || tracking?.assignedResponder) && styles.resourceRowActive]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.resourceName}>{acceptedResponder?.name || tracking?.assignedResponder?.name || 'Assigning...'}</Text>
              <Text style={styles.resourceMeta}>
                {acceptedResponder?.responder_type
                  ? formatLabel(acceptedResponder.responder_type)
                  : assignedResource?.type
                    ? `${formatLabel(assignedResource.type)} unit`
                    : 'Finding nearest responder'}
              </Text>
              {assignedResource?.unit_id ? <Text style={styles.resourceMeta}>Unit: {assignedResource.unit_id}</Text> : null}
            </View>
            <View style={[styles.resourceBadge, (acceptedResponder || tracking?.assignedResponder) && styles.resourceBadgeActive]}>
              <Text style={[styles.resourceBadgeText, (acceptedResponder || tracking?.assignedResponder) && styles.resourceBadgeTextActive]}>
                {acceptedResponder || tracking?.assignedResponder ? 'Responding' : 'Pending'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.mapCard}>
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={{
              latitude: userLocation.lat,
              longitude: userLocation.lng,
              latitudeDelta: 0.04,
              longitudeDelta: 0.04,
            }}
          >
            <Marker
              coordinate={{ latitude: userLocation.lat, longitude: userLocation.lng }}
              title="Incident location"
              description={userLocation.address}
              pinColor={COLORS.primary}
            />
            {(tracking?.nearestResponders ?? []).map((responder) => {
              // Don't show static marker for assigned responder if we have real-time position
              if (realtimePosition && tracking?.assignedResponder?.id === responder.id) {
                return null;
              }
              return (
                <Marker
                  key={responder.id}
                  coordinate={{ latitude: responder.location.lat, longitude: responder.location.lng }}
                  title={responder.name}
                  description={`${responder.type} · ${responder.responseTimeEstimate} min`}
                  pinColor={tracking?.assignedResponder?.id === responder.id ? COLORS.success : COLORS.secondary}
                />
              );
            })}
            {realtimePosition && responderLocation ? (
              <Marker
                coordinate={{ latitude: responderLocation.lat, longitude: responderLocation.lng }}
                title={tracking?.assignedResponder?.name || 'Responder'}
                description="Live position"
                anchor={{ x: 0.5, y: 0.5 }}
                flat
              >
                <Animated.View
                  style={[
                    styles.liveMarker,
                    {
                      transform: [
                        { rotate: `${markerHeading}deg` },
                        { scale: markerScale },
                      ],
                    },
                  ]}
                >
                  <View style={styles.liveMarkerShadow} />
                  <View style={styles.liveMarkerGlow} />
                  <View style={styles.liveMarkerBody}>
                    <View style={styles.liveMarkerCabin} />
                    <View style={styles.liveMarkerLightLeft} />
                    <View style={styles.liveMarkerLightRight} />
                  </View>
                </Animated.View>
              </Marker>
            ) : null}
            {responderLocation ? (
              <Polyline
                coordinates={[
                  { latitude: responderLocation.lat, longitude: responderLocation.lng },
                  { latitude: userLocation.lat, longitude: userLocation.lng },
                ]}
                strokeColor="#1F2937"
                strokeWidth={2}
                lineCap="round"
                lineJoin="round"
                lineDashPattern={[]}
              />
            ) : null}
          </MapView>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{hasLiveTracking ? 'Nearby units' : 'Response coverage'}</Text>
          <Text style={styles.cardSubtitle}>
            {hasLiveTracking
              ? 'Available emergency units in your area.'
              : 'Current responder and assignment information for this incident is shown here.'}
          </Text>
          {(tracking?.nearestResponders ?? []).map((responder) => {
            const isAssigned = tracking?.assignedResponder?.id === responder.id;
            return (
              <View key={responder.id} style={[styles.resourceRow, isAssigned && styles.resourceRowActive]}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.resourceName} numberOfLines={1}>{responder.name}</Text>
                  <Text style={styles.resourceMeta} numberOfLines={1}>{formatLabel(responder.type)} · {responder.responseTimeEstimate} min away</Text>
                </View>
                <View style={[styles.resourceBadge, isAssigned && styles.resourceBadgeActive]}>
                  <Text style={[styles.resourceBadgeText, isAssigned && styles.resourceBadgeTextActive]}>
                    {isAssigned ? 'Responding' : formatLabel(responder.status)}
                  </Text>
                </View>
              </View>
            );
          })}
          {!tracking?.nearestResponders?.length ? (
            <View style={styles.resourceFallbackCard}>
              <Text style={styles.emptyCopy}>
                {acceptedResponder?.name || assignedResource?.unit_id
                  ? 'Responder assignment data is shown above. Live queue tracking is not available for this report.'
                  : 'No responder queue data is available yet.'}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Responder movement</Text>
          <Text style={styles.cardSubtitle}>
            {hasLiveTracking
              ? 'Live updates will keep appearing as the responder moves toward you.'
              : 'This incident is currently showing dispatch details without simulation route playback.'}
          </Text>
          {!tracking?.trackingUpdates?.length ? (
            <Text style={styles.emptyCopy}>
              {hasLiveTracking
                ? 'We’re still waiting for a responder to accept your request.'
                : 'Movement history will appear here whenever live simulation updates are available.'}
            </Text>
          ) : (
            tracking.trackingUpdates.slice(-4).reverse().map((update, index) => (
              <View key={`${String(update.timestamp)}-${index}`} style={styles.timelineRow}>
                <View style={styles.timelineDot} />
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineTitle}>{update.distanceToUser.toFixed(2)} km away · ETA {update.estimatedArrival} min</Text>
                  <Text style={styles.timelineSubtitle}>{update.location.address}</Text>
                </View>
              </View>
            ))
          )}
        </View>

        <Pressable style={styles.secondaryAction} onPress={() => navigation.navigate('MyReports')}>
          <Text style={styles.secondaryActionText}>Go to my reports</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function TrackingStatCard({ title, value, helper }: { title: string; value: string; helper: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statTitle}>{title}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statHelper}>{helper}</Text>
    </View>
  );
}

function MetaPill({ label }: { label: string }) {
  return (
    <View style={styles.metaPill}>
      <Text style={styles.metaPillText}>{label}</Text>
    </View>
  );
}

function getStatusHeadline(status: EmergencySimulationStatus['status']) {
  switch (status) {
    case 'notifying':
      return 'Finding the best nearby responder';
    case 'assigned':
      return 'A responder accepted your request';
    case 'responding':
      return 'Help is on the way';
    case 'completed':
      return 'Emergency completed';
    case 'timeout':
      return 'Dispatch delayed';
    default:
      return 'Tracking request';
  }
}

function getStatusSubtitle(tracking: EmergencySimulationStatus) {
  if (tracking.status === 'notifying') {
    return 'Nearby responders are being notified in priority order, similar to a dispatch marketplace flow.';
  }
  if (tracking.status === 'assigned' || tracking.status === 'responding') {
    return `${tracking.assignedResponder?.name ?? 'A responder'} is now linked to your emergency and location updates are live.`;
  }
  if (tracking.status === 'completed') {
    return 'This incident has completed. You can still review details in your reports list.';
  }
  return 'The system will retry with additional responders if nobody accepts in time.';
}

function getIncidentHeadline(incident: IncidentWithAssignment) {
  if (incident.incident.status === 'assigned' || incident.incident.status === 'in-progress') {
    return 'Estimated live tracking is active';
  }
  if (incident.incident.status === 'resolved' || incident.incident.status === 'closed') {
    return 'This incident has already been handled';
  }
  return 'Estimated dispatch tracking is active';
}

function getIncidentSubtitle(incident: IncidentWithAssignment) {
  if (incident.latestAssignment?.responder_id?.name) {
    return `${incident.latestAssignment.responder_id.name} is currently linked to this incident. Estimated movement and ETA are shown below until live simulation data is available.`;
  }
  return 'This incident detail view shows estimated ETA, responder positioning, and the latest assignment information even without an active simulation session.';
}

function statusLabel(status: string) {
  switch (status) {
    case 'open':
      return 'Reported and waiting for assignment';
    case 'assigned':
      return 'A responder has accepted the case';
    case 'in_progress':
      return 'Active response is underway';
    case 'resolved':
      return 'Response completed successfully';
    case 'closed':
      return 'Closed and archived';
    default:
      return 'Status recently updated';
  }
}

function buildEstimatedTracking(incidentData: IncidentWithAssignment): EmergencySimulationStatus {
  const incident = incidentData.incident;
  const reporterPoint = incident.location;
  const responderType = mapIncidentTypeToResponder(incident.type);
  const responderName = incidentData.latestAssignment?.responder_id?.name || getEstimatedResponderName(incident.type);
  const baseEta = getEstimatedEta(incident.severity);
  const responderLocation = projectOffsetLocation(reporterPoint.lat, reporterPoint.lng, 0.028, -0.021, incident.location.address || 'Approaching from nearby zone');

  const assignedResponder = {
    id: incidentData.latestAssignment?.responder_id?._id || `${incident.incident_id}-estimated-responder`,
    name: responderName,
    type: responderType,
    location: responderLocation,
    status: 'responding' as const,
    skills: [formatLabel(incident.type), 'rapid response'],
    responseTimeEstimate: baseEta,
  };

  const initialUpdate: TrackingUpdate = {
    responderId: assignedResponder.id,
    location: responderLocation,
    timestamp: new Date().toISOString(),
    distanceToUser: Number(distanceKm(reporterPoint.lat, reporterPoint.lng, responderLocation.lat, responderLocation.lng).toFixed(2)),
    estimatedArrival: baseEta,
  };

  return {
    success: true,
    emergencyId: `${incident.incident_id}-estimated`,
    userLocation: {
      lat: reporterPoint.lat,
      lng: reporterPoint.lng,
      address: incident.location.address || 'Incident location',
    },
    emergencyType: incident.type,
    severity: incident.severity,
    status: baseEta <= 6 ? 'responding' : 'assigned',
    createdAt: incident.created_at,
    nearestResponders: [assignedResponder],
    assignedResponder,
    responseHistory: [
      {
        responderId: assignedResponder.id,
        response: 'accept',
        timestamp: new Date().toISOString(),
        delay: 1.4,
      },
    ],
    trackingUpdates: [initialUpdate],
  };
}

function advanceEstimatedTracking(current: EmergencySimulationStatus): EmergencySimulationStatus {
  if (!current.assignedResponder) {
    return current;
  }

  const lastUpdate = current.trackingUpdates[current.trackingUpdates.length - 1];
  const previousEta = lastUpdate?.estimatedArrival ?? current.assignedResponder.responseTimeEstimate ?? 8;
  const nextEta = Math.max(1, previousEta - 1);
  const progress = Math.min(0.95, 1 - nextEta / Math.max(previousEta, 2));
  const nextLocation = interpolateLocation(current.assignedResponder.location, current.userLocation, progress + 0.15);
  const nextDistance = Number(distanceKm(current.userLocation.lat, current.userLocation.lng, nextLocation.lat, nextLocation.lng).toFixed(2));

  const nextUpdate: TrackingUpdate = {
    responderId: current.assignedResponder.id,
    location: {
      ...nextLocation,
      address: nextEta <= 2 ? 'Responder is almost at the incident location' : 'Responder is moving closer to the incident',
    },
    timestamp: new Date().toISOString(),
    distanceToUser: nextDistance,
    estimatedArrival: nextEta,
  };

  return {
    ...current,
    status: nextEta <= 1 ? 'responding' : 'assigned',
    assignedResponder: {
      ...current.assignedResponder,
      location: nextUpdate.location,
      responseTimeEstimate: nextEta,
    },
    nearestResponders: current.nearestResponders.map((responder) =>
      responder.id === current.assignedResponder?.id
        ? {
            ...responder,
            location: nextUpdate.location,
            responseTimeEstimate: nextEta,
            status: 'responding' as const,
          }
        : responder
    ),
    trackingUpdates: [...current.trackingUpdates.slice(-5), nextUpdate],
  };
}

function mapIncidentTypeToResponder(type: IncidentType) {
  switch (type) {
    case IncidentType.MEDICAL:
      return 'ambulance' as const;
    case IncidentType.FIRE:
      return 'fire_truck' as const;
    case IncidentType.SECURITY:
      return 'police_vehicle' as const;
    default:
      return 'security_unit' as const;
  }
}

function getEstimatedResponderName(type: IncidentType) {
  switch (type) {
    case IncidentType.MEDICAL:
      return 'City ambulance unit';
    case IncidentType.FIRE:
      return 'Fire response unit';
    case IncidentType.SECURITY:
      return 'Rapid safety patrol';
    case IncidentType.WATER:
      return 'Municipal field team';
    case IncidentType.POWER:
      return 'Electrical response crew';
    default:
      return 'Emergency response unit';
  }
}

function getEstimatedEta(severity: IncidentSeverity) {
  switch (severity) {
    case IncidentSeverity.CRITICAL:
      return 5;
    case IncidentSeverity.HIGH:
      return 6;
    case IncidentSeverity.MEDIUM:
      return 8;
    default:
      return 10;
  }
}

function projectOffsetLocation(lat: number, lng: number, latOffset: number, lngOffset: number, address: string) {
  return {
    lat: lat + latOffset,
    lng: lng + lngOffset,
    address,
  };
}

function interpolateLocation(from: { lat: number; lng: number }, to: { lat: number; lng: number }, factor: number) {
  return {
    lat: from.lat + (to.lat - from.lat) * factor,
    lng: from.lng + (to.lng - from.lng) * factor,
  };
}

function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

function extractTrackingErrorMessage(error: unknown) {
  const fallback = 'Unable to load tracking data';

  if (!error || typeof error !== 'object') {
    return fallback;
  }

  const maybeAxios = error as {
    response?: {
      data?: {
        error?: string;
        message?: string;
      };
      status?: number;
    };
    message?: string;
  };

  const responseError = maybeAxios.response?.data?.error || maybeAxios.response?.data?.message;
  if (typeof responseError === 'string' && responseError.trim()) {
    return responseError;
  }

  if (typeof maybeAxios.message === 'string') {
    if (maybeAxios.message.includes('circular structure')) {
      return 'Tracking details could not be loaded. Live simulation data is unavailable for this report, but your incident details can still be viewed.';
    }

    if (maybeAxios.message.includes('404')) {
      return 'Live simulation status was not found for this report. Showing incident details instead.';
    }

    return maybeAxios.message;
  }

  return fallback;
}

function formatLabel(value: string) {
  return value.replace(/_/g, ' ').replace(/-/g, ' ').replace(/\b\w/g, (match) => match.toUpperCase());
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
    padding: 24,
  },
  loadingTitle: {
    marginTop: 16,
    fontSize: SIZES.title3,
    fontWeight: '700',
    color: COLORS.text,
  },
  loadingSubtitle: {
    marginTop: 8,
    textAlign: 'center',
    color: COLORS.textSecondary,
    fontSize: SIZES.footnote,
    lineHeight: 18,
  },
  content: {
    padding: SIZES.paddingLg,
    gap: SIZES.spacingLg,
    paddingBottom: SIZES.spacingXxl * 2,
  },
  heroCard: {
    backgroundColor: COLORS.dark,
    borderRadius: SIZES.radiusXl,
    padding: SIZES.paddingXl,
  },
  heroEyebrow: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: SIZES.caption1,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  heroTitle: {
    color: COLORS.textInverse,
    fontSize: SIZES.title1,
    fontWeight: '700',
    lineHeight: 34,
    marginTop: 10,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.74)',
    fontSize: SIZES.footnote,
    lineHeight: 20,
    marginTop: 10,
  },
  heroMetaRow: {
    marginTop: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaPill: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  metaPillText: {
    color: COLORS.textInverse,
    fontSize: SIZES.caption1,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  noticeCard: {
    backgroundColor: '#FFF7E8',
    borderWidth: 1,
    borderColor: '#F0D48C',
    borderRadius: SIZES.radiusLg,
    padding: SIZES.paddingLg,
    gap: 8,
  },
  noticeTitle: {
    fontSize: SIZES.callout,
    fontWeight: '700',
    color: COLORS.text,
  },
  noticeText: {
    fontSize: SIZES.footnote,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: COLORS.backgroundElevated,
    borderRadius: SIZES.radiusXl,
    padding: SIZES.paddingLg,
  },
  summaryLabel: {
    color: COLORS.textSecondary,
    fontSize: SIZES.caption1,
    fontWeight: '600',
    marginBottom: 8,
  },
  summaryValue: {
    color: COLORS.text,
    fontSize: SIZES.title3,
    fontWeight: '700',
    marginBottom: 6,
  },
  summaryHint: {
    color: COLORS.textSecondary,
    fontSize: SIZES.caption1,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.backgroundElevated,
    borderRadius: SIZES.radiusXl,
    padding: SIZES.paddingLg,
  },
  statTitle: {
    color: COLORS.textSecondary,
    fontSize: SIZES.caption1,
    fontWeight: '600',
  },
  statValue: {
    color: COLORS.text,
    fontSize: SIZES.title1,
    fontWeight: '700',
    marginTop: 8,
  },
  statHelper: {
    color: COLORS.textSecondary,
    fontSize: SIZES.caption1,
    lineHeight: 18,
    marginTop: 6,
  },
  mapCard: {
    height: 320,
    overflow: 'hidden',
    borderRadius: SIZES.radiusXl,
  },
  map: {
    flex: 1,
  },
  card: {
    backgroundColor: COLORS.backgroundElevated,
    borderRadius: SIZES.radiusXl,
    padding: SIZES.paddingLg,
  },
  cardTitle: {
    color: COLORS.text,
    fontSize: SIZES.title3,
    fontWeight: '700',
  },
  cardSubtitle: {
    marginTop: 6,
    marginBottom: 16,
    color: COLORS.textSecondary,
    fontSize: SIZES.footnote,
    lineHeight: 18,
  },
  resourceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 14,
    borderRadius: SIZES.radius,
    marginBottom: 10,
  },
  resourceRowActive: {
    borderWidth: 1,
    borderColor: COLORS.success,
    backgroundColor: '#F3FFF8',
  },
  resourceName: {
    color: COLORS.text,
    fontSize: SIZES.callout,
    fontWeight: '700',
  },
  resourceMeta: {
    marginTop: 4,
    color: COLORS.textSecondary,
    fontSize: SIZES.caption1,
  },
  resourceBadge: {
    backgroundColor: '#F2F4F7',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
  },
  resourceBadgeActive: {
    backgroundColor: COLORS.success,
  },
  resourceBadgeText: {
    color: COLORS.text,
    fontSize: SIZES.caption1,
    fontWeight: '700',
  },
  resourceBadgeTextActive: {
    color: COLORS.textInverse,
  },
  resourceFallbackCard: {
    marginTop: 4,
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radius,
    padding: 14,
  },
  emptyCopy: {
    color: COLORS.textSecondary,
    fontSize: SIZES.footnote,
    lineHeight: 18,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.secondary,
    marginTop: 6,
  },
  timelineContent: {
    flex: 1,
  },
  timelineTitle: {
    color: COLORS.text,
    fontSize: SIZES.footnote,
    fontWeight: '700',
  },
  timelineSubtitle: {
    marginTop: 4,
    color: COLORS.textSecondary,
    fontSize: SIZES.caption1,
    lineHeight: 18,
  },
  secondaryAction: {
    minHeight: 52,
    borderRadius: 18,
    backgroundColor: COLORS.backgroundElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryActionText: {
    color: COLORS.text,
    fontSize: SIZES.callout,
    fontWeight: '700',
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: SIZES.title2,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginTop: 8,
  },
  errorSubtitle: {
    marginTop: 12,
    textAlign: 'center',
    color: COLORS.textSecondary,
    fontSize: SIZES.footnote,
    lineHeight: 20,
    paddingHorizontal: 32,
  },
  retryButton: {
    marginTop: 24,
    minHeight: 52,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  retryButtonText: {
    color: COLORS.textInverse,
    fontSize: SIZES.callout,
    fontWeight: '700',
  },
  liveMarker: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveMarkerShadow: {
    position: 'absolute',
    width: 30,
    height: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(15, 23, 42, 0.16)',
    bottom: 5,
    transform: [{ scaleX: 1.08 }],
  },
  liveMarkerGlow: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0, 122, 255, 0.12)',
  },
  liveMarkerBody: {
    width: 28,
    height: 18,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    borderWidth: 2,
    borderColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
    position: 'relative',
  },
  liveMarkerCabin: {
    width: 12,
    height: 8,
    borderRadius: 3,
    backgroundColor: COLORS.white,
  },
  liveMarkerLightLeft: {
    position: 'absolute',
    left: 3,
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#DBEAFE',
  },
  liveMarkerLightRight: {
    position: 'absolute',
    right: 3,
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#DBEAFE',
  },
});

function calculateBearing(from: MapPoint, to: MapPoint): number {
  const startLat = toRadians(from.lat);
  const startLng = toRadians(from.lng);
  const endLat = toRadians(to.lat);
  const endLng = toRadians(to.lng);
  const deltaLng = endLng - startLng;

  const y = Math.sin(deltaLng) * Math.cos(endLat);
  const x = Math.cos(startLat) * Math.sin(endLat) - Math.sin(startLat) * Math.cos(endLat) * Math.cos(deltaLng);
  const bearing = (toDegrees(Math.atan2(y, x)) + 360) % 360;
  return Number.isFinite(bearing) ? bearing : 0;
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function toDegrees(value: number): number {
  return (value * 180) / Math.PI;
}