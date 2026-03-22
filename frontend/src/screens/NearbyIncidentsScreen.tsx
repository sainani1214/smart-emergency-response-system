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
import { incidentsAPI } from '../services/api';
import { COLORS, SIZES } from '../constants/theme';
import { IncidentSeverity, IncidentStatus, IncidentType, IncidentWithAssignment } from '../types';
import { UserAppStackParamList } from '../../App';

type Props = NativeStackScreenProps<UserAppStackParamList, 'NearbyIncidents'>;

export default function NearbyIncidentsScreen({ navigation }: Props) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [nearbyIncidents, setNearbyIncidents] = useState<IncidentWithAssignment[]>([]);

  const loadNearbyIncidents = useCallback(async () => {
    try {
      console.log('[NearbyIncidents] Loading nearby incidents...');
      // TODO: Use actual user location instead of hardcoded Pune coordinates
      const nearby = await incidentsAPI.listNearby({ lat: 18.521, lng: 73.857, radiusKm: 10 });
      console.log('[NearbyIncidents] Loaded', nearby.length, 'nearby incidents');

      const sorted = nearby.sort((a, b) => {
        const dateA = new Date(a.incident.created_at || 0).getTime();
        const dateB = new Date(b.incident.created_at || 0).getTime();
        return dateB - dateA;
      });

      setNearbyIncidents(sorted);
    } catch (error: any) {
      console.error('[NearbyIncidents] Error loading nearby incidents:', error);
      Alert.alert(
        'Error loading incidents',
        error.response?.data?.error || error.message || 'Failed to load nearby incidents. Please try again.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadNearbyIncidents();
  }, [loadNearbyIncidents]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNearbyIncidents();
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={COLORS.primary} size="large" />
        <Text style={styles.loadingText}>Loading nearby incidents…</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <FlatList
        data={nearbyIncidents}
        keyExtractor={(item) => item.incident.incident_id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <View style={styles.headerCard}>
            <Text style={styles.headerTitle}>What's happening nearby</Text>
            <Text style={styles.headerSubtitle}>
              Stay informed about emergencies in your area. Pull to refresh for the latest updates.
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No nearby incidents</Text>
            <Text style={styles.emptySubtitle}>
              Great news! There are no active emergencies in your area right now.
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

              {incident.location.address && (
                <Text style={styles.address}>{incident.location.address}</Text>
              )}

              <View style={styles.metaRow}>
                <View style={[styles.severityBadge, getSeverityBadgeStyle(incident.severity)]}>
                  <Text style={styles.severityBadgeText}>{formatLabel(incident.severity)}</Text>
                </View>
                <Text style={styles.timestamp}>{new Date(incident.created_at).toLocaleString()}</Text>
              </View>

              <Text style={styles.acceptedText}>
                {acceptedResponder?.name
                  ? `${acceptedResponder.name} is responding${acceptedResponder.responder_type ? ` · ${formatLabel(acceptedResponder.responder_type)}` : ''}`
                  : 'Awaiting responder acceptance'}
              </Text>
              {item.latestAssignment?.eta && (
                <Text style={styles.etaMeta}>ETA: {item.latestAssignment.eta} min</Text>
              )}
            </Pressable>
          );
        }}
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
    borderLeftWidth: 3,
    borderLeftColor: COLORS.secondary,
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
  address: {
    marginTop: 12,
    fontSize: SIZES.footnote,
    color: COLORS.textSecondary,
    fontWeight: '600',
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
  acceptedText: {
    marginTop: 14,
    fontSize: SIZES.footnote,
    color: COLORS.text,
    fontWeight: '600',
  },
  etaMeta: {
    marginTop: 4,
    fontSize: SIZES.caption1,
    color: COLORS.secondary,
    fontWeight: '600',
  },
});
