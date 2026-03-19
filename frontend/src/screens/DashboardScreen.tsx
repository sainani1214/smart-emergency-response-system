import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Incident, Statistics } from '../types';
import { incidentsAPI } from '../services/api';
import websocketService, { SocketEvent } from '../services/websocket';
import IncidentCard from '../components/IncidentCard';
import { COLORS, SIZES } from '../constants/theme';

const DashboardScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [stats, setStats] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);

  useEffect(() => {
    connectWebSocket();
    fetchData();

    return () => {
      websocketService.disconnect();
    };
  }, []);

  const connectWebSocket = async () => {
    try {
      await websocketService.connect();
      setWsConnected(true);

      // Listen for real-time updates
      websocketService.onIncidentCreated((incident) => {
        setIncidents((prev) => [incident, ...prev]);
        showNotification('New Incident', `${incident.incident_id} - ${incident.type}`);
      });

      websocketService.onIncidentUpdated((incident) => {
        setIncidents((prev) =>
          prev.map((item) => (item._id === incident._id ? incident : item))
        );
      });

      websocketService.onIncidentEscalated((incident) => {
        setIncidents((prev) =>
          prev.map((item) => (item._id === incident._id ? incident : item))
        );
        showNotification(
          'Incident Escalated',
          `${incident.incident_id} escalated to level ${incident.escalation_level}`
        );
      });
    } catch (error) {
      console.error('WebSocket connection failed:', error);
      setWsConnected(false);
    }
  };

  const fetchData = async () => {
    try {
      const [incidentsData, statsData] = await Promise.all([
        incidentsAPI.getActive(),
        incidentsAPI.getStatistics(),
      ]);

      setIncidents(incidentsData);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      Alert.alert('Error', 'Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const showNotification = (title: string, message: string) => {
    Alert.alert(title, message, [{ text: 'OK' }]);
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <View style={styles.titleSection}>
          <Text style={styles.title}>Emergency Dashboard</Text>
          <Text style={styles.subTitle}>Real-time city operations</Text>
        </View>

        <View style={styles.connectionWrap}>
          <View style={[styles.statusDot, wsConnected ? styles.dotLive : styles.dotOffline]} />
          <Text style={[styles.connectionText, wsConnected ? styles.liveText : styles.offlineText]}>
            {wsConnected ? 'Live' : 'Offline'}
          </Text>
        </View>
      </View>

      {stats && (
        <View style={styles.statsRow}>
          <View style={styles.statCardSmall}>
            <Text style={[styles.statValueSmall, { color: COLORS.text }]}>{stats.total}</Text>
            <Text style={styles.statLabelSmall}>Total</Text>
          </View>

          <View style={styles.statCardSmall}>
            <Text style={[styles.statValueSmall, { color: COLORS.open }]}>{stats.byStatus?.open || 0}</Text>
            <Text style={styles.statLabelSmall}>Open</Text>
          </View>

          <View style={styles.statCardSmall}>
            <Text style={[styles.statValueSmall, { color: COLORS.inProgress }]}>{stats.byStatus?.['in-progress'] || 0}</Text>
            <Text style={styles.statLabelSmall}>Active</Text>
          </View>

          <View style={styles.statCardSmall}>
            <Text style={[styles.statValueSmall, { color: COLORS.resolved }]}>{stats.byStatus?.resolved || 0}</Text>
            <Text style={styles.statLabelSmall}>Resolved</Text>
          </View>
        </View>
      )}

      <Text style={styles.sectionTitle}>Active Incidents</Text>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>✅</Text>
      <Text style={styles.emptyTitle}>No Active Incidents</Text>
      <Text style={styles.emptyText}>
        All incidents have been resolved. Great work!
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={incidents}
        renderItem={({ item }) => (
          <IncidentCard
            incident={item}
            onPress={() => navigation.navigate('IncidentDetail', { incident: item })}
          />
        )}
        keyExtractor={(item) => item._id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: 50, // Safe area for status bar
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: SIZES.body,
    color: COLORS.textSecondary,
  },
  listContent: {
    paddingHorizontal: 8, // Reduced padding
    paddingTop: 16,
    paddingBottom: 120,
  },

  /* Header */
  header: {
    paddingHorizontal: SIZES.padding,
    marginBottom: SIZES.marginLg,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SIZES.spacingLg,
  },
  titleSection: {
    flex: 1,
    paddingRight: 16,
  },
  title: {
    fontSize: SIZES.title1,
    fontWeight: '700',
    color: COLORS.text,
    lineHeight: 32,
  },
  subTitle: {
    fontSize: SIZES.caption1,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  /* Connection */
  connectionWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: SIZES.radiusSm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.gray,
    marginRight: 8,
  },
  dotLive: {
    backgroundColor: COLORS.success,
  },
  dotOffline: {
    backgroundColor: COLORS.grayLight,
  },
  connectionText: {
    fontSize: SIZES.caption2,
    fontWeight: '600',
    color: COLORS.text,
  },
  liveText: {
    color: COLORS.success,
  },
  offlineText: {
    color: COLORS.textSecondary,
  },

  /* Stats */
  statsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginBottom: SIZES.marginLg,
    gap: 6,
    height: 72, // Fixed height for consistent alignment
  },
  statCardSmall: {
    flex: 1,
    backgroundColor: COLORS.surface,
    padding: SIZES.paddingSm - 2,
    borderRadius: SIZES.radiusSm,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  statValueSmall: {
    fontSize: SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
  },
  statLabelSmall: {
    fontSize: SIZES.caption2,
    color: COLORS.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },

  sectionTitle: {
    fontSize: SIZES.title3,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },

  /* Empty */
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: SIZES.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});

export default DashboardScreen;
