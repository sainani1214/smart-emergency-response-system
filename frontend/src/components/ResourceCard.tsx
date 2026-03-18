import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Resource, ResourceType, ResourceStatus } from '../types';
import { COLORS, SIZES } from '../constants/theme';

interface ResourceCardProps {
  resource: Resource;
  onPress?: () => void;
}

const ResourceCard: React.FC<ResourceCardProps> = ({ resource, onPress }) => {
  const getStatusColor = (status: ResourceStatus) => {
    switch (status) {
      case ResourceStatus.AVAILABLE:
        return COLORS.available;
      case ResourceStatus.DISPATCHED:
        return COLORS.dispatched;
      case ResourceStatus.BUSY:
        return COLORS.busy;
      case ResourceStatus.OFFLINE:
        return COLORS.offline;
      default:
        return COLORS.gray;
    }
  };

  const getTypeIcon = (type: ResourceType) => {
    switch (type) {
      case ResourceType.AMBULANCE:
        return '🚑';
      case ResourceType.FIRE_TRUCK:
        return '🚒';
      case ResourceType.POLICE:
        return '🚓';
      case ResourceType.SECURITY:
        return '🛡️';
      case ResourceType.MAINTENANCE:
        return '🔧';
      default:
        return '🚗';
    }
  };

  const getCapacityPercentage = () => {
    return (resource.capacity.current / resource.capacity.max) * 100;
  };

  const formatTime = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m ago`;
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.icon}>{getTypeIcon(resource.type)}</Text>
          <View>
            <Text style={styles.unitId}>{resource.unit_id}</Text>
            <Text style={styles.type}>
              {resource.type.replace('_', ' ').toUpperCase()}
            </Text>
          </View>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(resource.status) },
          ]}
        >
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>
            {resource.status.toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Location:</Text>
          <Text style={styles.value} numberOfLines={1}>
            {resource.location.lat.toFixed(4)}, {resource.location.lng.toFixed(4)}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Capacity:</Text>
          <View style={styles.capacityBar}>
            <View
              style={[
                styles.capacityFill,
                {
                  width: `${getCapacityPercentage()}%`,
                  backgroundColor:
                    getCapacityPercentage() > 80 ? COLORS.danger : COLORS.success,
                },
              ]}
            />
          </View>
          <Text style={styles.capacityText}>
            {resource.capacity.current}/{resource.capacity.max}
          </Text>
        </View>

        {resource.crew_size && (
          <View style={styles.infoRow}>
            <Text style={styles.label}>Crew:</Text>
            <Text style={styles.value}>{resource.crew_size} members</Text>
          </View>
        )}

        {resource.skills && resource.skills.length > 0 && (
          <View style={styles.skillsContainer}>
            {resource.skills.slice(0, 3).map((skill, index) => (
              <View key={index} style={styles.skillBadge}>
                <Text style={styles.skillText}>{skill}</Text>
              </View>
            ))}
            {resource.skills.length > 3 && (
              <View style={styles.skillBadge}>
                <Text style={styles.skillText}>+{resource.skills.length - 3}</Text>
              </View>
            )}
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.timeText}>
          Updated {formatTime(resource.last_updated)}
        </Text>
      </View>
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
  icon: {
    fontSize: 32,
    marginRight: 12,
  },
  unitId: {
    fontSize: SIZES.md,
    fontWeight: '700',
    color: COLORS.dark,
  },
  type: {
    fontSize: SIZES.xs,
    color: COLORS.gray,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.white,
    marginRight: 6,
  },
  statusText: {
    fontSize: SIZES.xs,
    fontWeight: '600',
    color: COLORS.white,
  },
  content: {
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: SIZES.sm,
    color: COLORS.gray,
    width: 80,
  },
  value: {
    fontSize: SIZES.sm,
    color: COLORS.dark,
    flex: 1,
  },
  capacityBar: {
    flex: 1,
    height: 8,
    backgroundColor: COLORS.light,
    borderRadius: 4,
    overflow: 'hidden',
    marginRight: 8,
  },
  capacityFill: {
    height: '100%',
    borderRadius: 4,
  },
  capacityText: {
    fontSize: SIZES.sm,
    color: COLORS.dark,
    fontWeight: '600',
    width: 40,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  skillBadge: {
    backgroundColor: COLORS.light,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 6,
    marginBottom: 6,
  },
  skillText: {
    fontSize: SIZES.xs,
    color: COLORS.dark,
    fontWeight: '500',
  },
  footer: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.light,
  },
  timeText: {
    fontSize: SIZES.xs,
    color: COLORS.gray,
  },
});

export default ResourceCard;
