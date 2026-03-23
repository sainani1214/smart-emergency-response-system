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
import { assignmentsAPI, incidentsAPI, notificationsAPI } from '../services/api';
import { responderSocketService } from '../services/socket';
import { COLORS, SIZES } from '../constants/theme';
import { AppNotification, Assignment, Incident, ResponderAssignmentStatus } from '../types';
import { storage } from '../services/storage';

export default function ResponderDashboard() {
  const [mode, setMode] = useState<'queue' | 'map'>('queue');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [eligibleUnitsCount, setEligibleUnitsCount] = useState<number | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [notificationOpen, setNotificationOpen] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const openIncidents = await incidentsAPI.listOpen();
      setIncidents(openIncidents);

      try {
        const rawResponder = await storage.getItem('responderData');
        if (rawResponder) {
          const responder = JSON.parse(rawResponder);
          const recipient = responder.id || responder.email;
          if (recipient) {
            const items = await notificationsAPI.list({ recipient, limit: 50 });
            setNotifications([...items].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
          }
        }
      } catch {
        setNotifications([]);
      }
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

  const unreadCount = useMemo(() => notifications.filter((item) => item.status !== 'read').length, [notifications]);

  const acceptIncident = async () => {
    if (!selectedIncident) return;
    try {
      const existingAssignments = await assignmentsAPI.listByIncident(selectedIncident.incident_id);
      const claimableAssignment = existingAssignments.find((assignment) => {
        const assignmentIncidentId =
          typeof assignment.incident_id === 'string'
            ? assignment.incident_id
            : assignment.incident_id?.incident_id;

        return (
          assignmentIncidentId === selectedIncident.incident_id &&
          ['pending', 'assigned', 'accepted', 'in-progress'].includes(assignment.status)
        );
      });

      if (claimableAssignment) {
        const assignmentId = claimableAssignment.assignment_id || claimableAssignment._id;
        const acceptedAssignment = assignmentId
          ? await assignmentsAPI.updateStatus(assignmentId, 'en-route')
          : claimableAssignment;

        setAssignments((current) => {
          const currentIdSet = new Set(current.map((item) => item.assignment_id || item._id));
          const acceptedId = acceptedAssignment.assignment_id || acceptedAssignment._id;

          if (acceptedId && currentIdSet.has(acceptedId)) {
            return current.map((item) =>
              (item.assignment_id || item._id) === acceptedId ? acceptedAssignment : item
            );
          }

          return [acceptedAssignment, ...current];
        });
        setIncidents((current) => current.filter((item) => item.incident_id !== selectedIncident.incident_id));
        setSelectedIncident(null);
        return;
      }

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
      const assignmentId = assignment.assignment_id || assignment._id;
      const acceptedAssignment = assignmentId
        ? await assignmentsAPI.updateStatus(assignmentId, 'en-route')
        : assignment;

      setAssignments((current) => [acceptedAssignment, ...current]);
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
          <View style={styles.heroHeader}>
            <View style={styles.heroCopyWrap}>
              <Text style={styles.eyebrow}>RESPONDER CONSOLE</Text>
              <Text style={styles.heroTitle}>Prioritize, accept, and track live incidents</Text>
              <Text style={styles.heroSubtitle}>
                Designed for demos and dispatcher-style workflows with strong visual hierarchy and fast decision points.
              </Text>
            </View>
            <Pressable style={styles.bellButton} onPress={() => setNotificationOpen(true)}>
              <Text style={styles.bellIcon}>🔔</Text>
              {unreadCount > 0 ? (
                <View style={styles.bellBadge}>
                  <Text style={styles.bellBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                </View>
              ) : null}
            </Pressable>
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

      <Modal visible={notificationOpen} transparent animationType="slide" onRequestClose={() => setNotificationOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.notificationSheet}>
            <View style={styles.notificationSheetHeader}>
              <View>
                <Text style={styles.notificationSheetTitle}>Notifications</Text>
                <Text style={styles.notificationSheetSubtitle}>Responder alerts and live system updates</Text>
              </View>
              <Pressable style={styles.closeButton} onPress={() => setNotificationOpen(false)}>
                <Text style={styles.closeButtonText}>Done</Text>
              </Pressable>
            </View>
            <Pressable
              style={styles.markAllInlineButton}
              onPress={async () => {
                try {
                  const rawResponder = await storage.getItem('responderData');
                  if (!rawResponder) return;
                  const responder = JSON.parse(rawResponder);
                  const recipient = responder.id || responder.email;
                  if (!recipient) return;
                  await notificationsAPI.markAllAsRead(recipient);
                  setNotifications((current) => current.map((item) => ({ ...item, status: 'read', read_at: item.read_at || new Date().toISOString() })));
                } catch (error: any) {
                  Alert.alert('Unable to update notifications', error?.response?.data?.error || error?.message || 'Please try again.');
                }
              }}
            >
              <Text style={styles.markAllInlineButtonText}>Mark all as read</Text>
            </Pressable>
            <ScrollView contentContainerStyle={styles.notificationList}>
              {notifications.length === 0 ? (
                <View style={styles.emptyNotificationState}>
                  <Text style={styles.emptyNotificationEmoji}>🔕</Text>
                  <Text style={styles.emptyNotificationTitle}>No responder notifications yet</Text>
                  <Text style={styles.emptyNotificationSubtitle}>Incoming incidents, escalations, and assignment updates will appear here.</Text>
                </View>
              ) : (
                notifications.map((item) => (
                  <Pressable
                    key={item._id}
                    style={[styles.notificationItem, item.status !== 'read' && styles.notificationItemUnread]}
                    onPress={async () => {
                      try {
                        if (item.status !== 'read') {
                          await notificationsAPI.markAsRead(item._id);
                          setNotifications((current) => current.map((entry) => entry._id === item._id ? { ...entry, status: 'read', read_at: new Date().toISOString() } : entry));
                        }
                      } catch (error: any) {
                        Alert.alert('Unable to open notification', error?.response?.data?.error || error?.message || 'Please try again.');
                      }
                    }}
                  >
                    <View style={styles.notificationRow}>
                      <View style={styles.notificationGlyphWrap}>
                        <Text style={styles.notificationGlyph}>{getNotificationEmoji(item.type)}</Text>
                      </View>
                      <View style={styles.notificationCopy}>
                        <Text style={styles.notificationTitle}>{item.title}</Text>
                        <Text style={styles.notificationMeta}>{new Date(item.created_at).toLocaleString()} · {formatLabel(item.priority)}</Text>
                      </View>
                      {item.status !== 'read' ? <View style={styles.notificationUnreadDot} /> : null}
                    </View>
                    <Text style={styles.notificationMessage}>{item.message}</Text>
                  </Pressable>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

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

function getNotificationEmoji(type: AppNotification['type']) {
  switch (type) {
    case 'incident_assigned':
      return '🚑';
    case 'incident_escalated':
      return '⚠️';
    case 'incident_resolved':
      return '✅';
    case 'resource_assigned':
      return '📍';
    case 'alert':
      return '🚨';
    default:
      return '🔔';
  }
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
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16
  },
  heroCopyWrap: {
    flex: 1
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
  bellButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: COLORS.border
  },
  bellIcon: {
    fontSize: 20
  },
  bellBadge: {
    position: 'absolute',
    top: -4,
    right: -2,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5
  },
  bellBadgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '800'
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
  notificationSheet: {
    backgroundColor: COLORS.backgroundElevated,
    padding: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    minHeight: '72%',
    maxHeight: '88%'
  },
  notificationSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  notificationSheetTitle: {
    color: COLORS.text,
    fontSize: SIZES.xl,
    fontWeight: '700'
  },
  notificationSheetSubtitle: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
    marginTop: 4
  },
  closeButton: {
    backgroundColor: COLORS.surface,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  closeButtonText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: SIZES.sm
  },
  markAllInlineButton: {
    backgroundColor: COLORS.badgeBlue,
    borderRadius: 999,
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14
  },
  markAllInlineButtonText: {
    color: COLORS.white,
    fontSize: SIZES.sm,
    fontWeight: '700'
  },
  notificationList: {
    paddingBottom: 24,
    gap: 12
  },
  emptyNotificationState: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radius,
    padding: SIZES.paddingLg,
    alignItems: 'center',
    marginTop: 20
  },
  emptyNotificationEmoji: {
    fontSize: 34,
    marginBottom: 10
  },
  emptyNotificationTitle: {
    color: COLORS.text,
    fontSize: SIZES.lg,
    fontWeight: '700',
    marginBottom: 8
  },
  emptyNotificationSubtitle: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
    lineHeight: 20,
    textAlign: 'center'
  },
  notificationItem: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radius,
    padding: SIZES.padding,
    borderWidth: 1,
    borderColor: 'transparent'
  },
  notificationItemUnread: {
    borderColor: 'rgba(37, 99, 235, 0.35)'
  },
  notificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  notificationGlyphWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  notificationGlyph: {
    fontSize: 20
  },
  notificationCopy: {
    flex: 1
  },
  notificationTitle: {
    color: COLORS.text,
    fontSize: SIZES.md,
    fontWeight: '700',
    marginBottom: 4
  },
  notificationMeta: {
    color: COLORS.textMuted,
    fontSize: SIZES.xs
  },
  notificationUnreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.secondary
  },
  notificationMessage: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
    lineHeight: 20,
    marginTop: 12
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