/**
 * Quick Photo — Take a photo, then specify context (lot + category)
 *
 * Categories: accident, road_block, theft, damage, general
 * Photo + comments go to the house/site timeline via sendMessage.
 */

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
  Modal,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@onsite/auth';
import { supabase } from '../src/lib/supabase';
import { sendMessage } from '@onsite/timeline';

const ACCENT = '#0F766E';

interface PhotoCategory {
  id: string;
  icon: string;
  label: string;
  color: string;
  timelinePrefix: string;
}

const PHOTO_CATEGORIES: PhotoCategory[] = [
  { id: 'delivery', icon: 'cube-outline', label: 'Delivery', color: '#16A34A', timelinePrefix: 'Delivery' },
  { id: 'accident', icon: 'warning-outline', label: 'Accident', color: '#DC2626', timelinePrefix: 'Accident' },
  { id: 'road_block', icon: 'ban-outline', label: 'Road Block', color: '#F59E0B', timelinePrefix: 'Road Block' },
  { id: 'theft', icon: 'alert-circle-outline', label: 'Material Theft', color: '#7C3AED', timelinePrefix: 'Material Theft' },
  { id: 'damage', icon: 'hammer-outline', label: 'Damage', color: '#EA580C', timelinePrefix: 'Damage' },
  { id: 'progress', icon: 'camera-outline', label: 'Work Progress', color: '#0F766E', timelinePrefix: 'Progress' },
  { id: 'general', icon: 'image-outline', label: 'Other', color: '#6B7280', timelinePrefix: 'Photo' },
];

interface HouseOption {
  id: string;
  lot_number: string;
}

export default function PhotoScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const operatorId = user?.id || null;
  const operatorName = user?.name || 'Operator';

  // Site info
  const [siteId, setSiteId] = useState<string | null>(null);
  const [siteName, setSiteName] = useState<string | null>(null);

  // Photo state
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Context modal
  const [showContext, setShowContext] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<PhotoCategory | null>(null);
  const [selectedHouse, setSelectedHouse] = useState<HouseOption | null>(null);
  const [comment, setComment] = useState('');
  const [houses, setHouses] = useState<HouseOption[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Success feedback
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (operatorId) loadSiteInfo(operatorId);
  }, [operatorId]);

  async function loadSiteInfo(userId: string) {
    // Get operator's assigned site
    const { data: assignment } = await supabase
      .from('egl_operator_assignments')
      .select('site_id, site:egl_sites(name)')
      .eq('operator_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (assignment?.site_id) {
      setSiteId(assignment.site_id);
      setSiteName((assignment as any).site?.name || null);

      // Load houses for lot selection
      const { data: houseData } = await supabase
        .from('egl_houses')
        .select('id, lot_number')
        .eq('site_id', assignment.site_id)
        .is('deleted_at', null)
        .order('lot_number', { ascending: true });

      if (houseData) {
        setHouses(houseData);
      }
    }
  }

  async function takePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera access is needed.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      allowsEditing: false,
    });

    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
      setSent(false);
      // Auto-open context modal after taking photo
      setShowContext(true);
    }
  }

  async function submitPhoto() {
    if (!photoUri || !selectedCategory || !siteId) return;

    setSubmitting(true);

    try {
      // 1. Upload photo to storage
      const FileSystem = await import('expo-file-system');
      const base64 = await FileSystem.readAsStringAsync(photoUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const siteFolder = siteId;
      const houseFolder = selectedHouse?.id || 'site-level';
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 7);
      const storagePath = `${siteFolder}/${houseFolder}/${timestamp}_${random}.jpg`;

      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const { error: uploadError } = await supabase.storage
        .from('egl-media')
        .upload(storagePath, bytes, { contentType: 'image/jpeg', upsert: false });

      if (uploadError) {
        Alert.alert('Error', 'Failed to upload photo.');
        console.error('Upload error:', uploadError);
        return;
      }

      const { data: urlData } = supabase.storage
        .from('egl-media')
        .getPublicUrl(storagePath);

      const publicUrl = urlData.publicUrl;

      // 2. Create timeline event for the house (if lot selected)
      if (selectedHouse) {
        await supabase.from('egl_timeline').insert({
          house_id: selectedHouse.id,
          event_type: selectedCategory.id === 'accident' || selectedCategory.id === 'theft'
            ? 'alert'
            : selectedCategory.id === 'progress'
              ? 'photo'
              : 'issue',
          title: `${selectedCategory.timelinePrefix}${selectedHouse ? ` — Lot ${selectedHouse.lot_number}` : ''}`,
          description: comment || `Photo taken by operator ${operatorName}`,
          source: 'operator_app',
          created_by: operatorId,
          metadata: {
            photo_url: publicUrl,
            category: selectedCategory.id,
            lot_number: selectedHouse.lot_number,
          },
        });
      }

      // 3. Post site-level message (visible to everyone)
      const lotTag = selectedHouse ? ` [Lot ${selectedHouse.lot_number}]` : '';
      const commentSuffix = comment ? `: ${comment}` : '';

      await sendMessage(supabase as never, {
        site_id: siteId,
        house_id: selectedHouse?.id || undefined,
        sender_type: 'operator',
        sender_id: operatorId || undefined,
        sender_name: operatorName,
        content: `[${selectedCategory.timelinePrefix.toUpperCase()}]${lotTag}${commentSuffix} [photo attached]`,
        source_app: 'operator',
      });

      // Success
      setShowContext(false);
      setSent(true);

      // Reset after 3s
      setTimeout(() => {
        setPhotoUri(null);
        setSelectedCategory(null);
        setSelectedHouse(null);
        setComment('');
        setSent(false);
      }, 3000);
    } catch (err) {
      console.error('Submit error:', err);
      Alert.alert('Error', 'Failed to send. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#101828" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Take Photo</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Site info */}
        {siteName && (
          <View style={styles.siteChip}>
            <Ionicons name="location-outline" size={14} color={ACCENT} />
            <Text style={styles.siteChipText}>{siteName}</Text>
          </View>
        )}

        {sent ? (
          /* Success state */
          <View style={styles.successCard}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark-circle" size={64} color="#16A34A" />
            </View>
            <Text style={styles.successTitle}>Photo Sent!</Text>
            <Text style={styles.successSubtitle}>
              Posted to supervisor's timeline
            </Text>
          </View>
        ) : photoUri ? (
          /* Photo preview */
          <View style={styles.previewCard}>
            <Image source={{ uri: photoUri }} style={styles.previewImage} />
            <View style={styles.previewActions}>
              <TouchableOpacity style={styles.contextBtn} onPress={() => setShowContext(true)}>
                <Ionicons name="create-outline" size={18} color="#fff" />
                <Text style={styles.contextBtnText}>Classify & Send</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.retakeButton} onPress={takePhoto}>
                <Ionicons name="camera-reverse-outline" size={20} color="#6B7280" />
                <Text style={styles.retakeText}>Retake</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* Empty state — take photo */
          <TouchableOpacity style={styles.captureCard} onPress={takePhoto}>
            <View style={styles.captureIcon}>
              <Ionicons name="camera" size={48} color={ACCENT} />
            </View>
            <Text style={styles.captureTitle}>Take Photo</Text>
            <Text style={styles.captureHint}>
              Document deliveries, accidents, road blocks, or work progress
            </Text>
          </TouchableOpacity>
        )}

        {!sent && !photoUri && (
          <View style={styles.categoriesPreview}>
            <Text style={styles.categoriesLabel}>Record types:</Text>
            <View style={styles.categoryChips}>
              {PHOTO_CATEGORIES.map(cat => (
                <View key={cat.id} style={[styles.categoryChip, { borderColor: cat.color + '40' }]}>
                  <Ionicons name={cat.icon as any} size={14} color={cat.color} />
                  <Text style={[styles.categoryChipText, { color: cat.color }]}>{cat.label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Context Modal */}
      <Modal visible={showContext} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Classify Photo</Text>
              <TouchableOpacity onPress={() => setShowContext(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {/* Category selection */}
              <Text style={styles.modalLabel}>Type</Text>
              <View style={styles.categoryGrid}>
                {PHOTO_CATEGORIES.map(cat => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryCard,
                      selectedCategory?.id === cat.id && { borderColor: cat.color, borderWidth: 2, backgroundColor: cat.color + '10' },
                    ]}
                    onPress={() => setSelectedCategory(cat)}
                  >
                    <Ionicons name={cat.icon as any} size={24} color={selectedCategory?.id === cat.id ? cat.color : '#6B7280'} />
                    <Text style={[
                      styles.categoryCardLabel,
                      selectedCategory?.id === cat.id && { color: cat.color, fontWeight: '700' },
                    ]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Lot selection */}
              <Text style={styles.modalLabel}>Lot (Optional)</Text>
              <View style={styles.lotGrid}>
                <TouchableOpacity
                  style={[styles.lotChip, !selectedHouse && styles.lotChipActive]}
                  onPress={() => setSelectedHouse(null)}
                >
                  <Text style={[styles.lotChipText, !selectedHouse && styles.lotChipTextActive]}>
                    General (no lot)
                  </Text>
                </TouchableOpacity>
                {houses.map(house => (
                  <TouchableOpacity
                    key={house.id}
                    style={[styles.lotChip, selectedHouse?.id === house.id && styles.lotChipActive]}
                    onPress={() => setSelectedHouse(house)}
                  >
                    <Text style={[styles.lotChipText, selectedHouse?.id === house.id && styles.lotChipTextActive]}>
                      Lot {house.lot_number}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Comment */}
              <Text style={styles.modalLabel}>Comment (Optional)</Text>
              <TextInput
                style={styles.commentInput}
                placeholder="Describe what happened..."
                placeholderTextColor="#9CA3AF"
                value={comment}
                onChangeText={setComment}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </ScrollView>

            {/* Submit button */}
            <TouchableOpacity
              style={[styles.submitBtn, !selectedCategory && styles.submitBtnDisabled]}
              onPress={submitPhoto}
              disabled={!selectedCategory || submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="send" size={18} color="#fff" />
                  <Text style={styles.submitBtnText}>Send to Timeline</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F7F9',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#101828',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  siteChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'center',
    backgroundColor: '#F0FDFA',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  siteChipText: {
    fontSize: 13,
    color: ACCENT,
    fontWeight: '600',
  },
  // Capture card
  captureCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  captureIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F0FDFA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  captureTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#101828',
    marginBottom: 4,
  },
  captureHint: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
  },
  // Categories preview
  categoriesPreview: {
    marginTop: 24,
  },
  categoriesLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  categoryChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: '#fff',
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  // Preview card
  previewCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: 280,
    resizeMode: 'cover',
  },
  previewActions: {
    padding: 12,
    gap: 8,
  },
  contextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: ACCENT,
    paddingVertical: 14,
    borderRadius: 10,
  },
  contextBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  retakeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
  },
  retakeText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  // Success state
  successCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
  },
  successIcon: {
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#16A34A',
    marginBottom: 4,
  },
  successSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#101828',
  },
  modalScroll: {
    paddingHorizontal: 16,
    maxHeight: 400,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Category grid
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryCard: {
    width: '31%',
    flexGrow: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minHeight: 70,
    justifyContent: 'center',
  },
  categoryCardLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
    marginTop: 4,
    textAlign: 'center',
  },
  // Lot grid
  lotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  lotChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  lotChipActive: {
    backgroundColor: '#F0FDFA',
    borderColor: ACCENT,
  },
  lotChipText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  lotChipTextActive: {
    color: ACCENT,
    fontWeight: '700',
  },
  // Comment
  commentInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: '#101828',
    minHeight: 70,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  // Submit
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: ACCENT,
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 16,
    borderRadius: 12,
  },
  submitBtnDisabled: {
    opacity: 0.4,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
