import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { deliveriesApi, collectionPointsApi } from '../utils/api';
import { CollectionPoint } from '../types';
import { useAuthStore } from '../store/useAuthStore';

export default function DeliverScreen() {
  const router = useRouter();
  const { user, setUser } = useAuthStore();
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraActive, setCameraActive] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [classifying, setClassifying] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [wasteType, setWasteType] = useState<string>('');
  const [weight, setWeight] = useState('1.0');
  const [selectedPoint, setSelectedPoint] = useState<CollectionPoint | null>(null);
  const [points, setPoints] = useState<CollectionPoint[]>([]);
  const [showPointSelector, setShowPointSelector] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    loadPoints();
  }, []);

  const loadPoints = async () => {
    try {
      const data = await collectionPointsApi.getPoints();
      setPoints(data);
      if (data.length > 0) {
        setSelectedPoint(data[0]);
      }
    } catch (error) {
      console.error('Load points error:', error);
    }
  };

  const handleOpenCamera = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert('Permissão negada', 'É necessário permitir o acesso à câmera');
        return;
      }
    }
    setCameraActive(true);
  };

  const takePicture = async () => {
    if (!cameraRef.current) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        base64: true,
      });

      if (photo && photo.base64) {
        setPhoto(photo.uri);
        setPhotoBase64(photo.base64);
        setCameraActive(false);
      }
    } catch (error) {
      console.error('Take picture error:', error);
      Alert.alert('Erro', 'Não foi possível tirar a foto');
    }
  };

  const handleSubmit = async () => {
    if (!photoBase64) {
      Alert.alert('Erro', 'Tire uma foto do material reciclável');
      return;
    }

    if (!selectedPoint) {
      Alert.alert('Erro', 'Selecione um ponto de coleta');
      return;
    }

    const weightNum = parseFloat(weight);
    if (isNaN(weightNum) || weightNum <= 0) {
      Alert.alert('Erro', 'Digite um peso válido');
      return;
    }

    try {
      setSubmitting(true);

      const response = await deliveriesApi.createDelivery({
        photo_base64: photoBase64,
        point_id: selectedPoint.point_id,
        weight_kg: weightNum,
      });

      // Update user stats in store
      if (response.user_stats && user) {
        setUser({
          ...user,
          points: response.user_stats.points,
          level: response.user_stats.level,
          total_kg_collected: response.user_stats.total_kg,
          total_co2_saved: response.user_stats.total_co2_saved,
        });
      }

      Alert.alert(
        'Sucesso! 🎉',
        `Entrega registrada!\n\n` +
          `Tipo: ${response.delivery.waste_type.toUpperCase()}\n` +
          `Pontos ganhos: +${response.delivery.points_earned}\n` +
          `CO₂ economizado: ${response.delivery.co2_saved_kg.toFixed(1)} kg`,
        [
          {
            text: 'Ver Entregas',
            onPress: () => router.push('/(tabs)/deliveries'),
          },
          {
            text: 'Nova Entrega',
            onPress: resetForm,
          },
        ]
      );
    } catch (error: any) {
      console.error('Submit delivery error:', error);
      Alert.alert(
        'Erro',
        error.response?.data?.detail || 'Não foi possível registrar a entrega'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setPhoto(null);
    setPhotoBase64(null);
    setWasteType('');
    setWeight('1.0');
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  if (cameraActive) {
    return (
      <View style={styles.container}>
        <CameraView ref={cameraRef} style={styles.camera} facing="back">
          <View style={styles.cameraOverlay}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setCameraActive(false)}
            >
              <Ionicons name="close" size={32} color="#FFF" />
            </TouchableOpacity>

            <View style={styles.cameraActions}>
              <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
                <View style={styles.captureButtonInner} />
              </TouchableOpacity>
            </View>
          </View>
        </CameraView>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Registrar Entrega</Text>
          <View style={{ width: 24 }} />
        </View>

        {photo ? (
          <View style={styles.photoContainer}>
            <Image source={{ uri: photo }} style={styles.photo} />
            <TouchableOpacity
              style={styles.retakeButton}
              onPress={() => {
                setPhoto(null);
                setPhotoBase64(null);
              }}
            >
              <Ionicons name="camera" size={20} color="#FFF" />
              <Text style={styles.retakeText}>Tirar Novamente</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.cameraButton} onPress={handleOpenCamera}>
            <Ionicons name="camera" size={64} color="#10B981" />
            <Text style={styles.cameraButtonText}>Tirar Foto do Material</Text>
            <Text style={styles.cameraButtonSubtext}>
              Nossa IA vai classificar automaticamente
            </Text>
          </TouchableOpacity>
        )}

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              <Ionicons name="scale" size={16} /> Peso (kg)
            </Text>
            <TextInput
              style={styles.input}
              value={weight}
              onChangeText={setWeight}
              keyboardType="decimal-pad"
              placeholder="1.0"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              <Ionicons name="location" size={16} /> Ponto de Coleta
            </Text>
            {selectedPoint ? (
              <TouchableOpacity
                style={styles.pointSelector}
                onPress={() => setShowPointSelector(!showPointSelector)}
              >
                <View style={styles.pointInfo}>
                  <Text style={styles.pointName}>{selectedPoint.name}</Text>
                  <Text style={styles.pointAddress}>{selectedPoint.address}</Text>
                </View>
                <Ionicons name="chevron-down" size={24} color="#6B7280" />
              </TouchableOpacity>
            ) : (
              <Text style={styles.noPoints}>Carregando pontos...</Text>
            )}

            {showPointSelector && (
              <View style={styles.pointsList}>
                {points.map((point) => (
                  <TouchableOpacity
                    key={point.point_id}
                    style={styles.pointItem}
                    onPress={() => {
                      setSelectedPoint(point);
                      setShowPointSelector(false);
                    }}
                  >
                    <Text style={styles.pointItemName}>{point.name}</Text>
                    <Text style={styles.pointItemAddress}>{point.address}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={24} color="#10B981" />
            <View style={styles.infoText}>
              <Text style={styles.infoTitle}>Como funciona?</Text>
              <Text style={styles.infoDescription}>
                1. Tire uma foto do material reciclável{'\n'}
                2. Nossa IA classifica o tipo automaticamente{'\n'}
                3. Confirme o peso e o ponto de coleta{'\n'}
                4. Ganhe pontos e ajude o meio ambiente!
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitButton, (!photo || submitting) && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={!photo || submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={24} color="#FFF" />
              <Text style={styles.submitButtonText}>Registrar Entrega</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'space-between',
  },
  closeButton: {
    alignSelf: 'flex-start',
    margin: 24,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 24,
    padding: 12,
  },
  cameraActions: {
    alignItems: 'center',
    marginBottom: 48,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#10B981',
  },
  captureButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#10B981',
  },
  photoContainer: {
    margin: 16,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  photo: {
    width: '100%',
    height: 300,
    resizeMode: 'cover',
  },
  retakeButton: {
    flexDirection: 'row',
    backgroundColor: '#10B981',
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retakeText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  cameraButton: {
    margin: 16,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 48,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#10B981',
    borderStyle: 'dashed',
  },
  cameraButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#065F46',
    marginTop: 16,
  },
  cameraButtonSubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
  form: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  pointSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  pointInfo: {
    flex: 1,
  },
  pointName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  pointAddress: {
    fontSize: 14,
    color: '#6B7280',
  },
  noPoints: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  pointsList: {
    marginTop: 8,
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  pointItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  pointItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  pointItemAddress: {
    fontSize: 14,
    color: '#6B7280',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#065F46',
    marginBottom: 8,
  },
  infoDescription: {
    fontSize: 14,
    color: '#047857',
    lineHeight: 20,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  submitButton: {
    flexDirection: 'row',
    backgroundColor: '#10B981',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});
