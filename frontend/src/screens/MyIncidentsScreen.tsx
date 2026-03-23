import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { incidentsAPI } from '../services/api';
import { COLORS, SIZES } from '../constants/theme';
import { IncidentSeverity, IncidentStatus, IncidentType, IncidentWithAssignment } from '../types';
import { UserAppStackParamList } from '../../App';

type Props = NativeStackScreenProps<UserAppStackParamList, 'MyReports'> & {
  onLogout: () => void;
};

const statusCopy: Record<IncidentStatus, string> = {
  [IncidentStatus.OPEN]: 'Awaiting review',
  [IncidentStatus.ASSIGNED]: 'Accepted by responder',
  [IncidentStatus.IN_PROGRESS]: 'Responder on the way / active',
  [IncidentStatus.RESOLVED]: 'Resolved',
  [IncidentStatus.CLOSED]: 'Closed',
};

export default function MyIncidentsScreen({ navigation, onLogout }: Props) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [incidents, setIncidents] = useState<IncidentWithAssignment[]>([]);

  const loadReports = useCallback(async () => {
    try {
      console.log('[MyReports] Loading user reports...');
      const myReports = await incidentsAPI.listMine();

      console.log('[MyReports] Loaded', myReports.length, 'user reports');

      const sorted = myReports.sort((a, b) => {
        const dateA = new Date(a.incident.created_at || 0).getTime();
        const dateB = new Date(b.incident.created_at || 0).getTime();
        return dateB - dateA;
      });

      setIncidents(sorted);
    } catch (error: any) {
      console.error('[MyReports] Error loading reports:', error);
      
      if (error.response?.status === 401) {
        Alert.alert(
          'Session expired',
          'Please sign in again to view your reports',
          [{ text: 'OK', onPress: onLogout }]
        );
      } else {
        Alert.alert(
          'Error loading reports',
          error.response?.data?.error || error.message || 'Failed to load your reports. Please try again.'
        );
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [onLogout]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  // Refresh when screen comes into focus (e.g., after creating a new incident)
  useFocusEffect(
    useCallback(() => {
      console.log('[MyReports] Screen focused, refreshing...');
      loadReports();
    }, [loadReports])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadReports();
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={COLORS.primary} size="large" />
        <Text style={styles.loadingText}>Loading your reports…</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <FlatList
        data={incidents}
        keyExtractor={(item) => item.incident.incident_id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <>
            <View style={styles.headerCard}>
              <Text style={styles.headerTitle}>Track your submitted emergencies</Text>
              <Text style={styles.headerSubtitle}>
                Review only your own reports here. Nearby incidents and account actions are available from separate entry points.
              </Text>
              <View style={styles.buttonRow}>
                <Pressable style={styles.headerButton} onPress={() => navigation.navigate('ReportIncident')}>
                  <Text style={styles.headerButtonText}>Report emergency</Text>
                </Pressable>
                <Pressable style={styles.headerButtonSecondary} onPress={() => navigation.navigate('NearbyIncidents')}>
                  <Text style={styles.headerButtonSecondaryText}>View nearby</Text>
                </Pressable>
              </View>
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No reports yet</Text>
            <Text style={styles.emptySubtitle}>
              Once you submit an emergency, you’ll see progress here with clear status updates.
            </Text>
          </View>
        }
        contentContainerStyle={styles.content}
        renderItem={({ item }) => {
          const incident = item.incident;
          const acceptedResponder = item.latestAssignment?.responder_id;

          return (
          <Pressable
            style={styles.card}
            onPress={() =>
              navigation.navigate('LiveTracking', {
                incidentId: incident.incident_id,
              })
            }
          >
            <View style={styles.cardTopRow}>
              <View style={styles.typeGroup}>
                <Text style={styles.typeEmoji}>{getTypeEmoji(incident.type)}</Text>
                <View>
                  <Text style={styles.typeLabel}>{formatLabel(incident.type)}</Text>
                  <Text style={styles.referenceLabel}>#{incident.incident_id}</Text>
                </View>
              </View>
              <View style={[styles.statusPill, getStatusPillStyle(incident.status)]}>
                <Text style={styles.statusPillText}>{formatLabel(incident.status)}</Text>
              </View>
            </View>

            <Text style={styles.description}>{incident.description}</Text>

            <View style={styles.metaRow}>
              <View style={[styles.severityBadge, getSeverityBadgeStyle(incident.severity)]}>
                <Text style={styles.severityBadgeText}>{formatLabel(incident.severity)}</Text>
              </View>
              <Text style={styles.timestamp}>{new Date(incident.created_at).toLocaleString()}</Text>
            </View>

            <Text style={styles.statusDetail}>{statusCopy[incident.status] ?? 'Status updated'}</Text>
            <Text style={styles.acceptedText}>
              {acceptedResponder?.name
                ? `Accepted by ${acceptedResponder.name}${acceptedResponder.responder_type ? ` · ${formatLabel(acceptedResponder.responder_type)}` : ''}`
                : 'Waiting for responder acceptance'}
            </Text>
            {item.latestAssignment?.eta ? <Text style={styles.acceptedMeta}>ETA: {item.latestAssignment.eta} min</Text> : null}
            {incident.location.address ? <Text style={styles.address}>{incident.location.address}</Text> : null}
          </Pressable>
        );}}
      />
    </View>
  );
}

function formatLabel(value: string) {
  return value.replace(/-/g, ' ').replace(/\b\w/g, (match) => match.toUpperCase());
}

function getTypeEmoji(type: IncidentType) {
  switch (type) {
    case IncidentType.MEDICAL:
      return '🚑';
    case IncidentType.FIRE:
      return '🔥';
    case IncidentType.SECURITY:
      return '🛡️';
    case IncidentType.WATER:
      return '💧';
    case IncidentType.POWER:
      return '⚡';
    default:
      return '🚨';
  }
}

function getSeverityBadgeStyle(severity: IncidentSeverity) {
  const backgroundColor =
    severity === IncidentSeverity.LOW
      ? '#ECFDF3'
      : severity === IncidentSeverity.MEDIUM
        ? '#FFF7E6'
        : severity === IncidentSeverity.HIGH
          ? '#FFF1EC'
          : '#FDECEC';

  return { backgroundColor };
}

function getStatusPillStyle(status: IncidentStatus) {
  const backgroundColor =
    status === IncidentStatus.OPEN
      ? '#FFF7E6'
      : status === IncidentStatus.ASSIGNED
        ? '#EAF2FF'
        : status === IncidentStatus.IN_PROGRESS
          ? '#F1EEFF'
          : status === IncidentStatus.RESOLVED
            ? '#ECFDF3'
            : '#EFEFF4';

  return { backgroundColor };
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: SIZES.subhead,
    color: COLORS.textSecondary,
  },
  content: {
    padding: SIZES.paddingLg,
    paddingBottom: SIZES.spacingXxl * 2,
    gap: SIZES.spacingMd,
  },
  headerCard: {
    backgroundColor: COLORS.backgroundElevated,
    borderRadius: SIZES.radiusXl,
    padding: SIZES.paddingLg,
    marginBottom: SIZES.spacingLg,
  },
  headerTitle: {
    fontSize: SIZES.title2,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: SIZES.footnote,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  headerButton: {
    flex: 1.15,
    backgroundColor: COLORS.dark,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  headerButtonText: {
    color: COLORS.textInverse,
    fontSize: SIZES.footnote,
    fontWeight: '700',
  },
  headerButtonSecondary: {
    flex: 1,
    backgroundColor: COLORS.secondary,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  headerButtonSecondaryText: {
    color: '#FFFFFF',
    fontSize: SIZES.footnote,
    fontWeight: '700',
  },
  headerGhostButton: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerGhostButtonText: {
    color: COLORS.text,
    fontSize: SIZES.footnote,
    fontWeight: '700',
  },
  emptyState: {
    backgroundColor: COLORS.backgroundElevated,
    borderRadius: SIZES.radiusXl,
    padding: SIZES.paddingXl,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: SIZES.title3,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    textAlign: 'center',
    fontSize: SIZES.footnote,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  card: {
    backgroundColor: COLORS.backgroundElevated,
    borderRadius: SIZES.radiusXl,
    padding: SIZES.paddingLg,
    marginBottom: SIZES.spacingMd,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  typeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  typeEmoji: {
    fontSize: 26,
  },
  typeLabel: {
    fontSize: SIZES.callout,
    fontWeight: '700',
    color: COLORS.text,
  },
  referenceLabel: {
    marginTop: 2,
    fontSize: SIZES.caption1,
    color: COLORS.textSecondary,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
  },
  statusPillText: {
    fontSize: SIZES.caption1,
    fontWeight: '700',
    color: COLORS.text,
  },
  description: {
    marginTop: 16,
    fontSize: SIZES.subhead,
    lineHeight: 22,
    color: COLORS.text,
  },
  metaRow: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  severityBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  severityBadgeText: {
    fontSize: SIZES.caption1,
    fontWeight: '700',
    color: COLORS.text,
  },
  timestamp: {
    flex: 1,
    textAlign: 'right',
    fontSize: SIZES.caption1,
    color: COLORS.textSecondary,
  },
  statusDetail: {
    marginTop: 14,
    fontSize: SIZES.footnote,
    color: COLORS.secondary,
    fontWeight: '600',
  },
  acceptedText: {
    marginTop: 10,
    fontSize: SIZES.footnote,
    color: COLORS.text,
    fontWeight: '600',
  },
  acceptedMeta: {
    marginTop: 4,
    fontSize: SIZES.caption1,
    color: COLORS.textSecondary,
  },
  address: {
    marginTop: 8,
    fontSize: SIZES.footnote,
    color: COLORS.textSecondary,
  },
});