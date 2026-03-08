import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
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

export default function DeliveriesScreen() {
  const router = useRouter();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDeliveries();
  }, []);

  const loadDeliveries = async () => {
    try {
      setLoading(true);
      const data = await deliveriesApi.getDeliveries();
      setDeliveries(data);
    } catch (error) {
      console.error('Load deliveries error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDeliveries();
  };

  const renderDelivery = ({ item }: { item: Delivery }) => (
    <TouchableOpacity
      style={styles.deliveryCard}
      onPress={() => router.push(`/delivery-detail?id=${item.delivery_id}`)}
    >
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
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {deliveries.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="cube-outline" size={64} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>Nenhuma entrega ainda</Text>
          <Text style={styles.emptyText}>
            Faça sua primeira entrega e comece a ganhar pontos!
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push('/deliver')}
          >
            <Ionicons name="camera" size={20} color="#FFF" />
            <Text style={styles.buttonText}>Registrar Entrega</Text>
          </TouchableOpacity>
        </View>
      ) : (
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
      )}

      {deliveries.length > 0 && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push('/deliver')}
        >
          <Ionicons name="add" size={32} color="#FFF" />
        </TouchableOpacity>
      )}
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
  listContainer: {
    padding: 16,
  },
  deliveryCard: {
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  primaryButton: {
    flexDirection: 'row',
    backgroundColor: '#10B981',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
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
