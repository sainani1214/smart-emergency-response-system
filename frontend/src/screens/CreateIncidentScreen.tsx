import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { incidentsAPI, simulationAPI } from '../services/api';
import { AuthUser, IncidentSeverity, IncidentType } from '../types';
import { COLORS, SIZES } from '../constants/theme';
import { UserAppStackParamList } from '../../App';
import { storage } from '../services/storage';

type Props = NativeStackScreenProps<UserAppStackParamList, 'ReportIncident'> & {
  onLogout: () => void;
};

const emergencyTypes = [
  { label: 'Medical', value: IncidentType.MEDICAL, icon: '🚑', hint: 'Ambulance or urgent care needed' },
  { label: 'Fire', value: IncidentType.FIRE, icon: '🔥', hint: 'Smoke, flames, or evacuation risk' },
  { label: 'Security', value: IncidentType.SECURITY, icon: '🛡️', hint: 'Threat, trespassing, or safety concern' },
  { label: 'Water', value: IncidentType.WATER, icon: '💧', hint: 'Flooding, leakage, or drainage issue' },
  { label: 'Power', value: IncidentType.POWER, icon: '⚡', hint: 'Outage, sparks, or electrical damage' },
];

const severityOptions = [
  { label: 'Low', value: IncidentSeverity.LOW, description: 'No immediate danger' },
  { label: 'Medium', value: IncidentSeverity.MEDIUM, description: 'Needs timely response' },
  { label: 'High', value: IncidentSeverity.HIGH, description: 'Serious situation' },
  { label: 'Critical', value: IncidentSeverity.CRITICAL, description: 'Life-threatening or rapidly escalating' },
];

export default function CreateIncidentScreen({ navigation, onLogout }: Props) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: IncidentType.MEDICAL,
    severity: IncidentSeverity.HIGH,
    latitude: '18.521',
    longitude: '73.857',
    address: '',
    description: '',
    reporterName: '',
    reporterContact: '',
    reporterEmail: '',
  });

  const canSubmit = useMemo(() => {
    return Boolean(
      formData.description.trim() &&
      formData.reporterName.trim() &&
      formData.reporterContact.trim() &&
      formData.latitude.trim() &&
      formData.longitude.trim()
    );
  }, [formData]);

  const updateField = (key: keyof typeof formData, value: string | IncidentType | IncidentSeverity) => {
    setFormData((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!canSubmit) {
      Alert.alert('Missing details', 'Please complete the description, location, and reporter details.');
      return;
    }

      setLoading(true);
    try {
      console.log('[CreateIncident] Submitting emergency report...');
      const storedUser = await storage.getItem('userData').catch(() => null);
      const currentUser = storedUser ? (JSON.parse(storedUser) as AuthUser) : null;

      const payload = {
        type: formData.type,
        severity: formData.severity,
        location: {
          lat: Number(formData.latitude),
          lng: Number(formData.longitude),
          address: formData.address.trim() || undefined,
        },
        description: formData.description.trim(),
        reporter: {
          name: formData.reporterName.trim() || currentUser?.name || 'Authenticated user',
          contact: formData.reporterContact.trim(),
          email: formData.reporterEmail.trim() || currentUser?.email || undefined,
        },
      };

      const incident = await incidentsAPI.create(payload);
      console.log('[CreateIncident] Incident created:', incident.incident_id);
      
      const simulation = await simulationAPI.createEmergency({
        userLocation: {
          lat: payload.location.lat,
          lng: payload.location.lng,
          address: payload.location.address || 'User reported emergency location',
        },
        emergencyType: payload.type,
        severity: payload.severity,
      });
      console.log('[CreateIncident] Simulation created:', simulation.emergencyId);

      Alert.alert(
        'Emergency submitted',
        `Reference ${incident.incident_id} has been created and live tracking is ready.`,
        [
          {
            text: 'Track help live',
            onPress: () =>
              navigation.navigate('LiveTracking', {
                incidentId: incident.incident_id,
                simulationId: simulation.emergencyId,
              }),
          },
          { text: 'View report', onPress: () => navigation.navigate('MyReports') },
          { text: 'Stay here', style: 'cancel' },
        ]
      );

      setFormData({
        type: IncidentType.MEDICAL,
        severity: IncidentSeverity.HIGH,
        latitude: '18.521',
        longitude: '73.857',
        address: '',
        description: '',
        reporterName: '',
        reporterContact: '',
        reporterEmail: currentUser?.email || '',
      });
    } catch (error: any) {
      console.error('[CreateIncident] Error submitting:', error);
      
      if (error.response?.status === 401) {
        Alert.alert(
          'Session expired',
          'Please sign in again to report emergencies',
          [{ text: 'OK', onPress: onLogout }]
        );
      } else {
        Alert.alert(
          'Unable to submit',
          error.response?.data?.error || error.message || 'Please try again in a moment.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>LIVE SUPPORT</Text>
          </View>
          <Text style={styles.heroTitle}>Report an emergency in under a minute</Text>
          <Text style={styles.heroSubtitle}>
            Clear details help responders accept faster, prioritize correctly, and navigate directly to the right place.
          </Text>

          <View style={styles.buttonRow}>
            <Pressable style={styles.secondaryButton} onPress={() => navigation.navigate('MyReports')}>
              <Text style={styles.secondaryButtonText}>My reports</Text>
            </Pressable>
            <Pressable style={styles.secondaryButtonAlt} onPress={() => navigation.navigate('NearbyIncidents')}>
              <Text style={styles.secondaryButtonAltText}>Nearby</Text>
            </Pressable>
            <Pressable style={styles.secondaryButtonGhost} onPress={() => navigation.navigate('Settings')}>
              <Text style={styles.secondaryButtonGhostText}>Settings</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Emergency type</Text>
          <Text style={styles.sectionHint}>Choose the option that best matches the incident.</Text>
          <View style={styles.typeGrid}>
            {emergencyTypes.map((item) => {
              const active = formData.type === item.value;
              return (
                <Pressable
                  key={item.value}
                  style={[styles.typeCard, active && styles.typeCardActive]}
                  onPress={() => updateField('type', item.value)}
                >
                  <Text style={styles.typeIcon}>{item.icon}</Text>
                  <Text style={[styles.typeLabel, active && styles.typeLabelActive]}>{item.label}</Text>
                  <Text style={[styles.typeHint, active && styles.typeHintActive]}>{item.hint}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Severity</Text>
          <Text style={styles.sectionHint}>This controls urgency and helps the responder app rank the request.</Text>
          {severityOptions.map((option) => {
            const active = formData.severity === option.value;
            return (
              <Pressable
                key={option.value}
                style={[styles.severityRow, active && styles.severityRowActive]}
                onPress={() => updateField('severity', option.value)}
              >
                <View>
                  <Text style={[styles.severityTitle, active && styles.severityTitleActive]}>{option.label}</Text>
                  <Text style={[styles.severityDescription, active && styles.severityDescriptionActive]}>
                    {option.description}
                  </Text>
                </View>
                <View style={[styles.severityDot, getSeverityDotStyle(option.value, active)]} />
              </Pressable>
            );
          })}
        </View>

        <View style={styles.formCard}>
          <SectionHeader title="Incident details" subtitle="Describe what’s happening as clearly as possible." />
          <InputLabel label="Description" required />
          <TextInput
            style={[styles.input, styles.multilineInput]}
            placeholder="What happened? Are there injuries, fire, blocked access, or immediate risks?"
            placeholderTextColor={COLORS.textMuted}
            multiline
            numberOfLines={5}
            value={formData.description}
            onChangeText={(value) => updateField('description', value)}
          />

          <SectionHeader title="Location" subtitle="Exact coordinates help with routing. Address helps human verification." />
          <View style={styles.row}>
            <View style={styles.halfColumn}>
              <InputLabel label="Latitude" required />
              <TextInput
                style={styles.input}
                placeholder="18.521"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="decimal-pad"
                value={formData.latitude}
                onChangeText={(value) => updateField('latitude', value)}
              />
            </View>
            <View style={styles.halfColumn}>
              <InputLabel label="Longitude" required />
              <TextInput
                style={styles.input}
                placeholder="73.857"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="decimal-pad"
                value={formData.longitude}
                onChangeText={(value) => updateField('longitude', value)}
              />
            </View>
          </View>
          <InputLabel label="Address or landmark" />
          <TextInput
            style={styles.input}
            placeholder="Building name, gate number, floor, or landmark"
            placeholderTextColor={COLORS.textMuted}
            value={formData.address}
            onChangeText={(value) => updateField('address', value)}
          />

          <SectionHeader title="Reporter details" subtitle="Responders may use this to verify access or ask quick follow-up questions." />
          <InputLabel label="Full name" required />
          <TextInput
            style={styles.input}
            placeholder="Your name"
            placeholderTextColor={COLORS.textMuted}
            value={formData.reporterName}
            onChangeText={(value) => updateField('reporterName', value)}
          />
          <InputLabel label="Phone number" required />
          <TextInput
            style={styles.input}
            placeholder="Primary contact number"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="phone-pad"
            value={formData.reporterContact}
            onChangeText={(value) => updateField('reporterContact', value)}
          />
          <InputLabel label="Email" />
          <TextInput
            style={styles.input}
            placeholder="Optional email"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            value={formData.reporterEmail}
            onChangeText={(value) => updateField('reporterEmail', value)}
          />
        </View>

        <View style={styles.submitPanel}>
          <Text style={styles.submitTitle}>Ready to dispatch this report?</Text>
          <Text style={styles.submitHint}>
            Your request will appear in the responder dashboard for accept or reject handling.
          </Text>
          <Pressable
            style={[styles.primaryButton, (!canSubmit || loading) && styles.primaryButtonDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit || loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.textInverse} />
            ) : (
              <Text style={styles.primaryButtonText}>Submit emergency report</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderTitle}>{title}</Text>
      <Text style={styles.sectionHeaderSubtitle}>{subtitle}</Text>
    </View>
  );
}

function InputLabel({ label, required = false }: { label: string; required?: boolean }) {
  return (
    <Text style={styles.inputLabel}>
      {label}
      {required ? <Text style={styles.required}> *</Text> : null}
    </Text>
  );
}

function getSeverityDotStyle(severity: IncidentSeverity, active: boolean) {
  const backgroundColor =
    severity === IncidentSeverity.LOW
      ? COLORS.low
      : severity === IncidentSeverity.MEDIUM
        ? COLORS.medium
        : severity === IncidentSeverity.HIGH
          ? COLORS.high
          : COLORS.critical;

  return {
    backgroundColor,
    opacity: active ? 1 : 0.55,
    transform: [{ scale: active ? 1.05 : 1 }],
  } as const;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SIZES.paddingLg,
    paddingBottom: SIZES.spacingXxl * 2,
    gap: SIZES.spacingLg,
  },
  heroCard: {
    backgroundColor: COLORS.dark,
    padding: SIZES.paddingXl,
    borderRadius: SIZES.radiusXl,
    gap: SIZES.spacingMd,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  heroBadgeText: {
    color: COLORS.textInverse,
    fontSize: SIZES.caption1,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  heroTitle: {
    color: COLORS.textInverse,
    fontSize: SIZES.title1,
    fontWeight: '700',
    lineHeight: 34,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: SIZES.subhead,
    lineHeight: 22,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#FFFFFF',
    fontSize: SIZES.footnote,
    fontWeight: '700',
  },
  secondaryButtonAlt: {
    flex: 1,
    backgroundColor: COLORS.secondary,
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  secondaryButtonAltText: {
    color: '#FFFFFF',
    fontSize: SIZES.footnote,
    fontWeight: '700',
  },
  secondaryButtonGhost: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonGhostText: {
    color: '#FFFFFF',
    fontSize: SIZES.footnote,
    fontWeight: '700',
  },
  section: {
    gap: SIZES.spacingMd,
  },
  sectionTitle: {
    fontSize: SIZES.title3,
    fontWeight: '700',
    color: COLORS.text,
  },
  sectionHint: {
    fontSize: SIZES.subhead,
    color: COLORS.textSecondary,
    lineHeight: 21,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SIZES.spacingMd,
  },
  typeCard: {
    width: '47%',
    minHeight: 134,
    backgroundColor: COLORS.backgroundElevated,
    borderRadius: SIZES.radiusLg,
    padding: SIZES.paddingMd,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  typeCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#FFF3F2',
  },
  typeIcon: {
    fontSize: 28,
  },
  typeLabel: {
    fontSize: SIZES.callout,
    fontWeight: '700',
    color: COLORS.text,
  },
  typeLabelActive: {
    color: COLORS.primaryDark,
  },
  typeHint: {
    fontSize: SIZES.footnote,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  typeHintActive: {
    color: COLORS.primaryDark,
  },
  severityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundElevated,
    paddingHorizontal: SIZES.paddingMd,
    paddingVertical: 16,
    borderRadius: SIZES.radiusLg,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 10,
  },
  severityRowActive: {
    borderColor: COLORS.dark,
    backgroundColor: COLORS.surfaceSecondary,
  },
  severityTitle: {
    fontSize: SIZES.callout,
    fontWeight: '700',
    color: COLORS.text,
  },
  severityTitleActive: {
    color: COLORS.dark,
  },
  severityDescription: {
    marginTop: 4,
    fontSize: SIZES.footnote,
    color: COLORS.textSecondary,
  },
  severityDescriptionActive: {
    color: COLORS.text,
  },
  severityDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  formCard: {
    backgroundColor: COLORS.backgroundElevated,
    borderRadius: SIZES.radiusXl,
    padding: SIZES.paddingLg,
    gap: SIZES.spacingSm,
  },
  sectionHeader: {
    marginTop: 4,
    marginBottom: SIZES.spacingMd,
    gap: 4,
  },
  sectionHeaderTitle: {
    fontSize: SIZES.title3,
    fontWeight: '700',
    color: COLORS.text,
  },
  sectionHeaderSubtitle: {
    fontSize: SIZES.footnote,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  inputLabel: {
    marginBottom: 8,
    fontSize: SIZES.footnote,
    fontWeight: '700',
    color: COLORS.text,
  },
  required: {
    color: COLORS.primary,
  },
  input: {
    height: SIZES.inputHeight + 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radius,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 14,
    fontSize: SIZES.body,
    color: COLORS.text,
    marginBottom: SIZES.spacingMd,
  },
  multilineInput: {
    height: 120,
    paddingTop: 14,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: SIZES.spacingMd,
  },
  halfColumn: {
    flex: 1,
  },
  submitPanel: {
    backgroundColor: COLORS.backgroundElevated,
    borderRadius: SIZES.radiusXl,
    padding: SIZES.paddingLg,
    gap: 10,
    marginBottom: SIZES.spacingXxl,
  },
  submitTitle: {
    fontSize: SIZES.title3,
    fontWeight: '700',
    color: COLORS.text,
  },
  submitHint: {
    fontSize: SIZES.footnote,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  primaryButton: {
    marginTop: 8,
    backgroundColor: COLORS.primary,
    minHeight: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.45,
  },
  primaryButtonText: {
    color: COLORS.textInverse,
    fontSize: SIZES.callout,
    fontWeight: '700',
  },
});
