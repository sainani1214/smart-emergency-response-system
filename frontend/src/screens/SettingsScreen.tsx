import React from 'react';
import { Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { UserAppStackParamList } from '../../App';
import { COLORS, SIZES } from '../constants/theme';

type Props = NativeStackScreenProps<UserAppStackParamList, 'Settings'> & {
  onLogout: () => void;
};

export default function SettingsScreen({ onLogout }: Props) {
  const confirmLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to end this session?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: onLogout },
    ]);
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <Text style={styles.heroEyebrow}>SETTINGS</Text>
          <Text style={styles.heroTitle}>Account and control center</Text>
          <Text style={styles.heroSubtitle}>
            Keep your emergency reporting experience secure and manage your session from one clean place.
          </Text>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Session management</Text>
          <Text style={styles.panelBody}>Use logout if you are switching users or ending access on this device.</Text>
          <Pressable style={styles.logoutButton} onPress={confirmLogout}>
            <Text style={styles.logoutButtonText}>Log out</Text>
          </Pressable>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Security note</Text>
          <Text style={styles.panelBody}>Reporting incidents and viewing your reports both require an authenticated user session.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SIZES.paddingLg,
    gap: SIZES.spacingLg,
    paddingBottom: SIZES.spacingXxl * 2,
  },
  heroCard: {
    backgroundColor: COLORS.dark,
    borderRadius: SIZES.radiusXl,
    padding: SIZES.paddingXl,
    gap: 10,
  },
  heroEyebrow: {
    color: 'rgba(255,255,255,0.76)',
    fontSize: SIZES.caption1,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  heroTitle: {
    color: COLORS.textInverse,
    fontSize: SIZES.title1,
    fontWeight: '800',
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: SIZES.footnote,
    lineHeight: 21,
  },
  panel: {
    backgroundColor: COLORS.backgroundElevated,
    borderRadius: SIZES.radiusXl,
    padding: SIZES.paddingLg,
    gap: 12,
  },
  panelTitle: {
    color: COLORS.text,
    fontSize: SIZES.title3,
    fontWeight: '700',
  },
  panelBody: {
    color: COLORS.textSecondary,
    fontSize: SIZES.footnote,
    lineHeight: 21,
  },
  logoutButton: {
    marginTop: 6,
    backgroundColor: '#DE3F33',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: SIZES.callout,
    fontWeight: '800',
  },
});