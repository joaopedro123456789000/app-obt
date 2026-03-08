import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

export default function LoginScreen() {
  const router = useRouter();

  const handleGoogleLogin = async () => {
    try {
      const authUrl = `${BACKEND_URL}/api/auth/google-login`;
      
      if (Platform.OS === 'web') {
        // On web, navigate directly
        window.location.href = authUrl;
      } else {
        // On mobile, open in browser
        await Linking.openURL(authUrl);
      }
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Ionicons name="leaf" size={64} color="#10B981" />
        </View>
        <Text style={styles.title}>EcoPonto BR</Text>
        <Text style={styles.subtitle}>
          Transforme reciclagem em impacto ambiental
        </Text>
      </View>

      <View style={styles.features}>
        <View style={styles.feature}>
          <Ionicons name="map" size={24} color="#10B981" />
          <Text style={styles.featureText}>Encontre pontos de coleta</Text>
        </View>
        <View style={styles.feature}>
          <Ionicons name="camera" size={24} color="#10B981" />
          <Text style={styles.featureText}>IA classifica seu lixo</Text>
        </View>
        <View style={styles.feature}>
          <Ionicons name="trophy" size={24} color="#10B981" />
          <Text style={styles.featureText}>Ganhe pontos e badges</Text>
        </View>
        <View style={styles.feature}>
          <Ionicons name="newspaper" size={24} color="#10B981" />
          <Text style={styles.featureText}>Notícias ambientais reais</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.button} onPress={handleGoogleLogin}>
        <Ionicons name="logo-google" size={24} color="#FFF" />
        <Text style={styles.buttonText}>Entrar com Google</Text>
      </TouchableOpacity>

      <Text style={styles.footer}>
        Alinhado aos ODS 11 e 13 da ONU
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
      },
    }),
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#065F46',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#047857',
    textAlign: 'center',
  },
  features: {
    marginBottom: 48,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
      },
    }),
  },
  featureText: {
    fontSize: 16,
    color: '#065F46',
    marginLeft: 16,
    fontWeight: '500',
  },
  button: {
    flexDirection: 'row',
    backgroundColor: '#10B981',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0 4px 12px rgba(16,185,129,0.3)',
        cursor: 'pointer',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 5,
      },
    }),
  },
  buttonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  footer: {
    textAlign: 'center',
    marginTop: 24,
    color: '#047857',
    fontSize: 12,
  },
});
