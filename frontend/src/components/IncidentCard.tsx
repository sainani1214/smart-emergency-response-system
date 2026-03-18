import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Incident, IncidentSeverity, IncidentStatus } from '../types';
import { COLORS, SIZES } from '../constants/theme';

interface IncidentCardProps {
  incident: Incident;
  onPress?: () => void;
}

const IncidentCard: React.FC<IncidentCardProps> = ({ incident, onPress }) => {
  const getSeverityColor = (severity: IncidentSeverity) => {
    switch (severity) {
      case IncidentSeverity.CRITICAL:
        return COLORS.critical;
      case IncidentSeverity.HIGH:
        return COLORS.high;
      case IncidentSeverity.MEDIUM:
        return COLORS.medium;
      case IncidentSeverity.LOW:
        return COLORS.low;
      default:
        return COLORS.gray;
    }
  };

  const getStatusColor = (status: IncidentStatus) => {
    switch (status) {
      case IncidentStatus.OPEN:
        return COLORS.open;
      case IncidentStatus.ASSIGNED:
        return COLORS.assigned;
      case IncidentStatus.IN_PROGRESS:
        return COLORS.inProgress;
      case IncidentStatus.RESOLVED:
        return COLORS.resolved;
      case IncidentStatus.CLOSED:
        return COLORS.closed;
      default:
        return COLORS.gray;
    }
  };

  const formatTime = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ago`;
    }
    return `${minutes}m ago`;
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View
            style={[
              styles.severityIndicator,
              { backgroundColor: getSeverityColor(incident.severity) },
            ]}
          />
          <Text style={styles.incidentId}>{incident.incident_id}</Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(incident.status) },
          ]}
        >
          <Text style={styles.statusText}>
            {incident.status.replace('-', ' ').toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.type}>
          {incident.type.toUpperCase()} • {incident.severity.toUpperCase()}
        </Text>
        <Text style={styles.description} numberOfLines={2}>
          {incident.description}
        </Text>
        <Text style={styles.location} numberOfLines={1}>
          📍 {incident.location.address || `${incident.location.lat.toFixed(4)}, ${incident.location.lng.toFixed(4)}`}
        </Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.timeText}>{formatTime(incident.created_at)}</Text>
        <Text style={styles.priorityText}>
          Priority: {incident.priority_score.toFixed(1)}
        </Text>
      </View>

      {incident.escalation_level > 0 && (
        <View style={styles.escalationBadge}>
          <Text style={styles.escalationText}>
            ⚠️ Escalated (Level {incident.escalation_level})
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.borderRadius,
    padding: SIZES.padding,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  severityIndicator: {
    width: 4,
    height: 20,
    borderRadius: 2,
    marginRight: 8,
  },
  incidentId: {
    fontSize: SIZES.md,
    fontWeight: '700',
    color: COLORS.dark,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: SIZES.xs,
    fontWeight: '600',
    color: COLORS.white,
  },
  content: {
    marginBottom: 12,
  },
  type: {
    fontSize: SIZES.sm,
    fontWeight: '600',
    color: COLORS.gray,
    marginBottom: 4,
  },
  description: {
    fontSize: SIZES.md,
    color: COLORS.dark,
    marginBottom: 6,
    lineHeight: 20,
  },
  location: {
    fontSize: SIZES.sm,
    color: COLORS.gray,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.light,
  },
  timeText: {
    fontSize: SIZES.sm,
    color: COLORS.gray,
  },
  priorityText: {
    fontSize: SIZES.sm,
    fontWeight: '600',
    color: COLORS.primary,
  },
  escalationBadge: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#fef3c7',
    borderRadius: 6,
  },
  escalationText: {
    fontSize: SIZES.sm,
    fontWeight: '600',
    color: '#f59e0b',
    textAlign: 'center',
  },
});

export default IncidentCard;
