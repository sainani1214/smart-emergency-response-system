import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { assignmentsAPI, incidentsAPI } from '../services/api';
import { responderSocketService } from '../services/socket';
import { COLORS, SIZES } from '../constants/theme';
import { Assignment, Incident, ResponderAssignmentStatus } from '../types';

export default function ResponderDashboard() {
  const [mode, setMode] = useState<'queue' | 'map'>('queue');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [eligibleUnitsCount, setEligibleUnitsCount] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    try {
      const openIncidents = await incidentsAPI.listOpen();
      setIncidents(openIncidents);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    (async () => {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') return;
      const current = await Location.getCurrentPositionAsync({});
      setLocation({
        latitude: current.coords.latitude,
        longitude: current.coords.longitude
      });
    })();

    const socket = responderSocketService.connect();
    responderSocketService.subscribe('operators');

    const refreshQueue = () => {
      loadData();
    };

    socket.on('incident:created', refreshQueue);
    socket.on('incident:updated', refreshQueue);
    socket.on('incident:assigned', refreshQueue);

    return () => {
      socket.off('incident:created', refreshQueue);
      socket.off('incident:updated', refreshQueue);
      socket.off('incident:assigned', refreshQueue);
      responderSocketService.unsubscribe('operators');
    };
  }, [loadData]);

  useEffect(() => {
    if (!selectedIncident) {
      setEligibleUnitsCount(null);
      return;
    }

    incidentsAPI
      .listNearbyEligibleResources(selectedIncident.type)
      .then((data) => {
        const resources = Array.isArray(data) ? data : data?.resources ?? [];
        setEligibleUnitsCount(resources.length);
      })
      .catch(() => setEligibleUnitsCount(null));
  }, [selectedIncident]);

  const activeAssignments = useMemo(() => {
    return assignments.filter((assignment) => !['completed', 'cancelled', 'rejected'].includes(assignment.status));
  }, [assignments]);

  const acceptIncident = async () => {
    if (!selectedIncident) return;
    try {
      // Try smart matching first
      let matchedResourceId = null;
      let assignmentMeta = {};

      try {
        const smartMatch = await assignmentsAPI.smartAssign(selectedIncident.incident_id);
        matchedResourceId = smartMatch?.selectedResource?.resource_id || smartMatch?.selectedResource?._id;
        assignmentMeta = {
          distance: smartMatch?.selectedResource?.distance,
          eta: smartMatch?.selectedResource?.estimatedArrival,
          score: smartMatch?.selectedResource?.score,
        };
      } catch (smartMatchError: any) {
        const errorMsg = smartMatchError?.response?.data?.message || smartMatchError?.message || 'Unknown error';
        console.log('Smart match failed, trying manual resource selection:', errorMsg);
        
        // Fallback: Try to get any available eligible resource
        const eligibleData = await incidentsAPI.listNearbyEligibleResources(selectedIncident.type);
        const resources = Array.isArray(eligibleData) ? eligibleData : eligibleData?.resources ?? [];
        const availableResource = resources.find((r: any) => r.status === 'available');
        
        if (availableResource) {
          matchedResourceId = availableResource.resource_id || availableResource._id;
          console.log('Found available resource manually:', matchedResourceId);
        }
      }

      if (!matchedResourceId) {
        throw new Error('No available resources found for this incident type. All units may be currently deployed.');
      }

      const assignment = await assignmentsAPI.create(selectedIncident.incident_id, matchedResourceId, assignmentMeta);

      setAssignments((current) => [assignment, ...current]);
      setIncidents((current) => current.filter((item) => item.incident_id !== selectedIncident.incident_id));
      setSelectedIncident(null);
    } catch (error: any) {
      Alert.alert(
        'Unable to accept incident',
        error?.response?.data?.details?.message || error?.response?.data?.message || error?.message || 'Please try again.'
      );
    }
  };

  const updateAssignment = async (assignment: Assignment, status: ResponderAssignmentStatus) => {
    const assignmentId = assignment.assignment_id || assignment._id;
    if (!assignmentId) return;

    await assignmentsAPI.updateStatus(assignmentId, status);
    setAssignments((current) =>
      current.map((item) =>
        (item.assignment_id || item._id) === assignmentId ? { ...item, status } : item
      )
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.white} />
        <Text style={styles.loadingText}>Preparing responder dashboard…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
      >
        <View style={styles.hero}>
          <View>
            <Text style={styles.eyebrow}>RESPONDER CONSOLE</Text>
            <Text style={styles.heroTitle}>Prioritize, accept, and track live incidents</Text>
            <Text style={styles.heroSubtitle}>
              Designed for demos and dispatcher-style workflows with strong visual hierarchy and fast decision points.
            </Text>
          </View>
          <View style={styles.toggleRow}>
            <Pressable style={[styles.toggleButton, mode === 'queue' && styles.toggleButtonActive]} onPress={() => setMode('queue')}>
              <Text style={[styles.toggleButtonText, mode === 'queue' && styles.toggleButtonTextActive]}>Queue</Text>
            </Pressable>
            <Pressable style={[styles.toggleButton, mode === 'map' && styles.toggleButtonActive]} onPress={() => setMode('map')}>
              <Text style={[styles.toggleButtonText, mode === 'map' && styles.toggleButtonTextActive]}>Map</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.statsRow}>
          <StatCard label="Open incidents" value={String(incidents.length)} tone="blue" />
          <StatCard label="Active assignments" value={String(activeAssignments.length)} tone="green" />
        </View>

        {mode === 'map' ? (
          <View style={styles.mapCard}>
            <MapView
              style={styles.map}
              initialRegion={{
                latitude: location?.latitude ?? 18.521,
                longitude: location?.longitude ?? 73.857,
                latitudeDelta: 0.09,
                longitudeDelta: 0.09
              }}
              showsUserLocation
            >
              {incidents.map((incident) => (
                <Marker
                  key={incident.incident_id}
                  coordinate={{ latitude: incident.location.lat, longitude: incident.location.lng }}
                  title={incident.type}
                  description={incident.description}
                  pinColor={getSeverityColor(incident.severity)}
                  onPress={() => setSelectedIncident(incident)}
                />
              ))}
            </MapView>
          </View>
        ) : (
          <>
            {activeAssignments.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Active assignments</Text>
                {activeAssignments.map((assignment) => (
                  <View key={assignment.assignment_id || assignment._id || Math.random()} style={styles.assignmentCard}>
                    <Text style={styles.assignmentTitle}>Responder action required</Text>
                    <Text style={styles.assignmentStatus}>{formatAssignmentStatus(assignment.status)}</Text>
                    <View style={styles.assignmentActions}>
                      {['assigned', 'pending'].includes(assignment.status) ? (
                        <ActionButton label="Mark en route" color={COLORS.warning} onPress={() => updateAssignment(assignment, 'en-route')} />
                      ) : null}
                      {['en-route', 'accepted'].includes(assignment.status) ? (
                        <ActionButton label="Mark on scene" color={COLORS.secondary} onPress={() => updateAssignment(assignment, 'on-scene')} />
                      ) : null}
                      {['on-scene', 'in-progress'].includes(assignment.status) ? (
                        <ActionButton label="Complete" color={COLORS.success} onPress={() => updateAssignment(assignment, 'completed')} />
                      ) : null}
                    </View>
                  </View>
                ))}
              </View>
            ) : null}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Incoming emergency queue</Text>
              {incidents.map((incident) => (
                <Pressable key={incident.incident_id} style={styles.incidentCard} onPress={() => setSelectedIncident(incident)}>
                  <View style={styles.incidentHeader}>
                    <View>
                      <Text style={styles.incidentType}>{formatLabel(incident.type)}</Text>
                      <Text style={styles.incidentReference}>#{incident.incident_id}</Text>
                    </View>
                    <View style={[styles.severityPill, { backgroundColor: getSeverityColor(incident.severity) }]}>
                      <Text style={styles.severityPillText}>{formatLabel(incident.severity)}</Text>
                    </View>
                  </View>
                  <Text style={styles.incidentDescription}>{incident.description}</Text>
                  <Text style={styles.incidentMeta}>{incident.location.address || `${incident.location.lat}, ${incident.location.lng}`}</Text>
                </Pressable>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      <Modal visible={Boolean(selectedIncident)} transparent animationType="slide" onRequestClose={() => setSelectedIncident(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {selectedIncident ? (
              <>
                <Text style={styles.modalTitle}>{formatLabel(selectedIncident.type)} incident</Text>
                <Text style={styles.modalDescription}>{selectedIncident.description}</Text>
                <View style={styles.detailBlock}>
                  <Text style={styles.detailLabel}>Severity</Text>
                  <Text style={styles.detailValue}>{formatLabel(selectedIncident.severity)}</Text>
                </View>
                <View style={styles.detailBlock}>
                  <Text style={styles.detailLabel}>Location</Text>
                  <Text style={styles.detailValue}>{selectedIncident.location.address || `${selectedIncident.location.lat}, ${selectedIncident.location.lng}`}</Text>
                </View>
                <View style={styles.detailBlock}>
                  <Text style={styles.detailLabel}>Reporter</Text>
                  <Text style={styles.detailValue}>{selectedIncident.reporter.name} · {selectedIncident.reporter.contact}</Text>
                </View>
                <View style={styles.detailBlock}>
                  <Text style={styles.detailLabel}>Eligible nearby units</Text>
                  <Text style={styles.detailValue}>{eligibleUnitsCount ?? '…'} units currently match this incident type</Text>
                </View>
                <View style={styles.modalActions}>
                  <ActionButton label="Reject" color={COLORS.danger} onPress={() => setSelectedIncident(null)} compact />
                  <ActionButton label="Accept" color={COLORS.success} onPress={acceptIncident} compact />
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function StatCard({ label, value, tone }: { label: string; value: string; tone: 'blue' | 'green' }) {
  return (
    <View style={[styles.statCard, tone === 'green' ? styles.statCardGreen : styles.statCardBlue]}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ActionButton({ label, color, onPress, compact = false }: { label: string; color: string; onPress: () => void; compact?: boolean }) {
  return (
    <Pressable style={[styles.actionButton, { backgroundColor: color }, compact && styles.actionButtonCompact]} onPress={onPress}>
      <Text style={styles.actionButtonText}>{label}</Text>
    </Pressable>
  );
}

function formatLabel(value: string) {
  return value.replace(/-/g, ' ').replace(/\b\w/g, (match) => match.toUpperCase());
}

function formatAssignmentStatus(value: string) {
  if (value === 'in-progress') return 'In Progress';
  return formatLabel(value);
}

function getSeverityColor(severity: Incident['severity']) {
  switch (severity) {
    case 'low':
      return COLORS.low;
    case 'medium':
      return COLORS.medium;
    case 'high':
      return COLORS.high;
    case 'critical':
      return COLORS.critical;
    default:
      return COLORS.badgeBlue;
  }
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  centered: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center'
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.textSecondary,
    fontSize: SIZES.md
  },
  container: {
    flex: 1
  },
  content: {
    padding: SIZES.paddingLg,
    gap: 16,
    paddingBottom: 48
  },
  hero: {
    backgroundColor: COLORS.backgroundElevated,
    borderRadius: SIZES.radiusLg,
    padding: SIZES.paddingLg,
    gap: 18
  },
  eyebrow: {
    color: COLORS.textMuted,
    fontSize: SIZES.xs,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 6
  },
  heroTitle: {
    color: COLORS.text,
    fontSize: SIZES.xxl,
    fontWeight: '700',
    lineHeight: 34
  },
  heroSubtitle: {
    marginTop: 8,
    color: COLORS.textSecondary,
    fontSize: SIZES.md,
    lineHeight: 22
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    padding: 4,
    borderRadius: 999,
    gap: 8,
    alignSelf: 'flex-start'
  },
  toggleButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999
  },
  toggleButtonActive: {
    backgroundColor: COLORS.white
  },
  toggleButtonText: {
    color: COLORS.textSecondary,
    fontWeight: '600'
  },
  toggleButtonTextActive: {
    color: COLORS.primary
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12
  },
  statCard: {
    flex: 1,
    borderRadius: SIZES.radius,
    padding: 16
  },
  statCardBlue: {
    backgroundColor: '#132343'
  },
  statCardGreen: {
    backgroundColor: '#0B2B25'
  },
  statValue: {
    color: COLORS.text,
    fontSize: 26,
    fontWeight: '700'
  },
  statLabel: {
    color: COLORS.textSecondary,
    marginTop: 4,
    fontSize: SIZES.sm
  },
  mapCard: {
    overflow: 'hidden',
    borderRadius: SIZES.radiusLg,
    height: 420
  },
  map: {
    flex: 1
  },
  section: {
    gap: 12
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: SIZES.xl,
    fontWeight: '700'
  },
  assignmentCard: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radius,
    padding: 16
  },
  assignmentTitle: {
    color: COLORS.text,
    fontSize: SIZES.lg,
    fontWeight: '700'
  },
  assignmentStatus: {
    color: COLORS.textSecondary,
    marginTop: 4
  },
  assignmentActions: {
    marginTop: 14
  },
  incidentCard: {
    backgroundColor: COLORS.backgroundElevated,
    borderRadius: SIZES.radius,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12
  },
  incidentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center'
  },
  incidentType: {
    color: COLORS.text,
    fontSize: SIZES.lg,
    fontWeight: '700'
  },
  incidentReference: {
    marginTop: 4,
    color: COLORS.textMuted,
    fontSize: SIZES.sm
  },
  severityPill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  severityPillText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: SIZES.sm
  },
  incidentDescription: {
    marginTop: 12,
    color: COLORS.textSecondary,
    fontSize: SIZES.md,
    lineHeight: 22
  },
  incidentMeta: {
    marginTop: 10,
    color: COLORS.textMuted,
    fontSize: SIZES.sm
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end'
  },
  modalCard: {
    backgroundColor: COLORS.backgroundElevated,
    padding: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    gap: 14
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: SIZES.xl,
    fontWeight: '700'
  },
  modalDescription: {
    color: COLORS.textSecondary,
    fontSize: SIZES.md,
    lineHeight: 22
  },
  detailBlock: {
    gap: 4
  },
  detailLabel: {
    color: COLORS.textMuted,
    fontSize: SIZES.sm,
    fontWeight: '600'
  },
  detailValue: {
    color: COLORS.text,
    fontSize: SIZES.md
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8
  },
  actionButton: {
    minHeight: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16
  },
  actionButtonCompact: {
    flex: 1
  },
  actionButtonText: {
    color: COLORS.white,
    fontWeight: '700'
  }
});