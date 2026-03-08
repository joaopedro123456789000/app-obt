import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/useAuthStore';

export default function ProfileScreen() {
  const { user } = useAuthStore();

  if (!user) {
    return null;
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatarPlaceholder}>
          <Ionicons name="person" size={48} color="#FFF" />
        </View>
        <Text style={styles.name}>{user.name}</Text>
        <Text style={styles.email}>{user.email}</Text>
        <View style={styles.levelBadge}>
          <Ionicons name="star" size={16} color="#F59E0B" />
          <Text style={styles.levelText}>Nível {user.level}</Text>
        </View>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Ionicons name="flame" size={32} color="#10B981" />
          <Text style={styles.statValue}>{user.points}</Text>
          <Text style={styles.statLabel}>Pontos</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="cube" size={32} color="#3B82F6" />
          <Text style={styles.statValue}>{user.total_kg_collected.toFixed(1)}</Text>
          <Text style={styles.statLabel}>kg Reciclados</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="leaf" size={32} color="#84CC16" />
          <Text style={styles.statValue}>{user.total_co2_saved.toFixed(1)}</Text>
          <Text style={styles.statLabel}>kg CO₂ Evitado</Text>
        </View>
      </View>

      <View style={styles.impactSection}>
        <Text style={styles.sectionTitle}>Seu Impacto Ambiental</Text>
        <View style={styles.impactCard}>
          <Ionicons name="earth" size={48} color="#10B981" />
          <Text style={styles.impactText}>
            Você já ajudou a reciclar{' '}
            <Text style={styles.impactHighlight}>
              {user.total_kg_collected.toFixed(1)} kg
            </Text>{' '}
            de materiais e evitou a emissão de{' '}
            <Text style={styles.impactHighlight}>
              {user.total_co2_saved.toFixed(1)} kg de CO₂
            </Text>!
          </Text>
          <Text style={styles.impactEquivalent}>
            Isso é equivalente a plantar{' '}
            {Math.ceil(user.total_co2_saved / 20)} árvores! 🌳
          </Text>
        </View>
      </View>

      <View style={styles.aboutSection}>
        <Text style={styles.sectionTitle}>Sobre o EcoPonto BR</Text>
        <Text style={styles.aboutText}>
          Transformando reciclagem em impacto ambiental. Alinhado aos Objetivos
          de Desenvolvimento Sustentável 11 e 13 da ONU.
        </Text>
        <View style={styles.odsContainer}>
          <View style={styles.odsBadge}>
            <Text style={styles.odsText}>ODS 11</Text>
          </View>
          <View style={styles.odsBadge}>
            <Text style={styles.odsText}>ODS 13</Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>EcoPonto BR v1.0.0</Text>
        <Text style={styles.footerText}>Feito com ❤️ para o Brasil</Text>
        <Text style={styles.demoText}>🎯 Versão Demo - Todas as funcionalidades habilitadas</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#10B981',
    paddingTop: 24,
    paddingBottom: 32,
    alignItems: 'center',
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    marginTop: 16,
  },
  email: {
    fontSize: 14,
    color: '#D1FAE5',
    marginTop: 4,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 12,
  },
  levelText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#065F46',
    marginLeft: 6,
  },
  statsGrid: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
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
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },
  impactSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  impactCard: {
    backgroundColor: '#ECFDF5',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  impactText: {
    fontSize: 16,
    color: '#065F46',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 24,
  },
  impactHighlight: {
    fontWeight: 'bold',
    color: '#10B981',
  },
  impactEquivalent: {
    fontSize: 14,
    color: '#047857',
    textAlign: 'center',
    marginTop: 12,
  },
  aboutSection: {
    padding: 16,
  },
  aboutText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  odsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  odsBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  odsText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 32,
    paddingTop: 16,
  },
  footerText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  demoText: {
    fontSize: 12,
    color: '#10B981',
    marginTop: 12,
    fontWeight: '600',
  },
});
