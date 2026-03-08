import axios from 'axios';
import Constants from 'expo-constants';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

export const api = axios.create({
  baseURL: `${BACKEND_URL}/api`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const authApi = {
  checkAuth: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },
};

export const collectionPointsApi = {
  getPoints: async (params?: { latitude?: number; longitude?: number; waste_type?: string; city?: string }) => {
    const response = await api.get('/collection-points', { params });
    return response.data;
  },
};

export const deliveriesApi = {
  createDelivery: async (data: { photo_base64: string; point_id: string; weight_kg: number }) => {
    const response = await api.post('/deliveries', data);
    return response.data;
  },
  getDeliveries: async (limit: number = 50) => {
    const response = await api.get('/deliveries', { params: { limit } });
    return response.data;
  },
  getDeliveryDetail: async (delivery_id: string) => {
    const response = await api.get(`/deliveries/${delivery_id}`);
    return response.data;
  },
};

export const newsApi = {
  getNews: async (params?: { category?: string; state?: string; limit?: number }) => {
    const response = await api.get('/news', { params });
    return response.data;
  },
  refreshNews: async () => {
    const response = await api.post('/news/refresh');
    return response.data;
  },
};

export const rankingsApi = {
  getGlobalRanking: async (limit: number = 100) => {
    const response = await api.get('/rankings/global', { params: { limit } });
    return response.data;
  },
  getCityRanking: async (city: string, limit: number = 50) => {
    const response = await api.get(`/rankings/city/${city}`, { params: { limit } });
    return response.data;
  },
};

export const challengesApi = {
  getChallenges: async () => {
    const response = await api.get('/challenges');
    return response.data;
  },
};
