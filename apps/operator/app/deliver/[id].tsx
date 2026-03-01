import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@onsite/auth';
import { supabase } from '../../src/lib/supabase';
import { sendMessage } from '@onsite/timeline';
import type { MaterialRequest } from '@onsite/shared';

const ACCENT = '#0F766E';

export default function DeliverConfirmation() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const operatorId = user?.id || null;
  const operatorName = user?.name || 'Operator';
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [request, setRequest] = useState<MaterialRequest | null>(null);
  const [deliveryNotes, setDeliveryNotes] = useState('');

  // Photo state
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    loadRequest();
  }, [id]);

  async function loadRequest() {
    try {
      const { data, error } = await supabase
        .from('frm_material_requests')
        .select(`
          *,
          lot:frm_lots(lot_number),
          jobsite:frm_jobsites(name)
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error loading request:', error);
        return;
      }

      setRequest({
        ...data,
        lot_number: data.lot?.lot_number,
        site_name: data.jobsite?.name,
      });
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function takePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera access is needed to take photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      allowsEditing: false,
    });

    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
      setPhotoUrl(null); // Reset any previous upload
    }
  }

  async function uploadPhoto() {
    if (!photoUri || !request) return;

    setUploading(true);
    try {
      // Read file as base64
      const FileSystem = await import('expo-file-system');
      const base64 = await FileSystem.readAsStringAsync(photoUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Build storage path
      const siteFolder = request.jobsite_id || request.site_id || 'unsorted';
      const houseFolder = request.lot_id || request.house_id || 'deliveries';
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 7);
      const storagePath = `${siteFolder}/${houseFolder}/${timestamp}_${random}.jpg`;

      // Convert base64 to bytes
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('frm-media')
        .upload(storagePath, bytes, { contentType: 'image/jpeg', upsert: false });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        Alert.alert('Error', 'Failed to upload photo. Try again.');
        return;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('frm-media')
        .getPublicUrl(storagePath);

      setPhotoUrl(urlData.publicUrl);
    } catch (err) {
      console.error('Upload error:', err);
      Alert.alert('Error', 'Failed to upload photo.');
    } finally {
      setUploading(false);
    }
  }

  async function confirmDelivery() {
    if (!request) return;

    // Upload photo first if taken but not yet uploaded
    if (photoUri && !photoUrl) {
      await uploadPhoto();
    }

    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('frm_material_requests')
        .update({
          status: 'delivered',
          delivered_at: new Date().toISOString(),
          delivery_notes: deliveryNotes.trim() || null,
          delivered_by_name: operatorName,
        })
        .eq('id', request.id);

      if (error) {
        Alert.alert('Error', 'Failed to confirm delivery');
        console.error('Error:', error);
        return;
      }

      // Create house-level timeline event with photo
      if (request.lot_id || request.house_id) {
        const photoSuffix = photoUrl ? `\nFoto: ${photoUrl}` : '';
        await supabase.from('frm_timeline').insert({
          lot_id: request.lot_id || request.house_id,
          event_type: 'material_delivery',
          title: `Material Delivered: ${request.material_name}`,
          description: `${request.quantity} ${request.unit} delivered by ${operatorName}${deliveryNotes ? `. Notes: ${deliveryNotes}` : ''}${photoSuffix}`,
          source: 'operator_app',
          created_by: operatorId,
          metadata: photoUrl ? { photo_url: photoUrl, delivery_request_id: request.id } : { delivery_request_id: request.id },
        });
      }

      // Post site-level timeline message
      if (request.site_id) {
        const notesSuffix = deliveryNotes ? ` — ${deliveryNotes}` : '';
        const photoTag = photoUrl ? ' [with photo]' : '';
        await sendMessage(supabase as never, {
          site_id: request.site_id,
          house_id: request.house_id || undefined,
          sender_type: 'operator',
          sender_id: operatorId || undefined,
          sender_name: operatorName,
          content: `Delivered ${request.quantity} ${request.unit} of ${request.material_name}${request.lot_number ? ` at Lot ${request.lot_number}` : ''}${notesSuffix}${photoTag}`,
          source_app: 'operator',
        });
      }

      Alert.alert(
        'Success',
        'Delivery confirmed!',
        [{ text: 'OK', onPress: () => router.replace('/(tabs)') }],
      );
    } catch (err) {
      console.error('Error:', err);
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={ACCENT} />
      </View>
    );
  }

  if (!request) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Request not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Delivery Summary */}
      <View style={styles.summaryCard}>
        <View style={styles.checkIcon}>
          <Ionicons name="cube-outline" size={40} color="#16A34A" />
        </View>
        <Text style={styles.summaryTitle}>Confirm Delivery</Text>
        <Text style={styles.materialName}>{request.material_name}</Text>
        <Text style={styles.quantity}>{request.quantity} {request.unit}</Text>
        <Text style={styles.location}>
          {request.site_name}
          {request.lot_number ? ` • Lot ${request.lot_number}` : ''}
        </Text>
      </View>

      {/* Photo Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Delivery Photo</Text>

        {photoUri ? (
          <View style={styles.photoPreview}>
            <Image source={{ uri: photoUri }} style={styles.photoImage} />
            <View style={styles.photoActions}>
              {photoUrl ? (
                <View style={styles.uploadedBadge}>
                  <Ionicons name="checkmark-circle" size={16} color="#16A34A" />
                  <Text style={styles.uploadedText}>Uploaded</Text>
                </View>
              ) : uploading ? (
                <ActivityIndicator size="small" color={ACCENT} />
              ) : null}
              <TouchableOpacity
                style={styles.retakeBtn}
                onPress={takePhoto}
              >
                <Ionicons name="camera-reverse-outline" size={18} color="#6B7280" />
                <Text style={styles.retakeBtnText}>Retake</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.removeBtn}
                onPress={() => { setPhotoUri(null); setPhotoUrl(null); }}
              >
                <Ionicons name="trash-outline" size={18} color="#DC2626" />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity style={styles.takePhotoBtn} onPress={takePhoto}>
            <Ionicons name="camera-outline" size={32} color={ACCENT} />
            <Text style={styles.takePhotoBtnText}>Take Photo</Text>
            <Text style={styles.takePhotoBtnHint}>Document the material delivery</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Delivery Notes */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notes (Optional)</Text>
        <TextInput
          style={styles.notesInput}
          placeholder="Delivery notes..."
          placeholderTextColor="#9CA3AF"
          value={deliveryNotes}
          onChangeText={setDeliveryNotes}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.confirmButton}
          onPress={confirmDelivery}
          disabled={submitting || uploading}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={22} color="#fff" />
              <Text style={styles.confirmButtonText}>Confirm Delivery</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => router.back()}
          disabled={submitting}
        >
          <Text style={styles.cancelButtonText}>Back</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F7F9',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F6F7F9',
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  checkIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#16A34A',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  materialName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#101828',
    textAlign: 'center',
    marginBottom: 4,
  },
  quantity: {
    fontSize: 15,
    color: '#6B7280',
    marginBottom: 6,
  },
  location: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Photo styles
  takePhotoBtn: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  takePhotoBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: ACCENT,
    marginTop: 8,
  },
  takePhotoBtnHint: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 4,
  },
  photoPreview: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  photoImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  photoActions: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    gap: 10,
  },
  uploadedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  uploadedText: {
    fontSize: 13,
    color: '#16A34A',
    fontWeight: '600',
  },
  retakeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
  },
  retakeBtnText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  removeBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#FEF2F2',
  },
  notesInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#101828',
    minHeight: 80,
  },
  actions: {
    gap: 10,
    marginTop: 4,
  },
  confirmButton: {
    backgroundColor: '#16A34A',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    minHeight: 54,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cancelButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '600',
  },
});
