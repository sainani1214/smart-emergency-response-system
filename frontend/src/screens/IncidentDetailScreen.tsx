import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Incident } from '../types';
import { COLORS, SIZES } from '../constants/theme';
import { incidentsAPI, assignmentsAPI } from '../services/api';
import websocketService from '../services/websocket';

const IncidentDetailScreen: React.FC<{ route: any; navigation: any }> = ({
  route,
  navigation,
}) => {
  const { incident: initialIncident } = route.params;
  const [incident, setIncident] = React.useState<Incident>(initialIncident);
  const [loading, setLoading] = React.useState(false);

  // WebSocket listeners for real-time updates
  React.useEffect(() => {
    // Listen for incident updates
    websocketService.onIncidentUpdated((updatedIncident) => {
      console.log('📡 Received incident update:', updatedIncident);
      if (updatedIncident.incident_id === incident.incident_id) {
        console.log('✅ Updating current incident from WebSocket');
        setIncident(updatedIncident);
      }
    });

    // Listen for assignment updates
    websocketService.onIncidentAssigned((data) => {
      console.log('📡 Received assignment update:', data);
      if (data.incident.incident_id === incident.incident_id) {
        console.log('✅ Updating current incident from assignment');
        setIncident(data.incident);
      }
    });

    // Cleanup listeners on unmount
    return () => {
      // Note: websocketService should handle cleanup automatically
    };
  }, [incident.incident_id]);

  const refreshIncident = async () => {
    console.log(`🔄 Refreshing incident ${incident.incident_id}`);
    try {
      const updated = await incidentsAPI.getById(incident.incident_id);
      console.log('✅ Incident refreshed:', updated);
      setIncident(updated);
    } catch (error) {
      console.error('❌ Failed to refresh incident:', error);
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    console.log(`📝 Updating status to: ${newStatus}`);
    setLoading(true);
    try {
      const updated = await incidentsAPI.updateStatus(incident.incident_id, newStatus);
      console.log('✅ Status updated:', updated);
      setIncident(updated);
      Alert.alert('Success', `Status updated to ${newStatus}`);
      
      // Also refresh to ensure we have the latest data
      setTimeout(refreshIncident, 500);
    } catch (error) {
      console.error('❌ Status update failed:', error);
      Alert.alert('Error', 'Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignResource = async () => {
    setLoading(true);
    try {
      await assignmentsAPI.triggerSmartAssignment(incident.incident_id);
      Alert.alert('Success', 'Smart assignment triggered');
      await refreshIncident();
    } catch (error) {
      Alert.alert('Error', 'Failed to assign resource');
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    const colors: Record<string, string> = {
      critical: COLORS.critical,
      high: COLORS.high,
      medium: COLORS.medium,
      low: COLORS.low,
    };
    return colors[severity] || COLORS.gray;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      open: COLORS.open,
      assigned: COLORS.assigned,
      'in-progress': COLORS.inProgress,
      resolved: COLORS.resolved,
      closed: COLORS.closed,
    };
    return colors[status] || COLORS.gray;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Incident Details</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.card}>
          <View style={styles.titleRow}>
            <Text style={styles.incidentId}>{incident.incident_id}</Text>
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

          <View style={styles.typeRow}>
            <View
              style={[
                styles.severityBadge,
                { backgroundColor: getSeverityColor(incident.severity) },
              ]}
            >
              <Text style={styles.severityText}>
                {incident.severity.toUpperCase()}
              </Text>
            </View>
            <Text style={styles.typeText}>{incident.type.toUpperCase()}</Text>
          </View>

          <Text style={styles.description}>{incident.description}</Text>

          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Location</Text>
            <Text style={styles.infoText}>
              📍 {incident.location.address || 
                `${incident.location.lat.toFixed(6)}, ${incident.location.lng.toFixed(6)}`}
            </Text>
          </View>

          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Reporter</Text>
            <Text style={styles.infoText}>👤 {incident.reporter.name}</Text>
            <Text style={styles.infoText}>📞 {incident.reporter.contact}</Text>
            {incident.reporter.email && (
              <Text style={styles.infoText}>✉️ {incident.reporter.email}</Text>
            )}
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Priority Score</Text>
              <Text style={styles.statValue}>{incident.priority_score}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Escalation Level</Text>
              <Text style={styles.statValue}>{incident.escalation_level}</Text>
            </View>
          </View>

          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Timeline</Text>
            <Text style={styles.infoText}>Created: {formatDate(incident.created_at)}</Text>
            <Text style={styles.infoText}>Updated: {formatDate(incident.updated_at)}</Text>
            {incident.resolved_at && (
              <Text style={styles.infoText}>
                Resolved: {formatDate(incident.resolved_at)}
              </Text>
            )}
          </View>

          {incident.assigned_resource && (
            <View style={styles.infoSection}>
              <Text style={styles.sectionTitle}>Assigned Resource</Text>
              <Text style={styles.infoText}>
                🚑 {incident.assigned_resource.unit_id}
              </Text>
              <Text style={styles.infoText}>
                Type: {incident.assigned_resource.type.replace('_', ' ').toUpperCase()}
              </Text>
              <Text style={styles.infoText}>
                Status: {incident.assigned_resource.status.toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.actions}>
          {incident.status === 'open' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.assignButton]}
              onPress={handleAssignResource}
              disabled={loading}
            >
              <Text style={styles.actionButtonText}>
                {loading ? 'Assigning...' : '🎯 Assign Resource'}
              </Text>
            </TouchableOpacity>
          )}

          {incident.status === 'assigned' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.progressButton]}
              onPress={() => handleStatusUpdate('in-progress')}
              disabled={loading}
            >
              <Text style={styles.actionButtonText}>▶️ Start Progress</Text>
            </TouchableOpacity>
          )}

          {incident.status === 'in-progress' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.resolveButton]}
              onPress={() => handleStatusUpdate('resolved')}
              disabled={loading}
            >
              <Text style={styles.actionButtonText}>✅ Mark Resolved</Text>
            </TouchableOpacity>
          )}

          {incident.status === 'resolved' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.closeButton]}
              onPress={() => handleStatusUpdate('closed')}
              disabled={loading}
            >
              <Text style={styles.actionButtonText}>🔒 Close Incident</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.light,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.padding,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.light,
  },
  backButton: {
    width: 60,
  },
  backText: {
    fontSize: SIZES.md,
    color: COLORS.primary,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: SIZES.lg,
    fontWeight: '700',
    color: COLORS.dark,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: SIZES.padding,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.borderRadius,
    padding: SIZES.padding,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  incidentId: {
    fontSize: SIZES.xl,
    fontWeight: '700',
    color: COLORS.dark,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: SIZES.xs,
    fontWeight: '600',
    color: COLORS.white,
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  severityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 8,
  },
  severityText: {
    fontSize: SIZES.xs,
    fontWeight: '700',
    color: COLORS.white,
  },
  typeText: {
    fontSize: SIZES.sm,
    fontWeight: '600',
    color: COLORS.gray,
  },
  description: {
    fontSize: SIZES.md,
    color: COLORS.dark,
    lineHeight: 22,
    marginBottom: 20,
  },
  infoSection: {
    marginBottom: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.light,
  },
  sectionTitle: {
    fontSize: SIZES.sm,
    fontWeight: '700',
    color: COLORS.gray,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  infoText: {
    fontSize: SIZES.md,
    color: COLORS.dark,
    marginBottom: 4,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  statBox: {
    flex: 1,
    backgroundColor: COLORS.light,
    padding: 12,
    borderRadius: 8,
    marginRight: 8,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: SIZES.xs,
    color: COLORS.gray,
    marginBottom: 4,
  },
  statValue: {
    fontSize: SIZES.xl,
    fontWeight: '700',
    color: COLORS.primary,
  },
  actions: {
    marginTop: 16,
    gap: 12,
  },
  actionButton: {
    padding: 16,
    borderRadius: SIZES.borderRadius,
    alignItems: 'center',
  },
  assignButton: {
    backgroundColor: COLORS.primary,
  },
  progressButton: {
    backgroundColor: COLORS.inProgress,
  },
  resolveButton: {
    backgroundColor: COLORS.success,
  },
  closeButton: {
    backgroundColor: COLORS.gray,
  },
  actionButtonText: {
    fontSize: SIZES.md,
    fontWeight: '600',
    color: COLORS.white,
  },
});

export default IncidentDetailScreen;
