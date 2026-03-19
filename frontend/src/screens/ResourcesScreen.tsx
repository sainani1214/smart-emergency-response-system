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
import { Resource, Statistics } from '../types';
import { resourcesAPI } from '../services/api';
import websocketService from '../services/websocket';
import ResourceCard from '../components/ResourceCard';
import { COLORS, SIZES } from '../constants/theme';

const ResourcesScreen: React.FC = () => {
  const [resources, setResources] = useState<Resource[]>([]);
  const [stats, setStats] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'available' | 'active'>('all');

  useEffect(() => {
    fetchData();
    setupWebSocketListeners();
  }, []);

  const setupWebSocketListeners = () => {
    websocketService.onResourceUpdated((resource) => {
      setResources((prev) =>
        prev.map((item) => (item._id === resource._id ? resource : item))
      );
    });

    websocketService.onResourceLocationChanged((resource) => {
      setResources((prev) =>
        prev.map((item) => (item._id === resource._id ? resource : item))
      );
    });
  };

  const fetchData = async () => {
    try {
      const params = filter === 'available' ? { available: true } : undefined;
      const [resourcesData, statsData] = await Promise.all([
        resourcesAPI.getAll(params),
        resourcesAPI.getStatistics(),
      ]);

      setResources(resourcesData);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to fetch resources:', error);
      Alert.alert('Error', 'Failed to load resources. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const getFilteredResources = () => {
    switch (filter) {
      case 'available':
        return resources.filter((r) => r.status === 'available');
      case 'active':
        return resources.filter(
          (r) => r.status === 'dispatched' || r.status === 'busy'
        );
      default:
        return resources;
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.title}>Resources</Text>

      {stats && (
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: COLORS.available }]}>
              {stats.byStatus?.available || 0}
            </Text>
            <Text style={styles.statLabel}>Available</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: COLORS.dispatched }]}>
              {stats.byStatus?.dispatched || 0}
            </Text>
            <Text style={styles.statLabel}>Dispatched</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: COLORS.busy }]}>
              {stats.byStatus?.busy || 0}
            </Text>
            <Text style={styles.statLabel}>Busy</Text>
          </View>
        </View>
      )}

      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'all' && styles.activeFilter]}
          onPress={() => setFilter('all')}
        >
          <Text
            style={[
              styles.filterText,
              filter === 'all' && styles.activeFilterText,
            ]}
          >
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterButton,
            filter === 'available' && styles.activeFilter,
          ]}
          onPress={() => setFilter('available')}
        >
          <Text
            style={[
              styles.filterText,
              filter === 'available' && styles.activeFilterText,
            ]}
          >
            Available
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'active' && styles.activeFilter]}
          onPress={() => setFilter('active')}
        >
          <Text
            style={[
              styles.filterText,
              filter === 'active' && styles.activeFilterText,
            ]}
          >
            Active
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>🚗</Text>
      <Text style={styles.emptyTitle}>No Resources Found</Text>
      <Text style={styles.emptyText}>
        {filter === 'available'
          ? 'All resources are currently dispatched.'
          : filter === 'active'
          ? 'No resources are currently active.'
          : 'No resources in the system.'}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading resources...</Text>
      </View>
    );
  }

  const filteredResources = getFilteredResources();

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredResources}
        renderItem={({ item }) => <ResourceCard resource={item} />}
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
    paddingTop: 50, // Safe area padding for top
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
    paddingBottom: 100, // Extra padding at bottom for tab bar
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: SIZES.xxl,
    fontWeight: '700',
    color: COLORS.dark,
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
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
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: SIZES.borderRadius,
    padding: 4,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeFilter: {
    backgroundColor: COLORS.primary,
  },
  filterText: {
    fontSize: SIZES.sm,
    fontWeight: '600',
    color: COLORS.gray,
  },
  activeFilterText: {
    color: COLORS.white,
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
    paddingHorizontal: 40,
  },
});

export default ResourcesScreen;
