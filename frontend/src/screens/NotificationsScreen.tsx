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
import { UserAppStackParamList } from '../../App';
import { COLORS, SIZES } from '../constants/theme';
import { notificationsAPI } from '../services/api';
import { storage } from '../services/storage';
import { AppNotification } from '../types';

type Props = NativeStackScreenProps<UserAppStackParamList, 'Notifications'> & {
  onLogout: () => void;
};

export default function NotificationsScreen({ navigation, onLogout }: Props) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const getRecipientKeys = useCallback((user: { id?: string; email?: string }) => {
    return [...new Set([user.id, user.email].filter((value): value is string => Boolean(value && value.trim())))];
  }, []);

  const loadNotifications = useCallback(async () => {
    try {
      const rawUser = await storage.getItem('userData');
      if (!rawUser) {
        onLogout();
        return;
      }

      const user = JSON.parse(rawUser);
      const recipients = getRecipientKeys(user);
      if (!recipients.length) {
        onLogout();
        return;
      }

      const results = await Promise.all(
        recipients.map((recipient) => notificationsAPI.list({ recipient, limit: 100 }))
      );

      const deduped = Array.from(
        new Map(results.flat().map((item) => [item._id, item])).values()
      );

      const sorted = [...deduped].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setNotifications(sorted);
    } catch (error: any) {
      if (error.response?.status === 401) {
        Alert.alert('Session expired', 'Please sign in again.', [{ text: 'OK', onPress: onLogout }]);
      } else {
        Alert.alert('Unable to load notifications', error.response?.data?.error || error.message || 'Please try again.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getRecipientKeys, onLogout]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [loadNotifications])
  );

  const handleMarkAll = async () => {
    try {
      const rawUser = await storage.getItem('userData');
      if (!rawUser) return;
      const user = JSON.parse(rawUser);
      const recipients = getRecipientKeys(user);
      await Promise.all(recipients.map((recipient) => notificationsAPI.markAllAsRead(recipient)));
      setNotifications((current) =>
        current.map((item) => ({ ...item, status: 'read', read_at: item.read_at || new Date().toISOString() }))
      );
    } catch (error: any) {
      Alert.alert('Unable to mark all as read', error.response?.data?.error || error.message || 'Please try again.');
    }
  };

  const handleOpenNotification = async (item: AppNotification) => {
    try {
      if (item.status !== 'read') {
        await notificationsAPI.markAsRead(item._id);
        setNotifications((current) =>
          current.map((entry) =>
            entry._id === item._id ? { ...entry, status: 'read', read_at: new Date().toISOString() } : entry
          )
        );
      }

      const incidentId = item.related_incident || String(item.data?.incidentId || '');
      if (incidentId) {
        navigation.navigate('LiveTracking', { incidentId });
      }
    } catch (error: any) {
      Alert.alert('Unable to open notification', error.response?.data?.error || error.message || 'Please try again.');
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading notifications…</Text>
      </View>
    );
  }

  const unreadCount = notifications.filter((item) => item.status !== 'read').length;

  return (
    <View style={styles.screen}>
      <FlatList
        data={notifications}
        keyExtractor={(item) => item._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadNotifications(); }} />}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.heroCard}>
            <View style={styles.heroRow}>
              <View>
                <Text style={styles.heroTitle}>Your alerts</Text>
                <Text style={styles.heroSubtitle}>Stay on top of responder updates, escalations, and incident progress.</Text>
              </View>
              <View style={styles.countPill}>
                <Text style={styles.countPillText}>{unreadCount} new</Text>
              </View>
            </View>
            <Pressable style={styles.markAllButton} onPress={handleMarkAll}>
              <Text style={styles.markAllButtonText}>Mark all as read</Text>
            </Pressable>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>🔔</Text>
            <Text style={styles.emptyTitle}>No notifications yet</Text>
            <Text style={styles.emptySubtitle}>When updates arrive, they’ll appear here with one-tap actions.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable style={[styles.card, item.status !== 'read' && styles.cardUnread]} onPress={() => handleOpenNotification(item)}>
            <View style={styles.cardHeader}>
              <View style={styles.iconWrap}>
                <Text style={styles.iconText}>{getNotificationEmoji(item.type)}</Text>
              </View>
              <View style={styles.cardHeaderText}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardMeta}>{formatTime(item.created_at)} · {formatPriority(item.priority)}</Text>
              </View>
              {item.status !== 'read' ? <View style={styles.unreadDot} /> : null}
            </View>
            <Text style={styles.cardMessage}>{item.message}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

function getNotificationEmoji(type: AppNotification['type']) {
  switch (type) {
    case 'incident_assigned':
      return '🚑';
    case 'incident_resolved':
      return '✅';
    case 'incident_escalated':
      return '⚠️';
    case 'resource_assigned':
      return '📍';
    case 'alert':
      return '🚨';
    default:
      return '🔔';
  }
}

function formatPriority(priority: AppNotification['priority']) {
  return priority.charAt(0).toUpperCase() + priority.slice(1);
}

function formatTime(value: string) {
  return new Date(value).toLocaleString();
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
  heroCard: {
    backgroundColor: COLORS.backgroundElevated,
    borderRadius: SIZES.radiusXl,
    padding: SIZES.paddingLg,
    marginBottom: SIZES.spacingLg,
  },
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    alignItems: 'flex-start',
  },
  heroTitle: {
    fontSize: SIZES.title2,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: SIZES.footnote,
    color: COLORS.textSecondary,
    lineHeight: 18,
    maxWidth: 240,
  },
  countPill: {
    backgroundColor: '#FFE9E7',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  countPillText: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: SIZES.footnote,
  },
  markAllButton: {
    marginTop: 16,
    backgroundColor: COLORS.dark,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: 'center',
  },
  markAllButtonText: {
    color: COLORS.textInverse,
    fontWeight: '700',
    fontSize: SIZES.footnote,
  },
  emptyCard: {
    backgroundColor: COLORS.backgroundElevated,
    borderRadius: SIZES.radiusXl,
    padding: SIZES.paddingXl,
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 34,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: SIZES.title3,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: SIZES.footnote,
    lineHeight: 18,
    textAlign: 'center',
    color: COLORS.textSecondary,
  },
  card: {
    backgroundColor: COLORS.backgroundElevated,
    borderRadius: SIZES.radiusXl,
    padding: SIZES.paddingLg,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  cardUnread: {
    borderColor: '#FFD4CF',
    shadowColor: COLORS.primary,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF1F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 20,
  },
  cardHeaderText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: SIZES.callout,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  cardMeta: {
    fontSize: SIZES.caption1,
    color: COLORS.textSecondary,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  cardMessage: {
    fontSize: SIZES.footnote,
    lineHeight: 20,
    color: COLORS.text,
    marginTop: 14,
  },
});