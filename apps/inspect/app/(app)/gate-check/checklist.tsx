/**
 * Gate Check Checklist — Main inspection checklist screen.
 *
 * Inspector goes through each item marking Pass/Fail/N/A.
 * Failed items trigger photo capture and deficiency creation.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@onsite/auth';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { supabase } from '../../../src/lib/supabase';
import {
  type FrmGateCheck,
  type FrmGateCheckItem,
  type GateCheckResult,
  type GateCheckTransition,
  TRANSITION_LABELS,
  getGateCheck,
  updateGateCheckItem,
  completeGateCheck,
  createHouseItem,
  linkDeficiency,
  findCrewForLotPhase,
} from '@onsite/framing';

const ACCENT = '#0F766E';

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

interface ItemState {
  item: FrmGateCheckItem;
  notes: string;
  photoUri: string | null;
  uploading: boolean;
  saving: boolean;
}

export default function ChecklistScreen() {
  const { gateCheckId, lotId } = useLocalSearchParams<{
    gateCheckId: string;
    lotId: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const scrollRef = useRef<ScrollView>(null);

  const [gateCheck, setGateCheck] = useState<FrmGateCheck | null>(null);
  const [items, setItems] = useState<ItemState[]>([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  const fetchGateCheck = useCallback(async () => {
    if (!gateCheckId) return;
    try {
      const data = await getGateCheck(supabase, gateCheckId);
      setGateCheck(data);
      setItems(
        data.items.map((item) => ({
          item,
          notes: item.notes || '',
          photoUri: item.photo_url || null,
          uploading: false,
          saving: false,
        })),
      );
    } catch (err) {
      console.error('[checklist] Fetch error:', err);
      Alert.alert('Error', 'Failed to load gate check');
    } finally {
      setLoading(false);
    }
  }, [gateCheckId]);

  useEffect(() => {
    fetchGateCheck();
  }, [fetchGateCheck]);

  const checkedCount = items.filter((s) => s.item.result !== 'pending').length;
  const totalCount = items.length;
  const allChecked = totalCount > 0 && checkedCount === totalCount;
  const transitionLabel = gateCheck
    ? TRANSITION_LABELS[gateCheck.transition as GateCheckTransition] || gateCheck.transition
    : '';

  async function handleResultPress(itemState: ItemState, result: GateCheckResult) {
    if (itemState.saving || itemState.uploading) return;

    const idx = items.findIndex((s) => s.item.id === itemState.item.id);
    if (idx === -1) return;

    // If tapping fail, expand the item for notes/photo
    if (result === 'fail') {
      setExpandedItemId(itemState.item.id);
    } else {
      // If switching away from fail, collapse
      if (expandedItemId === itemState.item.id) {
        setExpandedItemId(null);
      }
    }

    // Mark saving
    const updated = [...items];
    updated[idx] = { ...updated[idx], saving: true };
    setItems(updated);

    try {
      const updatedItem = await updateGateCheckItem(
        supabase,
        itemState.item.id,
        result,
        itemState.photoUri ?? undefined,
        itemState.notes || undefined,
      );

      updated[idx] = {
        ...updated[idx],
        item: updatedItem,
        saving: false,
      };
      setItems([...updated]);
    } catch (err) {
      console.error('[checklist] Update error:', err);
      updated[idx] = { ...updated[idx], saving: false };
      setItems([...updated]);
      Alert.alert('Error', 'Failed to update item');
    }
  }

  async function handleTakePhoto(itemState: ItemState) {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });

      if (result.canceled || !result.assets[0]?.uri) return;

      const uri = result.assets[0].uri;
      const idx = items.findIndex((s) => s.item.id === itemState.item.id);
      if (idx === -1) return;

      // Mark uploading
      const updated = [...items];
      updated[idx] = { ...updated[idx], uploading: true };
      setItems(updated);

      try {
        // Upload to storage
        const filename = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;
        const storagePath = `gate-checks/${gateCheckId}/${filename}`;

        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        const { error: uploadError } = await supabase.storage
          .from('frm-media')
          .upload(storagePath, decode(base64), { contentType: 'image/jpeg' });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('frm-media')
          .getPublicUrl(storagePath);

        const photoUrl = urlData.publicUrl;

        // Update the gate check item with photo
        const updatedItem = await updateGateCheckItem(
          supabase,
          itemState.item.id,
          itemState.item.result === 'pending' ? 'fail' : itemState.item.result,
          photoUrl,
          itemState.notes || undefined,
        );

        // Create a deficiency house item if this is a fail
        if (updatedItem.result === 'fail' && !updatedItem.deficiency_id && lotId && user?.id) {
          try {
            // Try to find the crew for auto-attribution
            let crewId: string | null = null;
            try {
              // Gate checks don't have a specific phase_id, try a reasonable default
              crewId = await findCrewForLotPhase(supabase, lotId, 'walls_1');
            } catch {
              // Non-fatal: crew lookup may fail
            }

            const houseItem = await createHouseItem(
              supabase,
              {
                lot_id: lotId,
                type: 'deficiency',
                severity: 'medium',
                title: `Gate Check: ${updatedItem.item_label}`,
                description: itemState.notes || `Failed during ${transitionLabel} gate check`,
                photo_url: photoUrl,
                blocking: true,
                gate_check_id: gateCheckId,
              },
              user.id,
              crewId,
            );

            // Link the deficiency to the gate check item
            await linkDeficiency(supabase, updatedItem.id, houseItem.id);
            updatedItem.deficiency_id = houseItem.id;
          } catch (defErr) {
            console.warn('[checklist] Deficiency creation failed (non-fatal):', defErr);
          }
        }

        updated[idx] = {
          ...updated[idx],
          item: updatedItem,
          photoUri: photoUrl,
          uploading: false,
        };
        setItems([...updated]);
      } catch (err: any) {
        console.error('[checklist] Upload error:', err);
        updated[idx] = { ...updated[idx], uploading: false };
        setItems([...updated]);
        Alert.alert('Upload Failed', err?.message || 'Try again');
      }
    } catch (err) {
      console.error('[checklist] Camera error:', err);
      Alert.alert('Error', 'Failed to open camera');
    }
  }

  async function handlePickImage(itemState: ItemState) {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });

      if (result.canceled || !result.assets[0]?.uri) return;

      const uri = result.assets[0].uri;
      const idx = items.findIndex((s) => s.item.id === itemState.item.id);
      if (idx === -1) return;

      const updated = [...items];
      updated[idx] = { ...updated[idx], uploading: true };
      setItems(updated);

      try {
        const filename = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;
        const storagePath = `gate-checks/${gateCheckId}/${filename}`;

        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        const { error: uploadError } = await supabase.storage
          .from('frm-media')
          .upload(storagePath, decode(base64), { contentType: 'image/jpeg' });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('frm-media')
          .getPublicUrl(storagePath);

        const photoUrl = urlData.publicUrl;

        const updatedItem = await updateGateCheckItem(
          supabase,
          itemState.item.id,
          itemState.item.result === 'pending' ? 'fail' : itemState.item.result,
          photoUrl,
          itemState.notes || undefined,
        );

        // Create deficiency if fail and no existing deficiency
        if (updatedItem.result === 'fail' && !updatedItem.deficiency_id && lotId && user?.id) {
          try {
            let crewId: string | null = null;
            try {
              crewId = await findCrewForLotPhase(supabase, lotId, 'walls_1');
            } catch { /* non-fatal */ }

            const houseItem = await createHouseItem(
              supabase,
              {
                lot_id: lotId,
                type: 'deficiency',
                severity: 'medium',
                title: `Gate Check: ${updatedItem.item_label}`,
                description: itemState.notes || `Failed during ${transitionLabel} gate check`,
                photo_url: photoUrl,
                blocking: true,
                gate_check_id: gateCheckId,
              },
              user.id,
              crewId,
            );

            await linkDeficiency(supabase, updatedItem.id, houseItem.id);
            updatedItem.deficiency_id = houseItem.id;
          } catch (defErr) {
            console.warn('[checklist] Deficiency creation failed (non-fatal):', defErr);
          }
        }

        updated[idx] = {
          ...updated[idx],
          item: updatedItem,
          photoUri: photoUrl,
          uploading: false,
        };
        setItems([...updated]);
      } catch (err: any) {
        console.error('[checklist] Upload error:', err);
        updated[idx] = { ...updated[idx], uploading: false };
        setItems([...updated]);
        Alert.alert('Upload Failed', err?.message || 'Try again');
      }
    } catch (err) {
      console.error('[checklist] Gallery error:', err);
    }
  }

  function handleNotesChange(itemId: string, text: string) {
    const idx = items.findIndex((s) => s.item.id === itemId);
    if (idx === -1) return;
    const updated = [...items];
    updated[idx] = { ...updated[idx], notes: text };
    setItems(updated);
  }

  async function handleSaveNotes(itemState: ItemState) {
    if (!itemState.notes.trim()) return;

    const idx = items.findIndex((s) => s.item.id === itemState.item.id);
    if (idx === -1) return;

    const updated = [...items];
    updated[idx] = { ...updated[idx], saving: true };
    setItems(updated);

    try {
      const updatedItem = await updateGateCheckItem(
        supabase,
        itemState.item.id,
        itemState.item.result,
        itemState.photoUri ?? undefined,
        itemState.notes || undefined,
      );

      updated[idx] = { ...updated[idx], item: updatedItem, saving: false };
      setItems([...updated]);
    } catch (err) {
      console.error('[checklist] Save notes error:', err);
      updated[idx] = { ...updated[idx], saving: false };
      setItems([...updated]);
    }
  }

  async function handleComplete() {
    if (!gateCheckId || completing) return;

    // Verify all items are checked
    const pending = items.filter((s) => s.item.result === 'pending');
    if (pending.length > 0) {
      Alert.alert(
        'Incomplete',
        `${pending.length} item(s) still need to be checked before completing.`,
      );
      return;
    }

    setCompleting(true);
    try {
      await completeGateCheck(supabase, gateCheckId);
      router.replace({
        pathname: '/(app)/gate-check/summary',
        params: { gateCheckId, lotId: lotId || '' },
      });
    } catch (err: any) {
      console.error('[checklist] Complete error:', err);
      Alert.alert('Error', err?.message || 'Failed to complete gate check');
    } finally {
      setCompleting(false);
    }
  }

  if (loading) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={ACCENT} />
      </View>
    );
  }

  if (!gateCheck) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>Gate check not found</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Back</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {transitionLabel}
          </Text>
          <Text style={styles.headerProgress}>
            {checkedCount}/{totalCount} checked
          </Text>
        </View>
        <View style={{ width: 60 }} />
      </View>

      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBg}>
          <View
            style={[
              styles.progressFill,
              {
                width: totalCount > 0 ? `${Math.round((checkedCount / totalCount) * 100)}%` : '0%',
                backgroundColor: allChecked ? '#059669' : ACCENT,
              },
            ]}
          />
        </View>
      </View>

      {/* Checklist */}
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {items.map((itemState, index) => {
          const isExpanded = expandedItemId === itemState.item.id;
          const isFail = itemState.item.result === 'fail';

          return (
            <View key={itemState.item.id} style={styles.itemCard}>
              {/* Item header */}
              <View style={styles.itemHeader}>
                <View style={styles.itemIndexBadge}>
                  <Text style={styles.itemIndex}>{index + 1}</Text>
                </View>
                <Text style={styles.itemLabel} numberOfLines={2}>
                  {itemState.item.item_label}
                </Text>
              </View>

              {/* Item code */}
              <Text style={styles.itemCode}>{itemState.item.item_code}</Text>

              {/* Result buttons */}
              <View style={styles.resultRow}>
                <TouchableOpacity
                  style={[
                    styles.resultBtn,
                    itemState.item.result === 'pass' && styles.resultBtnPass,
                  ]}
                  onPress={() => handleResultPress(itemState, 'pass')}
                  disabled={itemState.saving}
                >
                  <Text
                    style={[
                      styles.resultBtnText,
                      itemState.item.result === 'pass' && styles.resultBtnTextActive,
                    ]}
                  >
                    Pass
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.resultBtn,
                    itemState.item.result === 'fail' && styles.resultBtnFail,
                  ]}
                  onPress={() => handleResultPress(itemState, 'fail')}
                  disabled={itemState.saving}
                >
                  <Text
                    style={[
                      styles.resultBtnText,
                      itemState.item.result === 'fail' && styles.resultBtnTextActive,
                    ]}
                  >
                    Fail
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.resultBtn,
                    itemState.item.result === 'na' && styles.resultBtnNA,
                  ]}
                  onPress={() => handleResultPress(itemState, 'na')}
                  disabled={itemState.saving}
                >
                  <Text
                    style={[
                      styles.resultBtnText,
                      itemState.item.result === 'na' && styles.resultBtnTextActive,
                    ]}
                  >
                    N/A
                  </Text>
                </TouchableOpacity>

                {itemState.saving && (
                  <ActivityIndicator size="small" color={ACCENT} style={{ marginLeft: 8 }} />
                )}
              </View>

              {/* Expanded area for failed items */}
              {(isFail || isExpanded) && (
                <View style={styles.expandedArea}>
                  {/* Photo section */}
                  <View style={styles.photoSection}>
                    {itemState.photoUri ? (
                      <View style={styles.photoPreview}>
                        <Image
                          source={{ uri: itemState.photoUri }}
                          style={styles.photoImage}
                          resizeMode="cover"
                        />
                        <TouchableOpacity
                          style={styles.retakeBtn}
                          onPress={() => handleTakePhoto(itemState)}
                          disabled={itemState.uploading}
                        >
                          <Text style={styles.retakeBtnText}>Retake</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={styles.photoButtons}>
                        <TouchableOpacity
                          style={styles.cameraBtn}
                          onPress={() => handleTakePhoto(itemState)}
                          disabled={itemState.uploading}
                        >
                          {itemState.uploading ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          ) : (
                            <Text style={styles.cameraBtnText}>Take Photo</Text>
                          )}
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.galleryBtn}
                          onPress={() => handlePickImage(itemState)}
                          disabled={itemState.uploading}
                        >
                          <Text style={styles.galleryBtnText}>Gallery</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>

                  {/* Notes input */}
                  <View style={styles.notesSection}>
                    <TextInput
                      style={styles.notesInput}
                      placeholder="Add notes about this failure..."
                      placeholderTextColor="#9CA3AF"
                      value={itemState.notes}
                      onChangeText={(text) => handleNotesChange(itemState.item.id, text)}
                      onBlur={() => handleSaveNotes(itemState)}
                      multiline
                      numberOfLines={2}
                    />
                  </View>

                  {/* Deficiency link indicator */}
                  {itemState.item.deficiency_id && (
                    <View style={styles.deficiencyTag}>
                      <Text style={styles.deficiencyTagText}>
                        Deficiency created
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          );
        })}

        {/* Bottom spacer */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Complete button */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          style={[styles.completeBtn, !allChecked && styles.completeBtnDisabled]}
          onPress={handleComplete}
          disabled={!allChecked || completing}
          activeOpacity={0.7}
        >
          {completing ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={[styles.completeBtnText, !allChecked && styles.completeBtnTextDisabled]}>
              {allChecked
                ? 'Complete Gate Check'
                : `${totalCount - checkedCount} items remaining`}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F7F9',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F6F7F9',
  },
  errorText: {
    fontSize: 16,
    color: '#DC2626',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backBtn: {
    width: 60,
    paddingVertical: 6,
  },
  backBtnText: {
    fontSize: 16,
    color: ACCENT,
    fontWeight: '600',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#101828',
  },
  headerProgress: {
    fontSize: 13,
    color: '#667085',
    marginTop: 2,
  },

  // Progress bar
  progressContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
  },
  progressBg: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },

  // Scroll
  scrollContent: {
    padding: 16,
  },

  // Item card
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  itemIndexBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginTop: 1,
  },
  itemIndex: {
    fontSize: 12,
    fontWeight: '700',
    color: '#667085',
  },
  itemLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#101828',
    lineHeight: 20,
  },
  itemCode: {
    fontSize: 12,
    color: '#9CA3AF',
    marginLeft: 34,
    marginBottom: 10,
  },

  // Result buttons
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 34,
  },
  resultBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    minWidth: 64,
    alignItems: 'center',
  },
  resultBtnPass: {
    backgroundColor: '#ECFDF5',
    borderColor: '#059669',
  },
  resultBtnFail: {
    backgroundColor: '#FEF2F2',
    borderColor: '#DC2626',
  },
  resultBtnNA: {
    backgroundColor: '#F3F4F6',
    borderColor: '#9CA3AF',
  },
  resultBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#667085',
  },
  resultBtnTextActive: {
    color: '#101828',
  },

  // Expanded area (fail details)
  expandedArea: {
    marginTop: 12,
    marginLeft: 34,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },

  // Photo section
  photoSection: {
    marginBottom: 10,
  },
  photoButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  cameraBtn: {
    flex: 1,
    backgroundColor: ACCENT,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  cameraBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  galleryBtn: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  galleryBtnText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '600',
  },
  photoPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  photoImage: {
    width: 80,
    height: 80,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
  },
  retakeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  retakeBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#667085',
  },

  // Notes
  notesSection: {
    marginBottom: 8,
  },
  notesInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#101828',
    minHeight: 48,
    textAlignVertical: 'top',
  },

  // Deficiency tag
  deficiencyTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  deficiencyTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
  },

  // Bottom bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  completeBtn: {
    backgroundColor: ACCENT,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  completeBtnDisabled: {
    backgroundColor: '#E5E7EB',
  },
  completeBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  completeBtnTextDisabled: {
    color: '#9CA3AF',
  },
});
