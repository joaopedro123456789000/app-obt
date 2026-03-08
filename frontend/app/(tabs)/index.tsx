import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { collectionPointsApi } from '../../utils/api';
import { CollectionPoint } from '../../types';
import { useRouter } from 'expo-router';

const WASTE_TYPES = [
  { key: 'all', label: 'Todos', icon: 'apps', color: '#6B7280' },
  { key: 'plastic', label: 'Plástico', icon: 'water', color: '#3B82F6' },
  { key: 'paper', label: 'Papel', icon: 'document', color: '#F59E0B' },
  { key: 'glass', label: 'Vidro', icon: 'wine', color: '#10B981' },
  { key: 'metal', label: 'Metal', icon: 'hardware-chip', color: '#6B7280' },
  { key: 'electronic', label: 'Eletrônico', icon: 'phone-portrait', color: '#8B5CF6' },
  { key: 'organic', label: 'Orgânico', icon: 'leaf', color: '#84CC16' },
];

export default function MapScreen() {
  const router = useRouter();
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [points, setPoints] = useState<CollectionPoint[]>([]);
  const [filteredPoints, setFilteredPoints] = useState<CollectionPoint[]>([]);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [region, setRegion] = useState({
    latitude: -23.5505,
    longitude: -46.6333,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  });

  useEffect(() => {
    requestLocationPermission();
    loadPoints();
  }, []);

  useEffect(() => {
    filterPoints();
  }, [selectedFilter, points]);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setLocation(loc);
        setRegion({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        });
      }
    } catch (error) {
      console.error('Location error:', error);
    }
  };

  const loadPoints = async () => {
    try {
      setLoading(true);
      const data = await collectionPointsApi.getPoints();
      setPoints(data);
      setFilteredPoints(data);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível carregar os pontos');
    } finally {
      setLoading(false);
    }
  };

  const filterPoints = () => {
    if (selectedFilter === 'all') {
      setFilteredPoints(points);
    } else {
      const filtered = points.filter((p) =>
        p.types_accepted.includes(selectedFilter)
      );
      setFilteredPoints(filtered);
    }
  };

  const getMarkerColor = (point: CollectionPoint) => {
    if (point.is_school) return '#F59E0B';
    if (point.capacity_percentage > 80) return '#EF4444';
    return '#10B981';
  };

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        region={region}
        showsUserLocation
        showsMyLocationButton
        provider={PROVIDER_DEFAULT}
      >
        {filteredPoints.map((point) => (
          <Marker
            key={point.point_id}
            coordinate={{
              latitude: point.latitude,
              longitude: point.longitude,
            }}
            pinColor={getMarkerColor(point)}
            title={point.name}
            description={`${point.address} - ${point.hours || 'Horário não informado'}`}
          />
        ))}
      </MapView>

      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {WASTE_TYPES.map((type) => (
            <TouchableOpacity
              key={type.key}
              style={[
                styles.filterButton,
                selectedFilter === type.key && {
                  backgroundColor: type.color,
                },
              ]}
              onPress={() => setSelectedFilter(type.key)}
            >
              <Ionicons
                name={type.icon as any}
                size={20}
                color={selectedFilter === type.key ? '#FFF' : type.color}
              />
              <Text
                style={[
                  styles.filterText,
                  selectedFilter === type.key && styles.filterTextActive,
                ]}
              >
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Ionicons name="location" size={24} color="#10B981" />
          <Text style={styles.statNumber}>{filteredPoints.length}</Text>
          <Text style={styles.statLabel}>Pontos</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/deliver')}
      >
        <Ionicons name="camera" size={32} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  filterContainer: {
    position: 'absolute',
    top: 16,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  filterText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  filterTextActive: {
    color: '#FFF',
  },
  statsContainer: {
    position: 'absolute',
    bottom: 80,
    left: 16,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  statBox: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#065F46',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
