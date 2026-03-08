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
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Pontos de Coleta</Text>
          <Text style={styles.headerSubtitle}>
            {filteredPoints.length} ponto{filteredPoints.length !== 1 ? 's' : ''} próximo{filteredPoints.length !== 1 ? 's' : ''}
          </Text>
        </View>

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

        <View style={styles.pointsList}>
          {filteredPoints.map((point) => (
            <View key={point.point_id} style={styles.pointCard}>
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
                <Text style={styles.pointName}>{point.name}</Text>
                <Text style={styles.pointAddress}>{point.address}</Text>
                <Text style={styles.pointCity}>
                  {point.city}, {point.state}
                </Text>
                {point.hours && (
                  <Text style={styles.pointHours}>
                    <Ionicons name="time" size={12} /> {point.hours}
                  </Text>
                )}
                <View style={styles.pointTypes}>
                  {point.types_accepted.slice(0, 4).map((type) => (
                    <View key={type} style={styles.typeTag}>
                      <Text style={styles.typeTagText}>{type}</Text>
                    </View>
                  ))}
                  {point.types_accepted.length > 4 && (
                    <View style={styles.typeTag}>
                      <Text style={styles.typeTagText}>
                        +{point.types_accepted.length - 4}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {point.is_school && (
                <View style={styles.schoolBadge}>
                  <Ionicons name="school" size={16} color="#F59E0B" />
                </View>
              )}
            </View>
          ))}
        </View>

        {Platform.OS === 'web' && (
          <View style={styles.webNotice}>
            <Ionicons name="information-circle" size={24} color="#3B82F6" />
            <Text style={styles.webNoticeText}>
              O mapa interativo está disponível no app mobile. Use o Expo Go para a experiência completa!
            </Text>
          </View>
        )}
      </ScrollView>

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
    backgroundColor: '#F9FAFB',
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
    backgroundColor: '#10B981',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#D1FAE5',
  },
  filterContainer: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
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
  pointsList: {
    padding: 16,
  },
  pointCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
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
    color: '#111827',
    marginBottom: 4,
  },
  pointAddress: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  pointCity: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  pointHours: {
    fontSize: 12,
    color: '#10B981',
    marginBottom: 8,
  },
  pointTypes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  typeTag: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeTagText: {
    fontSize: 10,
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  schoolBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  webNotice: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  webNoticeText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#1E40AF',
    lineHeight: 20,
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
