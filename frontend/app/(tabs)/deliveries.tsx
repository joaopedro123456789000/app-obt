import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { deliveriesApi } from '../../utils/api';
import { Delivery } from '../../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useRouter } from 'expo-router';

const WASTE_ICONS = {
  plastic: 'water',
  paper: 'document',
  glass: 'wine',
  metal: 'hardware-chip',
  electronic: 'phone-portrait',
  organic: 'leaf',
};

const WASTE_COLORS = {
  plastic: '#3B82F6',
  paper: '#F59E0B',
  glass: '#10B981',
  metal: '#6B7280',
  electronic: '#8B5CF6',
  organic: '#84CC16',
};

// Mock deliveries for demo
const MOCK_DELIVERIES: Delivery[] = [
  {
    delivery_id: 'del_1',
    user_id: 'demo_user_123',
    point_id: 'point_1',
    waste_type: 'plastic',
    weight_kg: 2.5,
    points_earned: 25,
    co2_saved_kg: 3.75,
    confidence: 0.92,
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    delivery_id: 'del_2',
    user_id: 'demo_user_123',
    point_id: 'point_2',
    waste_type: 'paper',
    weight_kg: 5.0,
    points_earned: 40,
    co2_saved_kg: 4.0,
    confidence: 0.88,
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    delivery_id: 'del_3',
    user_id: 'demo_user_123',
    point_id: 'point_1',
    waste_type: 'glass',
    weight_kg: 3.0,
    points_earned: 36,
    co2_saved_kg: 0.9,
    confidence: 0.95,
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export default function DeliveriesScreen() {
  const router = useRouter();
  const [deliveries, setDeliveries] = useState<Delivery[]>(MOCK_DELIVERIES);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  const renderDelivery = ({ item }: { item: Delivery }) => (
    <View style={styles.deliveryCard}>
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: WASTE_COLORS[item.waste_type as keyof typeof WASTE_COLORS] + '20' },
        ]}
      >
        <Ionicons
          name={WASTE_ICONS[item.waste_type as keyof typeof WASTE_ICONS] as any}
          size={32}
          color={WASTE_COLORS[item.waste_type as keyof typeof WASTE_COLORS]}
        />
      </View>

      <View style={styles.deliveryInfo}>
        <Text style={styles.wasteType}>{item.waste_type.toUpperCase()}</Text>
        <Text style={styles.weight}>{item.weight_kg} kg</Text>
        <Text style={styles.date}>
          {format(new Date(item.created_at), "dd MMM yyyy 'às' HH:mm", { locale: ptBR })}
        </Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>+{item.points_earned}</Text>
          <Text style={styles.statLabel}>pts</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{item.co2_saved_kg.toFixed(1)}</Text>
          <Text style={styles.statLabel}>kg CO₂</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={deliveries}
        renderItem={renderDelivery}
        keyExtractor={(item) => item.delivery_id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#10B981"
          />
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/deliver')}
      >
        <Ionicons name="add" size={32} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  listContainer: {
    padding: 16,
  },
  deliveryCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
      },
    }),
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deliveryInfo: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  wasteType: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  weight: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  date: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  statsContainer: {
    justifyContent: 'center',
  },
  stat: {
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#10B981',
  },
  statLabel: {
    fontSize: 10,
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
    ...Platform.select({
      web: {
        boxShadow: '0 4px 12px rgba(16,185,129,0.4)',
        cursor: 'pointer',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
      },
    }),
  },
});
