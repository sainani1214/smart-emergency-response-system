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
      <View style={styles.titleContainer}>
        <Text style={styles.title}>Emergency Dashboard</Text>
        <View style={[styles.connectionStatus, wsConnected && styles.connected]}>
          <View style={styles.statusDot} />
          <Text style={styles.connectionText}>
            {wsConnected ? 'Live' : 'Offline'}
          </Text>
        </View>
      </View>

      {stats && (
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total Incidents</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: COLORS.open }]}>
              {stats.byStatus?.open || 0}
            </Text>
            <Text style={styles.statLabel}>Open</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: COLORS.inProgress }]}>
              {stats.byStatus?.['in-progress'] || 0}
            </Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: COLORS.resolved }]}>
              {stats.byStatus?.resolved || 0}
            </Text>
            <Text style={styles.statLabel}>Resolved</Text>
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
    backgroundColor: COLORS.light,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.light,
  },
  loadingText: {
    marginTop: 12,
    fontSize: SIZES.md,
    color: COLORS.gray,
  },
  listContent: {
    padding: SIZES.padding,
  },
  header: {
    marginBottom: 20,
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: SIZES.xxl,
    fontWeight: '700',
    color: COLORS.dark,
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: COLORS.gray,
  },
  connected: {
    backgroundColor: COLORS.success,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.white,
    marginRight: 6,
  },
  connectionText: {
    fontSize: SIZES.sm,
    fontWeight: '600',
    color: COLORS.white,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    padding: 12,
    marginHorizontal: 4,
    borderRadius: SIZES.borderRadius,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statValue: {
    fontSize: SIZES.xl,
    fontWeight: '700',
    color: COLORS.dark,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: SIZES.xs,
    color: COLORS.gray,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: SIZES.lg,
    fontWeight: '600',
    color: COLORS.dark,
    marginBottom: 12,
  },
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
    color: COLORS.dark,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: SIZES.md,
    color: COLORS.gray,
    textAlign: 'center',
  },
});

export default DashboardScreen;
