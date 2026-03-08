import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { collectionPointsApi, calculateDistance } from '../../utils/api';
import { CollectionPoint } from '../../types';
import { useRouter } from 'expo-router';
import { useThemeStore, colors } from '../../store/useThemeStore';

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
  const { theme } = useThemeStore();
  const themeColors = colors[theme];
  
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [points, setPoints] = useState<CollectionPoint[]>([]);
  const [filteredPoints, setFilteredPoints] = useState<CollectionPoint[]>([]);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [locationLoading, setLocationLoading] = useState(false);

  useEffect(() => {
    requestLocationPermission();
    loadPoints();
  }, []);

  useEffect(() => {
    filterPoints();
  }, [selectedFilter, points]);

  const requestLocationPermission = async () => {
    try {
      setLocationLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setLocation(loc);
      }
    } catch (error) {
      console.error('Location error:', error);
    } finally {
      setLocationLoading(false);
    }
  };

  const loadPoints = async () => {
    try {
      setLoading(true);
      const data = await collectionPointsApi.getPoints();
      setPoints(data);
      setFilteredPoints(data);
    } catch (error) {
      console.error('Load points error:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterPoints = () => {
    let filtered = points;
    
    if (selectedFilter !== 'all') {
      filtered = points.filter((p) => p.types_accepted.includes(selectedFilter));
    }

    // Calculate distance and sort by proximity if location available
    if (location) {
      filtered = filtered.map((point) => ({
        ...point,
        distance_km: calculateDistance(
          location.coords.latitude,
          location.coords.longitude,
          point.latitude,
          point.longitude
        ),
      })).sort((a, b) => (a.distance_km || 0) - (b.distance_km || 0));
    }

    setFilteredPoints(filtered);
  };

  const getPointIcon = (point: CollectionPoint) => {
    if (point.is_school) return 'school';
    return 'location';
  };

  const getPointColor = (point: CollectionPoint) => {
    if (point.is_school) return '#F59E0B';
    if (point.capacity_percentage > 80) return '#EF4444';
    return '#10B981';
  };

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: themeColors.background }]}>
        <ActivityIndicator size=\"large\" color={themeColors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <ScrollView style={styles.content}>
        <View style={[styles.header, { backgroundColor: themeColors.primary }]}>
          <Text style={styles.headerTitle}>Pontos de Coleta</Text>
          <View style={styles.headerRow}>
            <Text style={styles.headerSubtitle}>
              {filteredPoints.length} ponto{filteredPoints.length !== 1 ? 's' : ''}
            </Text>
            {locationLoading && (
              <ActivityIndicator size=\"small\" color=\"#FFF\" style={{ marginLeft: 8 }} />
            )}
            {location && !locationLoading && (
              <View style={styles.locationBadge}>
                <Ionicons name=\"navigate\" size={12} color=\"#10B981\" />
                <Text style={styles.locationText}>Ordenado por proximidade</Text>
              </View>
            )}
          </View>
        </View>

        <View style={[styles.filterContainer, { backgroundColor: themeColors.surface, borderBottomColor: themeColors.border }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {WASTE_TYPES.map((type) => (
              <TouchableOpacity
                key={type.key}
                style={[
                  styles.filterButton,
                  { backgroundColor: themeColors.background },
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
                    { color: themeColors.text },
                    selectedFilter === type.key && styles.filterTextActive,
                  ]}
                >
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.pointsList}>
          {filteredPoints.map((point) => (
            <View key={point.point_id} style={[styles.pointCard, { backgroundColor: themeColors.surface }, Platform.select({
              web: { boxShadow: `0 2px 8px ${theme === 'dark' ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.1)'}` },
              default: {},
            })]}>
              <View
                style={[
                  styles.pointIcon,
                  { backgroundColor: getPointColor(point) + '20' },
                ]}
              >
                <Ionicons
                  name={getPointIcon(point) as any}
                  size={32}
                  color={getPointColor(point)}
                />
              </View>

              <View style={styles.pointInfo}>
                <Text style={[styles.pointName, { color: themeColors.text }]}>{point.name}</Text>
                <Text style={[styles.pointAddress, { color: themeColors.textSecondary }]}>{point.address}</Text>
                <Text style={[styles.pointCity, { color: themeColors.textTertiary }]}>
                  {point.city}, {point.state}
                </Text>
                {point.distance_km !== undefined && (
                  <View style={styles.distanceRow}>
                    <Ionicons name=\"navigate\" size={14} color={themeColors.primary} />
                    <Text style={[styles.distance, { color: themeColors.primary }]}>
                      {point.distance_km < 1 
                        ? `${(point.distance_km * 1000).toFixed(0)}m` 
                        : `${point.distance_km.toFixed(1)}km`}
                    </Text>
                  </View>
                )}
                {point.hours && (
                  <Text style={[styles.pointHours, { color: themeColors.success }]}>
                    <Ionicons name=\"time\" size={12} /> {point.hours}
                  </Text>
                )}
                <View style={styles.pointTypes}>
                  {point.types_accepted.slice(0, 4).map((type) => (
                    <View key={type} style={[styles.typeTag, { backgroundColor: themeColors.background }]}>
                      <Text style={[styles.typeTagText, { color: themeColors.textSecondary }]}>{type}</Text>
                    </View>
                  ))}
                  {point.types_accepted.length > 4 && (
                    <View style={[styles.typeTag, { backgroundColor: themeColors.background }]}>
                      <Text style={[styles.typeTagText, { color: themeColors.textSecondary }]}>
                        +{point.types_accepted.length - 4}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {point.is_school && (
                <View style={styles.schoolBadge}>
                  <Ionicons name=\"school\" size={16} color=\"#F59E0B\" />
                </View>
              )}
            </View>
          ))}
        </View>

        {Platform.OS === 'web' && (
          <View style={[styles.webNotice, { backgroundColor: themeColors.info + '20' }]}>
            <Ionicons name=\"information-circle\" size={24} color={themeColors.info} />
            <Text style={[styles.webNoticeText, { color: themeColors.info }]}>
              O mapa interativo está disponível no app mobile. Use o Expo Go para a experiência completa!
            </Text>
          </View>
        )}
      </ScrollView>

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: themeColors.primary }, Platform.select({
          web: {
            boxShadow: `0 4px 12px ${themeColors.primary}66`,
            cursor: 'pointer',
          },
          default: {},
        })]}
        onPress={() => router.push('/deliver')}
      >
        <Ionicons name=\"camera\" size={32} color=\"#FFF\" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  header: {
    padding: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#D1FAE5',
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  locationText: {
    fontSize: 10,
    color: '#10B981',
    marginLeft: 4,
    fontWeight: '600',
  },
  filterContainer: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
  },
  filterText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#FFF',
  },
  pointsList: {
    padding: 16,
  },
  pointCard: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  pointIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pointInfo: {
    flex: 1,
    marginLeft: 16,
  },
  pointName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  pointAddress: {
    fontSize: 14,
    marginBottom: 2,
  },
  pointCity: {
    fontSize: 12,
    marginBottom: 8,
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  distance: {
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  pointHours: {
    fontSize: 12,
    marginBottom: 8,
  },
  pointTypes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  typeTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeTagText: {
    fontSize: 10,
    textTransform: 'uppercase',
  },
  schoolBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  webNotice: {
    flexDirection: 'row',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  webNoticeText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    lineHeight: 20,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
