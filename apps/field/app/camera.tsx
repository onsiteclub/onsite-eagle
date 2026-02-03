import { CameraView, useCameraPermissions } from 'expo-camera';
import { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as FileSystem from 'expo-file-system';
import { CONSTRUCTION_PHASES } from '@onsite/shared';
import { supabase } from '../src/lib/supabase';

interface House {
  id: string;
  lot_number: string;
  site_id: string;
}

export default function CameraScreen() {
  const params = useLocalSearchParams<{ houseId?: string; phaseId?: string }>();
  const [permission, requestPermission] = useCameraPermissions();
  const [selectedPhase, setSelectedPhase] = useState(
    params.phaseId ? parseInt(params.phaseId) : 1
  );
  const [isCapturing, setIsCapturing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [house, setHouse] = useState<House | null>(null);
  const [houses, setHouses] = useState<House[]>([]);
  const [selectedHouseId, setSelectedHouseId] = useState<string | null>(params.houseId || null);
  const cameraRef = useRef<CameraView>(null);

  // Load houses if no houseId provided
  useEffect(() => {
    if (params.houseId) {
      loadHouse(params.houseId);
    } else {
      loadAllHouses();
    }
  }, [params.houseId]);

  async function loadHouse(id: string) {
    const { data } = await supabase
      .from('houses')
      .select('id, lot_number, site_id')
      .eq('id', id)
      .single();
    if (data) setHouse(data);
  }

  async function loadAllHouses() {
    const { data } = await supabase
      .from('houses')
      .select('id, lot_number, site_id')
      .order('lot_number')
      .limit(50);
    if (data) setHouses(data);
  }

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>
          Precisamos de permissao da camera para tirar fotos da obra
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Permitir Camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  async function takePhoto() {
    if (!cameraRef.current || isCapturing) return;

    const targetHouseId = selectedHouseId || house?.id;
    if (!targetHouseId) {
      Alert.alert('Selecione um Lote', 'Escolha o lote antes de tirar a foto.');
      return;
    }

    setIsCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });

      if (photo) {
        const lotNumber = house?.lot_number || houses.find(h => h.id === targetHouseId)?.lot_number;
        Alert.alert(
          'Foto Capturada',
          `Lote: ${lotNumber}\nFase: ${CONSTRUCTION_PHASES[selectedPhase - 1]?.name}`,
          [
            { text: 'Tirar Outra', style: 'cancel' },
            {
              text: 'Enviar',
              onPress: () => uploadPhoto(photo.uri, targetHouseId),
            },
          ]
        );
      }
    } catch (error) {
      console.error('Erro ao capturar foto:', error);
      Alert.alert('Erro', 'Falha ao capturar foto');
    } finally {
      setIsCapturing(false);
    }
  }

  async function uploadPhoto(uri: string, houseId: string) {
    setIsUploading(true);
    try {
      // Read file as base64
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Generate unique filename
      const timestamp = Date.now();
      const filename = `${houseId}/${selectedPhase}/${timestamp}.jpg`;

      // Decode base64 to Uint8Array
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('phase-photos')
        .upload(filename, bytes, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('phase-photos')
        .getPublicUrl(filename);

      const photoUrl = urlData.publicUrl;

      // Create phase_photos record
      const { error: photoError } = await supabase
        .from('phase_photos')
        .insert({
          house_id: houseId,
          phase_id: selectedPhase.toString(),
          photo_url: photoUrl,
          ai_validation_status: 'pending',
        });

      if (photoError) {
        console.error('Erro ao salvar registro da foto:', photoError);
      }

      // Create timeline event
      await supabase
        .from('timeline_events')
        .insert({
          house_id: houseId,
          event_type: 'photo',
          title: `Foto da Fase ${selectedPhase}`,
          description: `Foto enviada para ${CONSTRUCTION_PHASES[selectedPhase - 1]?.name}`,
          source: 'worker_app',
        });

      Alert.alert(
        'Sucesso!',
        'Foto enviada para validacao por IA.',
        [
          { text: 'OK', onPress: () => router.back() },
        ]
      );

    } catch (error) {
      console.error('Erro no upload:', error);
      Alert.alert('Erro', 'Falha ao enviar foto. Tente novamente.');
    } finally {
      setIsUploading(false);
    }
  }

  const targetHouse = house || houses.find(h => h.id === selectedHouseId);

  return (
    <View style={styles.container}>
      {isUploading ? (
        <View style={styles.uploadingContainer}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={styles.uploadingText}>Enviando foto...</Text>
        </View>
      ) : (
        <CameraView style={styles.camera} ref={cameraRef}>
          <View style={styles.overlay}>
            {/* Top section - House & Phase selection */}
            <View style={styles.topSection}>
              {/* House selector (if not pre-selected) */}
              {!params.houseId && houses.length > 0 && (
                <View style={styles.selector}>
                  <Text style={styles.selectorLabel}>Lote:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.selectorButtons}>
                      {houses.slice(0, 10).map((h) => (
                        <TouchableOpacity
                          key={h.id}
                          style={[
                            styles.selectorButton,
                            selectedHouseId === h.id && styles.selectorButtonActive,
                          ]}
                          onPress={() => setSelectedHouseId(h.id)}
                        >
                          <Text
                            style={[
                              styles.selectorButtonText,
                              selectedHouseId === h.id && styles.selectorButtonTextActive,
                            ]}
                          >
                            {h.lot_number}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              )}

              {/* Show selected house if pre-selected */}
              {house && (
                <View style={styles.selectedHouse}>
                  <Text style={styles.selectedHouseText}>Lote {house.lot_number}</Text>
                </View>
              )}

              {/* Phase selector */}
              <View style={styles.selector}>
                <Text style={styles.selectorLabel}>Fase:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.selectorButtons}>
                    {CONSTRUCTION_PHASES.map((phase) => (
                      <TouchableOpacity
                        key={phase.id}
                        style={[
                          styles.selectorButton,
                          selectedPhase === phase.id && styles.selectorButtonActive,
                        ]}
                        onPress={() => setSelectedPhase(phase.id)}
                      >
                        <Text
                          style={[
                            styles.selectorButtonText,
                            selectedPhase === phase.id && styles.selectorButtonTextActive,
                          ]}
                          numberOfLines={1}
                        >
                          {phase.id}. {phase.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            </View>

            {/* Bottom controls */}
            <View style={styles.controls}>
              <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
                <Text style={styles.closeButtonText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.captureButton,
                  (!targetHouse) && styles.captureButtonDisabled,
                ]}
                onPress={takePhoto}
                disabled={isCapturing || !targetHouse}
              >
                {isCapturing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <View style={styles.captureButtonInner} />
                )}
              </TouchableOpacity>

              <View style={styles.placeholder} />
            </View>
          </View>
        </CameraView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111827',
    padding: 20,
  },
  permissionText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  permissionButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topSection: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingTop: 8,
    paddingBottom: 12,
  },
  selector: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  selectorLabel: {
    color: '#9CA3AF',
    fontSize: 12,
    marginBottom: 6,
  },
  selectorButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  selectorButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  selectorButtonActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  selectorButtonText: {
    color: '#fff',
    fontSize: 12,
  },
  selectorButtonTextActive: {
    fontWeight: '600',
  },
  selectedHouse: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  selectedHouseText: {
    color: '#10B981',
    fontSize: 16,
    fontWeight: '600',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 40,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingTop: 20,
  },
  closeButton: {
    padding: 10,
    width: 80,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(16, 185, 129, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#10B981',
  },
  captureButtonDisabled: {
    opacity: 0.4,
  },
  captureButtonInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#10B981',
  },
  placeholder: {
    width: 80,
  },
  uploadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111827',
  },
  uploadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 16,
  },
});
