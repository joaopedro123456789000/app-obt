import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '../store/useAuthStore';
import { authApi } from '../utils/api';

export default function AuthCallback() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { setUser } = useAuthStore();
  const [error, setError] = useState('');

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    try {
      // Wait a bit for cookies to be set
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check if authenticated
      const user = await authApi.checkAuth();
      setUser(user);
      
      // Navigate to app
      router.replace('/(tabs)');
    } catch (err: any) {
      console.error('Auth callback error:', err);
      setError('Erro ao fazer login. Tente novamente.');
      
      // Redirect to login after error
      setTimeout(() => {
        router.replace('/login');
      }, 2000);
    }
  };

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#10B981" />
      <Text style={styles.text}>
        {error || 'Autenticando...'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    color: '#065F46',
  },
});
