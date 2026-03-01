/**
 * Camera screen — fullscreen modal for taking site photos.
 *
 * Uses expo-camera for preview and expo-image-picker as fallback.
 * Uploads to frm-media bucket via Supabase Storage.
 */

import { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { useAuth } from '@onsite/auth';
import { sendMessage } from '@onsite/timeline';
import { supabase } from '../../src/lib/supabase';

const ACCENT = '#0F766E';

export default function CameraScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { houseId, siteId, currentPhase } = useLocalSearchParams<{
    houseId?: string;
    siteId?: string;
    currentPhase?: string;
  }>();

  const [permission, requestPermission] = useCameraPermissions();
  const [uploading, setUploading] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  async function handleTakePhoto() {
    if (!cameraRef.current) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
      });

      if (photo?.uri) {
        await uploadPhoto(photo.uri);
      }
    } catch (err) {
      console.error('[camera] Take photo error:', err);
      Alert.alert('Error', 'Failed to take photo');
    }
  }

  async function handlePickImage() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]?.uri) {
        await uploadPhoto(result.assets[0].uri);
      }
    } catch (err) {
      console.error('[camera] Pick image error:', err);
      Alert.alert('Error', 'Failed to pick image');
    }
  }

  async function uploadPhoto(uri: string) {
    if (!houseId) {
      Alert.alert('Error', 'No lot selected for this photo');
      return;
    }

    setUploading(true);
    try {
      const filename = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;
      const storagePath = siteId
        ? `${siteId}/${houseId}/${filename}`
        : `${houseId}/${filename}`;

      // Read file as base64
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('frm-media')
        .upload(storagePath, decode(base64), {
          contentType: 'image/jpeg',
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('frm-media')
        .getPublicUrl(storagePath);

      // Insert into frm_photos
      const { error: insertError } = await supabase.from('frm_photos').insert({
        lot_id: houseId,
        uploaded_by: user?.id || null,
        photo_url: urlData.publicUrl,
        ai_validation_status: 'pending',
      });

      if (insertError) throw insertError;

      // Post photo to lot timeline
      if (siteId) {
        await sendMessage(supabase as never, {
          site_id: siteId,
          house_id: houseId,
          sender_type: 'supervisor',
          sender_id: user?.id,
          sender_name: user?.email || 'Inspector',
          content: 'Photo uploaded',
          attachments: [{ type: 'photo', url: urlData.publicUrl }],
          phase_at_creation: Number(currentPhase) || 1,
          source_app: 'inspect',
        }).catch((err: unknown) => {
          console.warn('[camera] Timeline post failed (non-fatal):', err);
        });
      }

      Alert.alert('Success', 'Photo uploaded successfully', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      console.error('[camera] Upload error:', err);
      Alert.alert('Upload Failed', err?.message || 'Try again');
    } finally {
      setUploading(false);
    }
  }

  // Permission not yet determined
  if (!permission) {
    return <View style={styles.container} />;
  }

  // Permission denied
  if (!permission.granted) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <Text style={styles.permissionTitle}>Camera Permission Required</Text>
        <Text style={styles.permissionText}>
          We need camera access to take site inspection photos.
        </Text>
        <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
          <Text style={styles.permissionBtnText}>Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="back"
      >
        {/* Top bar */}
        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
          {houseId && (
            <View style={styles.lotIndicator}>
              <Text style={styles.lotIndicatorText}>Lot Photo</Text>
            </View>
          )}
        </View>

        {/* Bottom controls */}
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
          {uploading ? (
            <ActivityIndicator size="large" color="#FFFFFF" />
          ) : (
            <>
              <TouchableOpacity style={styles.galleryBtn} onPress={handlePickImage}>
                <Text style={styles.galleryBtnText}>Gallery</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.shutterBtn} onPress={handleTakePhoto}>
                <View style={styles.shutterInner} />
              </TouchableOpacity>

              <View style={{ width: 60 }} />
            </>
          )}
        </View>
      </CameraView>
    </View>
  );
}

/** Decode base64 string to Uint8Array for Supabase upload */
function decode(base64: string): Uint8Array {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const bufferLength = base64.length * 0.75;
  const bytes = new Uint8Array(bufferLength);
  let p = 0;

  for (let i = 0; i < base64.length; i += 4) {
    const a = chars.indexOf(base64[i]);
    const b = chars.indexOf(base64[i + 1]);
    const c = chars.indexOf(base64[i + 2]);
    const d = chars.indexOf(base64[i + 3]);

    bytes[p++] = (a << 2) | (b >> 4);
    bytes[p++] = ((b & 15) << 4) | (c >> 2);
    bytes[p++] = ((c & 3) << 6) | d;
  }

  return bytes;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  camera: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  closeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 8,
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  lotIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(15,118,110,0.8)',
    borderRadius: 8,
  },
  lotIndicatorText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  galleryBtn: {
    width: 60,
    alignItems: 'center',
  },
  galleryBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '500',
  },
  shutterBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shutterInner: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 15,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  permissionBtn: {
    backgroundColor: ACCENT,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginBottom: 12,
  },
  permissionBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelBtn: {
    paddingVertical: 12,
  },
  cancelText: {
    color: '#9CA3AF',
    fontSize: 15,
  },
});
