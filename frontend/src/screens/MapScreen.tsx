import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator, Platform } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { Incident, Resource, IncidentSeverity, ResourceStatus } from '../types';
import { incidentsAPI, resourcesAPI } from '../services/api';
import websocketService from '../services/websocket';
import { COLORS, SIZES } from '../constants/theme';

const MapScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef<MapView>(null);

  const initialRegion: Region = {
    latitude: 18.5204,
    longitude: 73.8567,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  useEffect(() => {
    fetchData();
    setupWebSocketListeners();
    
    // Connect WebSocket
    websocketService.connect();

    return () => {
      // Cleanup if needed
    };
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch all recent incidents (not just open) and all resources
      const [incidentsResponse, resourcesData] = await Promise.all([
        incidentsAPI.getAll({ limit: 50 }), 
        resourcesAPI.getAll(),
      ]);

      console.log('Map: Incidents loaded:', incidentsResponse.incidents?.length || 0);
      console.log('Map: Resources loaded:', resourcesData?.length || 0);

      const incidents = incidentsResponse.incidents || [];
      const resources = resourcesData || [];

      setIncidents(incidents);
      setResources(resources);
      
      // Fit map to show all markers after state update
      setTimeout(() => {
        if (incidents.length > 0 || resources.length > 0) {
          fitMarkersToMap(incidents, resources);
        }
      }, 500);
    } catch (error: any) {
      console.error('Map: Failed to fetch data:', error);
      Alert.alert('Error', error.message || 'Failed to load map data');
    } finally {
      setLoading(false);
    }
  };

  const fitMarkersToMap = (incidentsData: Incident[], resourcesData: Resource[]) => {
    const allCoordinates = [
      ...incidentsData.map((i) => ({ latitude: i.location.lat, longitude: i.location.lng })),
      ...resourcesData.map((r) => ({ latitude: r.location.lat, longitude: r.location.lng })),
    ];

    console.log('Map: Fitting', allCoordinates.length, 'markers');

    if (allCoordinates.length > 0 && mapRef.current) {
      mapRef.current.fitToCoordinates(allCoordinates, {
        edgePadding: { top: 100, right: 50, bottom: 200, left: 50 },
        animated: true,
      });
    }
  };

  const setupWebSocketListeners = () => {
    websocketService.onIncidentCreated((incident) => {
      setIncidents((prev) => [incident, ...prev]);
    });

    websocketService.onIncidentUpdated((incident) => {
      setIncidents((prev) =>
        prev.map((item) => (item._id === incident._id ? incident : item))
      );
    });

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

  const getIncidentColor = (severity: IncidentSeverity): string => {
    switch (severity) {
      case IncidentSeverity.CRITICAL:
        return COLORS.critical;
      case IncidentSeverity.HIGH:
        return COLORS.high;
      case IncidentSeverity.MEDIUM:
        return COLORS.medium;
      case IncidentSeverity.LOW:
        return COLORS.low;
      default:
        return COLORS.gray;
    }
  };

  const getResourceColor = (status: ResourceStatus): string => {
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

  const getIncidentIcon = (type: string): string => {
    switch (type) {
      case 'medical':
        return '🚑';
      case 'fire':
        return '🔥';
      case 'security':
        return '🛡️';
      case 'water':
        return '💧';
      case 'power':
        return '⚡';
      default:
        return '⚠️';
    }
  };

  const getResourceIcon = (type: string): string => {
    switch (type) {
      case 'ambulance':
        return '🚑';
      case 'fire_truck':
        return '🚒';
      case 'police':
        return '🚓';
      case 'security':
        return '🛡️';
      case 'maintenance':
        return '🔧';
      default:
        return '🚗';
    }
  };

  return (
    <View style={styles.container}>
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading map data...</Text>
        </View>
      )}
      
      <MapView
        ref={mapRef}
        provider={Platform.OS === 'ios' ? undefined : PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={initialRegion}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={true}
        showsScale={true}
      >
        {/* Incident Markers */}
        {incidents.map((incident) => (
          <Marker
            key={incident._id}
            coordinate={{
              latitude: incident.location.lat,
              longitude: incident.location.lng,
            }}
            pinColor={getIncidentColor(incident.severity)}
            title={`${getIncidentIcon(incident.type)} ${incident.incident_id}`}
            description={`${incident.severity.toUpperCase()} - ${incident.status}`}
            onCalloutPress={() => navigation.navigate('IncidentDetail', { incident })}
          />
        ))}

        {/* Resource Markers */}
        {resources.map((resource) => (
          <Marker
            key={resource._id}
            coordinate={{
              latitude: resource.location.lat,
              longitude: resource.location.lng,
            }}
            pinColor={getResourceColor(resource.status)}
            title={`${getResourceIcon(resource.type)} ${resource.unit_id}`}
            description={`${resource.type.replace('_', ' ').toUpperCase()} - ${resource.status}`}
          />
        ))}
      </MapView>

      {/* Legend */}
      <View style={styles.legend}>
        <Text style={styles.legendTitle}>Map Legend</Text>
        
        <View style={styles.legendSection}>
          <Text style={styles.legendSubtitle}>Incidents:</Text>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: COLORS.critical }]} />
            <Text style={styles.legendText}>Critical</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: COLORS.high }]} />
            <Text style={styles.legendText}>High</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: COLORS.medium }]} />
            <Text style={styles.legendText}>Medium</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: COLORS.low }]} />
            <Text style={styles.legendText}>Low</Text>
          </View>
        </View>

        <View style={styles.legendSection}>
          <Text style={styles.legendSubtitle}>Resources:</Text>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: COLORS.available }]} />
            <Text style={styles.legendText}>Available</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: COLORS.dispatched }]} />
            <Text style={styles.legendText}>Dispatched</Text>
          </View>
        </View>
      </View>


    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  map: {
    flex: 1,
  },
  legend: {
    position: 'absolute',
    top: 70,
    right: SIZES.padding,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderRadius: SIZES.radius,
    padding: SIZES.paddingSm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    maxWidth: 140,
    borderWidth: 0.5,
    borderColor: COLORS.border,
  },
  legendTitle: {
    fontSize: SIZES.md,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SIZES.marginSm,
  },
  legendSection: {
    marginBottom: SIZES.marginSm,
  },
  legendSubtitle: {
    fontSize: SIZES.sm,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 6,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  legendText: {
    fontSize: SIZES.xs,
    color: COLORS.textSecondary,
  },
  statsBadge: {
    position: 'absolute',
    bottom: 90,
    left: SIZES.padding,
    right: SIZES.padding,
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusLg,
    padding: SIZES.paddingSm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 0.5,
    borderColor: COLORS.border,
  },
  statsText: {
    fontSize: SIZES.sm,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingText: {
    marginTop: SIZES.marginSm,
    fontSize: SIZES.md,
    color: COLORS.textSecondary,
  },
});

export default MapScreen;
