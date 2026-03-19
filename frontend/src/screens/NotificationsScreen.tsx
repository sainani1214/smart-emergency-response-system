import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { COLORS, SIZES } from '../constants/theme';
import { notificationsAPI } from '../services/api';
import websocketService, { SocketEvent } from '../services/websocket';

interface Notification {
  id: string;
  type: 'incident' | 'assignment' | 'escalation' | 'resolution';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  data?: any;
}

const NotificationsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchNotifications();
    setupWebSocketListeners();
    
    // Connect WebSocket
    websocketService.connect();

    return () => {
      websocketService.disconnect();
    };
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      console.log('Fetching notifications from API...');
      
      const response = await notificationsAPI.getAll({ 
        recipient: 'system',
        limit: 50
      });
      
      console.log('API response:', response);
      
      // Convert backend notifications to frontend format
      const convertedNotifications: Notification[] = response.notifications.map((notif: any) => ({
        id: notif._id,
        type: notif.type,
        title: notif.title,
        message: notif.message,
        timestamp: notif.created_at,
        read: notif.status === 'read',
        data: notif.data
      }));

      console.log('Converted notifications:', convertedNotifications);
      setNotifications(convertedNotifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      // Keep using WebSocket-only notifications if API fails
      console.log('Falling back to WebSocket-only notifications');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  };

  const setupWebSocketListeners = () => {
    console.log('Setting up WebSocket listeners...');
    
    // Listen for new incidents
    websocketService.on(SocketEvent.INCIDENT_CREATED, (incident: any) => {
      console.log('WebSocket: New incident received', incident);
      addNotification({
        id: `incident-${incident._id}-${Date.now()}`,
        type: 'incident',
        title: '🚨 New Incident Reported',
        message: `${incident.type.toUpperCase()} - ${incident.severity.toUpperCase()}: ${incident.description.substring(0, 60)}...`,
        timestamp: new Date().toISOString(),
        read: false,
        data: incident,
      });
    });

    // Listen for assignments
    websocketService.on(SocketEvent.ASSIGNMENT_CREATED, (assignment: any) => {
      console.log('WebSocket: Assignment received', assignment);
      addNotification({
        id: `assignment-${assignment._id}-${Date.now()}`,
        type: 'assignment',
        title: '✅ Resource Assigned',
        message: `Resource ${assignment.resource?.unit_id || 'Unknown'} assigned to incident ${assignment.incident?.incident_id || 'Unknown'}`,
        timestamp: new Date().toISOString(),
        read: false,
        data: assignment,
      });
    });

    // Listen for escalations
    websocketService.on(SocketEvent.INCIDENT_ESCALATED, (data: any) => {
      addNotification({
        id: `escalation-${data.incident._id}-${Date.now()}`,
        type: 'escalation',
        title: '⚠️ Incident Escalated',
        message: `Incident ${data.incident.incident_id} escalated to level ${data.escalation_level}. Reason: ${data.reason}`,
        timestamp: new Date().toISOString(),
        read: false,
        data: data,
      });
    });

    // Listen for resolutions
    websocketService.on(SocketEvent.INCIDENT_UPDATED, (incident: any) => {
      if (incident.status === 'resolved' || incident.status === 'closed') {
        addNotification({
          id: `resolution-${incident._id}-${Date.now()}`,
          type: 'resolution',
          title: '✓ Incident Resolved',
          message: `Incident ${incident.incident_id} has been ${incident.status}`,
          timestamp: new Date().toISOString(),
          read: false,
          data: incident,
        });
      }
    });

    setLoading(false);
  };

  const addNotification = (notification: Notification) => {
    console.log('Adding notification:', notification);
    setNotifications((prev) => {
      const updated = [notification, ...prev];
      console.log('Updated notifications count:', updated.length);
      return updated;
    });
  };

  const addTestNotification = () => {
    console.log('Adding test notification...');
    addNotification({
      id: `test-${Date.now()}`,
      type: 'incident',
      title: '🚨 Test Notification',
      message: 'This is a test notification to verify the system is working',
      timestamp: new Date().toISOString(),
      read: false,
      data: null,
    });
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((notif) => (notif.id === id ? { ...notif, read: true } : notif))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) =>
      prev.map((notif) => ({ ...notif, read: true }))
    );
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'incident': return '🚨';
      case 'assignment': return '✅';
      case 'escalation': return '⚠️';
      case 'resolution': return '✓';
      default: return '📢';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'incident': return COLORS.critical;
      case 'assignment': return COLORS.success;
      case 'escalation': return COLORS.high;
      case 'resolution': return COLORS.low;
      default: return COLORS.primary;
    }
  };

  const handleNotificationPress = (notification: Notification) => {
    markAsRead(notification.id);
    
    // Navigate based on notification type
    if (notification.type === 'incident' && notification.data) {
      navigation.navigate('IncidentDetail', { incident: notification.data });
    }
  };

  const renderNotification = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={[styles.notificationCard, !item.read && styles.unreadCard]}
      onPress={() => handleNotificationPress(item)}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: getNotificationColor(item.type) + '20' }]}>
        <Text style={styles.icon}>{getNotificationIcon(item.type)}</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.message} numberOfLines={2}>
          {item.message}
        </Text>
        <Text style={styles.time}>{getTimeAgo(item.timestamp)}</Text>
      </View>
      {!item.read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Notifications</Text>
      <View style={styles.headerActions}>
        <TouchableOpacity onPress={addTestNotification} style={styles.actionButton}>
          <Text style={styles.actionText}>Test</Text>
        </TouchableOpacity>
        {notifications.length > 0 && (
          <>
            <TouchableOpacity onPress={markAllAsRead} style={styles.actionButton}>
              <Text style={styles.actionText}>Mark all read</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={clearAll} style={styles.actionButton}>
              <Text style={[styles.actionText, { color: COLORS.critical }]}>Clear all</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>🔔</Text>
      <Text style={styles.emptyTitle}>No Notifications</Text>
      <Text style={styles.emptyText}>
        You're all caught up! New notifications will appear here.
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <View style={styles.container}>
      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id}
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
      {unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unreadCount}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: 50,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  listContent: {
    padding: SIZES.padding,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: SIZES.title1,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: SIZES.footnote,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusSm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  actionText: {
    fontSize: SIZES.footnote,
    fontWeight: '600',
    color: COLORS.primary,
  },
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radius,
    padding: SIZES.paddingMd,
    marginBottom: SIZES.spacingMd,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  unreadCard: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    backgroundColor: COLORS.backgroundElevated,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: SIZES.radiusSm,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 20,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: SIZES.headline,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  message: {
    fontSize: SIZES.subhead,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 6,
  },
  time: {
    fontSize: SIZES.caption1,
    color: COLORS.textTertiary,
    fontWeight: '500',
  },
  unreadDot: {
    width: 8,
    height: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 4,
    alignSelf: 'center',
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
    opacity: 0.5,
  },
  emptyTitle: {
    fontSize: SIZES.title3,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: SIZES.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  badge: {
    position: 'absolute',
    top: 60,
    right: 20,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  badgeText: {
    fontSize: SIZES.caption1,
    fontWeight: '700',
    color: COLORS.white,
    textAlign: 'center',
  },
});

export default NotificationsScreen;
