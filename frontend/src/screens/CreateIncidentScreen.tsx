import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { incidentsAPI } from '../services/api';
import { IncidentType, IncidentSeverity } from '../types';
import { COLORS, SIZES } from '../constants/theme';

const CreateIncidentScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: IncidentType.MEDICAL,
    severity: IncidentSeverity.MEDIUM,
    latitude: '18.521',
    longitude: '73.857',
    address: '',
    description: '',
    reporterName: '',
    reporterContact: '',
    reporterEmail: '',
  });

  const handleSubmit = async () => {
    // Validation
    if (!formData.description.trim()) {
      Alert.alert('Error', 'Please enter incident description');
      return;
    }

    if (!formData.reporterName.trim() || !formData.reporterContact.trim()) {
      Alert.alert('Error', 'Please enter reporter details');
      return;
    }

    setLoading(true);

    try {
      const incident = await incidentsAPI.create({
        type: formData.type,
        severity: formData.severity,
        location: {
          lat: parseFloat(formData.latitude),
          lng: parseFloat(formData.longitude),
          address: formData.address.trim() || undefined,
        },
        description: formData.description.trim(),
        reporter: {
          name: formData.reporterName.trim(),
          contact: formData.reporterContact.trim(),
          email: formData.reporterEmail.trim() || undefined,
        },
      });

      Alert.alert('Success', `Incident ${incident.incident_id} created successfully!`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create incident');
    } finally {
      setLoading(false);
    }
  };

  const TypeButton = ({ type, icon }: { type: IncidentType; icon: string }) => (
    <TouchableOpacity
      style={[
        styles.typeButton,
        formData.type === type && styles.typeButtonActive,
      ]}
      onPress={() => setFormData({ ...formData, type })}
    >
      <Text style={styles.typeIcon}>{icon}</Text>
      <Text
        style={[
          styles.typeText,
          formData.type === type && styles.typeTextActive,
        ]}
      >
        {type}
      </Text>
    </TouchableOpacity>
  );

  const SeverityButton = ({ severity, color }: { severity: IncidentSeverity; color: string }) => (
    <TouchableOpacity
      style={[
        styles.severityButton,
        formData.severity === severity && { backgroundColor: color },
      ]}
      onPress={() => setFormData({ ...formData, severity })}
    >
      <Text
        style={[
          styles.severityText,
          formData.severity === severity && styles.severityTextActive,
        ]}
      >
        {severity.toUpperCase()}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Report New Incident</Text>

        {/* Type Selection */}
        <Text style={styles.label}>Incident Type *</Text>
        <View style={styles.typeContainer}>
          <TypeButton type={IncidentType.MEDICAL} icon="🚑" />
          <TypeButton type={IncidentType.FIRE} icon="🔥" />
          <TypeButton type={IncidentType.SECURITY} icon="🛡️" />
          <TypeButton type={IncidentType.WATER} icon="💧" />
          <TypeButton type={IncidentType.POWER} icon="⚡" />
        </View>

        {/* Severity Selection */}
        <Text style={styles.label}>Severity Level *</Text>
        <View style={styles.severityContainer}>
          <SeverityButton severity={IncidentSeverity.LOW} color={COLORS.low} />
          <SeverityButton severity={IncidentSeverity.MEDIUM} color={COLORS.medium} />
          <SeverityButton severity={IncidentSeverity.HIGH} color={COLORS.high} />
          <SeverityButton severity={IncidentSeverity.CRITICAL} color={COLORS.critical} />
        </View>

        {/* Description */}
        <Text style={styles.label}>Description *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Describe the incident..."
          value={formData.description}
          onChangeText={(text) => setFormData({ ...formData, description: text })}
          multiline
          numberOfLines={4}
        />

        {/* Location */}
        <Text style={styles.label}>Location</Text>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, styles.halfInput]}
            placeholder="Latitude"
            value={formData.latitude}
            onChangeText={(text) => setFormData({ ...formData, latitude: text })}
            keyboardType="decimal-pad"
          />
          <TextInput
            style={[styles.input, styles.halfInput]}
            placeholder="Longitude"
            value={formData.longitude}
            onChangeText={(text) => setFormData({ ...formData, longitude: text })}
            keyboardType="decimal-pad"
          />
        </View>
        <TextInput
          style={styles.input}
          placeholder="Address (optional)"
          value={formData.address}
          onChangeText={(text) => setFormData({ ...formData, address: text })}
        />

        {/* Reporter Info */}
        <Text style={styles.label}>Reporter Information *</Text>
        <TextInput
          style={styles.input}
          placeholder="Your Name"
          value={formData.reporterName}
          onChangeText={(text) => setFormData({ ...formData, reporterName: text })}
        />
        <TextInput
          style={styles.input}
          placeholder="Contact Number"
          value={formData.reporterContact}
          onChangeText={(text) => setFormData({ ...formData, reporterContact: text })}
          keyboardType="phone-pad"
        />
        <TextInput
          style={styles.input}
          placeholder="Email (optional)"
          value={formData.reporterEmail}
          onChangeText={(text) => setFormData({ ...formData, reporterEmail: text })}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.submitButtonText}>🚨 Report Incident</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.light,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: SIZES.padding,
    paddingTop: 60,
    paddingBottom: 100,
  },
  title: {
    fontSize: SIZES.xxl,
    fontWeight: '700',
    color: COLORS.dark,
    marginBottom: 24,
  },
  label: {
    fontSize: SIZES.md,
    fontWeight: '600',
    color: COLORS.dark,
    marginBottom: 8,
    marginTop: 16,
  },
  typeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  typeButton: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: COLORS.white,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    margin: 4,
    borderWidth: 2,
    borderColor: COLORS.light,
  },
  typeButtonActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '10',
  },
  typeIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  typeText: {
    fontSize: SIZES.sm,
    color: COLORS.gray,
    textTransform: 'capitalize',
  },
  typeTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  severityContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  severityButton: {
    flex: 1,
    backgroundColor: COLORS.white,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 2,
    borderColor: COLORS.light,
  },
  severityText: {
    fontSize: SIZES.xs,
    fontWeight: '600',
    color: COLORS.gray,
  },
  severityTextActive: {
    color: COLORS.white,
  },
  input: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: 12,
    fontSize: SIZES.md,
    color: COLORS.dark,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.light,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInput: {
    flex: 1,
    marginHorizontal: 4,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  submitButtonDisabled: {
    backgroundColor: COLORS.gray,
  },
  submitButtonText: {
    fontSize: SIZES.lg,
    fontWeight: '700',
    color: COLORS.white,
  },
});

export default CreateIncidentScreen;
