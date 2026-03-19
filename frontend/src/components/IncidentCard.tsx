import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Incident, IncidentSeverity, IncidentStatus, IncidentType } from '../types';
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

  const getIncidentImage = (type: IncidentType) => {
    // High-quality emergency-themed Unsplash images
    const images = {
      [IncidentType.MEDICAL]: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=800&h=300&fit=crop&q=80',
      [IncidentType.FIRE]: 'https://images.unsplash.com/photo-1589650112323-fea0bb9dd598?w=800&h=300&fit=crop&q=80',
      [IncidentType.SECURITY]: 'https://images.unsplash.com/photo-1557324232-b8917d3c3dcb?w=800&h=300&fit=crop&q=80',
      [IncidentType.WATER]: 'https://images.unsplash.com/photo-1581094271901-8022df4466f9?w=800&h=300&fit=crop&q=80',
      [IncidentType.POWER]: 'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=800&h=300&fit=crop&q=80',
    };
    return images[type] || images[IncidentType.MEDICAL];
  };

  const getTypeIcon = (type: IncidentType) => {
    const icons = {
      [IncidentType.MEDICAL]: '🚑',
      [IncidentType.FIRE]: '🔥',
      [IncidentType.SECURITY]: '🛡️',
      [IncidentType.WATER]: '💧',
      [IncidentType.POWER]: '⚡',
    };
    return icons[type] || '⚠️';
  };

  const formatTime = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ago`;
    }
    if (minutes < 1) {
      return 'Just now';
    }
    return `${minutes}m ago`;
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={!onPress}
    >
      {/* Image Header */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: getIncidentImage(incident.type) }}
          style={styles.image}
          resizeMode="cover"
        />
        <View style={styles.imageOverlay}>
          <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(incident.severity) }]}>
            <Text style={styles.severityText}>{incident.severity.toUpperCase()}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(incident.status) + 'CC' }]}>
            <Text style={styles.statusText}>
              {incident.status.replace('-', ' ').toUpperCase()}
            </Text>
          </View>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.typeIcon}>{getTypeIcon(incident.type)}</Text>
          <Text style={styles.incidentId}>{incident.incident_id}</Text>
          <Text style={styles.timeText}>{formatTime(incident.created_at)}</Text>
        </View>

        <Text style={styles.description} numberOfLines={2}>
          {incident.description}
        </Text>

        <View style={styles.footer}>
          <View style={styles.locationContainer}>
            <Text style={styles.locationIcon}>📍</Text>
            <Text style={styles.location} numberOfLines={1}>
              {incident.location.address || `${incident.location.lat.toFixed(3)}, ${incident.location.lng.toFixed(3)}`}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radius,
    marginHorizontal: SIZES.padding,
    marginBottom: SIZES.marginSm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 160,
    backgroundColor: COLORS.grayLight,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: SIZES.paddingSm,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginTop: 2,
    marginLeft: 2,
    marginRight: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  severityText: {
    fontSize: SIZES.caption2,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 0.3,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginTop: 2,
    marginLeft: 2,
    marginRight: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  statusText: {
    fontSize: SIZES.caption2,
    fontWeight: '600',
    color: COLORS.white,
  },
  content: {
    padding: SIZES.paddingMd,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.marginSm,
  },
  typeIcon: {
    fontSize: 22,
    marginRight: 8,
  },
  incidentId: {
    fontSize: SIZES.footnote,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
    letterSpacing: 0.2,
  },
  timeText: {
    fontSize: SIZES.caption2,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  description: {
    fontSize: SIZES.subhead,
    fontWeight: '400',
    color: COLORS.text,
    lineHeight: 22,
    marginBottom: SIZES.marginSm,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SIZES.marginSm,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    backgroundColor: COLORS.grayLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: SIZES.radiusXs,
  },
  locationIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  location: {
    fontSize: SIZES.caption1,
    fontWeight: '500',
    color: COLORS.textSecondary,
    flex: 1,
  },
});

export default IncidentCard;
