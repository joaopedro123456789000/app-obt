import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { rankingsApi } from '../../utils/api';
import { RankingEntry } from '../../types';
import { useAuthStore } from '../../store/useAuthStore';

const TABS = [
  { key: 'global', label: 'Global' },
  { key: 'city', label: 'Minha Cidade' },
];

export default function RankingScreen() {
  const { user } = useAuthStore();
  const [selectedTab, setSelectedTab] = useState('global');
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRanking();
  }, [selectedTab]);

  const loadRanking = async () => {
    try {
      setLoading(true);
      let data;
      if (selectedTab === 'global') {
        data = await rankingsApi.getGlobalRanking();
      } else {
        data = await rankingsApi.getCityRanking(user?.city || 'São Paulo');
      }
      setRanking(data);
    } catch (error) {
      console.error('Load ranking error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMedalIcon = (rank: number) => {
    if (rank === 1) return { icon: 'trophy', color: '#F59E0B' };
    if (rank === 2) return { icon: 'medal', color: '#9CA3AF' };
    if (rank === 3) return { icon: 'medal', color: '#CD7F32' };
    return null;
  };

  const renderRankingItem = ({ item }: { item: RankingEntry }) => {
    const medal = getMedalIcon(item.rank);
    const isCurrentUser = item.user_id === user?.user_id;

    return (
      <View
        style={[
          styles.rankingCard,
          isCurrentUser && styles.currentUserCard,
        ]}
      >
        <View style={styles.rankColumn}>
          {medal ? (
            <Ionicons name={medal.icon as any} size={24} color={medal.color} />
          ) : (
            <Text style={styles.rankNumber}>{item.rank}</Text>
          )}
        </View>

        <View style={styles.userInfo}>
          {item.user_picture ? (
            <Image
              source={{ uri: item.user_picture }}
              style={styles.avatar}
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={24} color="#9CA3AF" />
            </View>
          )}
          <View style={styles.userDetails}>
            <Text style={styles.userName} numberOfLines={1}>
              {item.user_name}
              {isCurrentUser && ' (Você)'}
            </Text>
            <Text style={styles.userStats}>
              Nível {item.level} • {item.total_kg.toFixed(1)} kg
            </Text>
          </View>
        </View>

        <View style={styles.pointsContainer}>
          <Text style={styles.points}>{item.points}</Text>
          <Text style={styles.pointsLabel}>pontos</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabsContainer}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tab,
              selectedTab === tab.key && styles.activeTab,
            ]}
            onPress={() => setSelectedTab(tab.key)}
          >
            <Text
              style={[
                styles.tabText,
                selectedTab === tab.key && styles.activeTabText,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#10B981" />
        </View>
      ) : ranking.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="trophy-outline" size={64} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>Nenhum ranking ainda</Text>
          <Text style={styles.emptyText}>
            Seja o primeiro a fazer entregas!
          </Text>
        </View>
      ) : (
        <FlatList
          data={ranking}
          renderItem={renderRankingItem}
          keyExtractor={(item) => item.user_id}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: '#10B981',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#10B981',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 16,
  },
  rankingCard: {
    flexDirection: 'row',
    alignItems: 'center',
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
  currentUserCard: {
    backgroundColor: '#ECFDF5',
    borderWidth: 2,
    borderColor: '#10B981',
  },
  rankColumn: {
    width: 40,
    alignItems: 'center',
  },
  rankNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6B7280',
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userDetails: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  userStats: {
    fontSize: 12,
    color: '#6B7280',
  },
  pointsContainer: {
    alignItems: 'flex-end',
  },
  points: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#10B981',
  },
  pointsLabel: {
    fontSize: 12,
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
  },
});
