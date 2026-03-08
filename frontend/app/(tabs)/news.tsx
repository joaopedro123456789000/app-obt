import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { newsApi } from '../../utils/api';
import { NewsArticle } from '../../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const CATEGORIES = [
  { key: 'all', label: 'Todas', color: '#6B7280' },
  { key: 'deforestation', label: 'Desmatamento', color: '#EF4444' },
  { key: 'recycling', label: 'Reciclagem', color: '#10B981' },
  { key: 'climate', label: 'Clima', color: '#3B82F6' },
  { key: 'wildlife', label: 'Fauna', color: '#F59E0B' },
];

const SOURCE_NAMES: Record<string, string> = {
  agencia_brasil: 'Agência Brasil',
  ibama: 'IBAMA',
  mma: 'MMA',
  inpe: 'INPE',
};

export default function NewsScreen() {
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [filteredNews, setFilteredNews] = useState<NewsArticle[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadNews();
  }, []);

  useEffect(() => {
    filterNews();
  }, [selectedCategory, news]);

  const loadNews = async () => {
    try {
      setLoading(true);
      const data = await newsApi.getNews();
      setNews(data);
      setFilteredNews(data);
    } catch (error) {
      console.error('Load news error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await newsApi.refreshNews();
      await loadNews();
    } catch (error) {
      console.error('Refresh error:', error);
      setRefreshing(false);
    }
  };

  const filterNews = () => {
    if (selectedCategory === 'all') {
      setFilteredNews(news);
    } else {
      setFilteredNews(news.filter((n) => n.category === selectedCategory));
    }
  };

  const openArticle = (url: string) => {
    Linking.openURL(url);
  };

  const renderNewsItem = ({ item }: { item: NewsArticle }) => (
    <TouchableOpacity
      style={styles.newsCard}
      onPress={() => openArticle(item.url)}
    >
      <View style={styles.newsHeader}>
        <View
          style={[
            styles.categoryBadge,
            {
              backgroundColor:
                CATEGORIES.find((c) => c.key === item.category)?.color + '20' ||
                '#6B728020',
            },
          ]}
        >
          <Text
            style={[
              styles.categoryText,
              {
                color:
                  CATEGORIES.find((c) => c.key === item.category)?.color ||
                  '#6B7280',
              },
            ]}
          >
            {CATEGORIES.find((c) => c.key === item.category)?.label || 'Geral'}
          </Text>
        </View>
        <Text style={styles.source}>
          {SOURCE_NAMES[item.source] || item.source.toUpperCase()}
        </Text>
      </View>

      <Text style={styles.title} numberOfLines={2}>
        {item.title}
      </Text>
      <Text style={styles.description} numberOfLines={3}>
        {item.description}
      </Text>

      <View style={styles.newsFooter}>
        <Text style={styles.date}>
          {format(new Date(item.published_at), 'dd MMM yyyy', { locale: ptBR })}
        </Text>
        <Ionicons name="arrow-forward" size={20} color="#10B981" />
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
      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={CATEGORIES}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterButton,
                selectedCategory === item.key && {
                  backgroundColor: item.color,
                },
              ]}
              onPress={() => setSelectedCategory(item.key)}
            >
              <Text
                style={[
                  styles.filterText,
                  selectedCategory === item.key && styles.filterTextActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.filterList}
        />
      </View>

      {filteredNews.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="newspaper-outline" size={64} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>Nenhuma notícia encontrada</Text>
          <Text style={styles.emptyText}>
            Puxe para baixo para atualizar as notícias
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredNews}
          renderItem={renderNewsItem}
          keyExtractor={(item) => item.article_id}
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
  filterContainer: {
    backgroundColor: '#FFF',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterList: {
    paddingHorizontal: 16,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: '#F3F4F6',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  filterTextActive: {
    color: '#FFF',
  },
  listContainer: {
    padding: 16,
  },
  newsCard: {
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
  newsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  source: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  newsFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  date: {
    fontSize: 12,
    color: '#9CA3AF',
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
