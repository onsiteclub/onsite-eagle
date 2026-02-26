/**
 * Camera — Take phase photos for a lot
 *
 * Always opened from within a lot (houseId always provided via params).
 * Queries egl_houses, inserts to egl_photos + egl_timeline.
 * Storage bucket: egl-media.
 * Camera overlay stays dark for legibility.
 */

import { CameraView, useCameraPermissions } from 'expo-camera';
import { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import { supabase } from '../src/lib/supabase';

const ACCENT = '#0F766E';

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
  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    if (params.houseId) loadHouse(params.houseId);
  }, [params.houseId]);

  async function loadHouse(id: string) {
    const { data } = await supabase
      .from('egl_houses')
      .select('id, lot_number, site_id')
      .eq('id', id)
      .single();
    if (data) setHouse(data);
  }

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Ionicons name="camera-outline" size={64} color="#D1D5DB" />
        <Text style={styles.permissionText}>
          We need camera permission to take construction photos
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Allow Camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  async function takePhoto() {
    if (!cameraRef.current || isCapturing || !house) return;

    setIsCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });

      if (photo) {
        Alert.alert(
          'Photo Captured',
          `Lot: ${house.lot_number}\nPhase: ${selectedPhase}`,
          [
            { text: 'Retake', style: 'cancel' },
            {
              text: 'Upload',
              onPress: () => uploadPhoto(photo.uri, house.id),
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error capturing photo:', error);
      Alert.alert('Error', 'Failed to capture photo');
    } finally {
      setIsCapturing(false);
    }
  }

  async function uploadPhoto(uri: string, houseId: string) {
    setIsUploading(true);
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const timestamp = Date.now();
      const filename = `${houseId}/${selectedPhase}/${timestamp}.jpg`;

      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const { error: uploadError } = await supabase.storage
        .from('egl-media')
        .upload(filename, bytes, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('egl-media')
        .getPublicUrl(filename);

      const photoUrl = urlData.publicUrl;

      // Create egl_photos record
      const { error: photoError } = await supabase
        .from('egl_photos')
        .insert({
          house_id: houseId,
          phase_id: selectedPhase.toString(),
          photo_url: photoUrl,
          ai_validation_status: 'pending',
        });

      if (photoError) {
        console.error('Error saving photo record:', photoError);
      }

      // Create timeline event
      await supabase
        .from('egl_timeline')
        .insert({
          house_id: houseId,
          event_type: 'photo',
          title: `Phase ${selectedPhase} Photo`,
          description: `Photo uploaded for phase ${selectedPhase}`,
          source: 'field',
        });

      Alert.alert(
        'Success!',
        'Photo uploaded for AI validation.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Error', 'Failed to upload photo. Try again.');
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <View style={styles.container}>
      {isUploading ? (
        <View style={styles.uploadingContainer}>
          <ActivityIndicator size="large" color={ACCENT} />
          <Text style={styles.uploadingText}>Uploading photo...</Text>
        </View>
      ) : (
        <CameraView style={styles.camera} ref={cameraRef}>
          <View style={styles.overlay}>
            {/* Top — Lot info + Phase selector */}
            <View style={styles.topSection}>
              {house && (
                <View style={styles.lotInfo}>
                  <Ionicons name="home" size={16} color={ACCENT} />
                  <Text style={styles.lotInfoText}>Lot {house.lot_number}</Text>
                </View>
              )}

              <View style={styles.selector}>
                <Text style={styles.selectorLabel}>Phase:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.selectorButtons}>
                    {Array.from({ length: 7 }, (_, i) => i + 1).map((phase) => (
                      <TouchableOpacity
                        key={phase}
                        style={[
                          styles.selectorButton,
                          selectedPhase === phase && styles.selectorButtonActive,
                        ]}
                        onPress={() => setSelectedPhase(phase)}
                      >
                        <Text
                          style={[
                            styles.selectorButtonText,
                            selectedPhase === phase && styles.selectorButtonTextActive,
                          ]}
                        >
                          Phase {phase}
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
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.captureButton, !house && styles.captureButtonDisabled]}
                onPress={takePhoto}
                disabled={isCapturing || !house}
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
    backgroundColor: '#F6F7F9',
    padding: 20,
  },
  permissionText: {
    color: '#101828',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 20,
    lineHeight: 22,
  },
  permissionButton: {
    backgroundColor: ACCENT,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
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
    paddingTop: 50,
    paddingBottom: 12,
  },
  lotInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 10,
    gap: 8,
  },
  lotInfoText: {
    color: ACCENT,
    fontSize: 16,
    fontWeight: '600',
  },
  selector: {
    paddingHorizontal: 16,
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
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  selectorButtonActive: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
  },
  selectorButtonText: {
    color: '#fff',
    fontSize: 12,
  },
  selectorButtonTextActive: {
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
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: `${ACCENT}50`,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: ACCENT,
  },
  captureButtonDisabled: {
    opacity: 0.4,
  },
  captureButtonInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: ACCENT,
  },
  placeholder: {
    width: 48,
  },
  uploadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F6F7F9',
  },
  uploadingText: {
    color: '#101828',
    fontSize: 16,
    marginTop: 16,
  },
});
