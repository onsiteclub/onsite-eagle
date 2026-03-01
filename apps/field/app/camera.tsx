/**
 * Camera — Take phase photos for a lot
 *
 * Always opened from within a lot (houseId always provided via params).
 * Queries frm_lots, inserts to frm_photos + frm_timeline.
 * Storage bucket: frm-media.
 * Camera overlay stays dark for legibility.
 *
 * Sprint 2: Uses PhaseId text (not numbers), option to create issue from photo.
 */

import { CameraView, useCameraPermissions } from 'expo-camera';
import { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, ScrollView, TextInput, Modal } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import { supabase } from '../src/lib/supabase';
import { FRAMING_PHASES, findCrewForLotPhase } from '@onsite/framing';

const ACCENT = '#0F766E';

/** Short labels for the camera phase selector */
const PHASE_SHORT: Record<string, string> = {
  capping: 'Cap',
  floor_1: 'F1',
  walls_1: 'W1',
  floor_2: 'F2',
  walls_2: 'W2',
  roof: 'Roof',
  backframe_basement: 'BB',
  backframe_strapping: 'BS',
  backframe_backing: 'BA',
};

const ISSUE_TYPES = [
  { value: 'deficiency', label: 'Deficiency' },
  { value: 'safety', label: 'Safety' },
  { value: 'damage', label: 'Damage' },
  { value: 'missing', label: 'Missing' },
  { value: 'rework', label: 'Rework' },
] as const;

const SEVERITY_OPTIONS = [
  { value: 'low', label: 'Low', color: '#6B7280' },
  { value: 'medium', label: 'Medium', color: '#D97706' },
  { value: 'high', label: 'High', color: '#EA580C' },
  { value: 'critical', label: 'Critical', color: '#DC2626' },
] as const;

interface House {
  id: string;
  lot_number: string;
  jobsite_id: string;
  current_phase: string | null;
}

export default function CameraScreen() {
  const params = useLocalSearchParams<{ houseId?: string; phaseId?: string }>();
  const [permission, requestPermission] = useCameraPermissions();
  const [selectedPhase, setSelectedPhase] = useState(
    params.phaseId || 'floor_1'
  );
  const [isCapturing, setIsCapturing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [house, setHouse] = useState<House | null>(null);

  // Issue report modal state
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [issuePhotoUrl, setIssuePhotoUrl] = useState<string | null>(null);
  const [issueTitle, setIssueTitle] = useState('');
  const [issueType, setIssueType] = useState('deficiency');
  const [issueSeverity, setIssueSeverity] = useState('medium');
  const [isSubmittingIssue, setIsSubmittingIssue] = useState(false);

  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    if (params.houseId) loadHouse(params.houseId);
  }, [params.houseId]);

  async function loadHouse(id: string) {
    const { data } = await supabase
      .from('frm_lots')
      .select('id, lot_number, jobsite_id, current_phase')
      .eq('id', id)
      .single();
    if (data) {
      setHouse(data);
      if (data.current_phase && !params.phaseId) {
        setSelectedPhase(data.current_phase);
      }
    }
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

  async function uploadPhotoToStorage(uri: string) {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const timestamp = Date.now();
    const filename = `${house!.id}/${selectedPhase}/${timestamp}.jpg`;

    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const { error: uploadError } = await supabase.storage
      .from('frm-media')
      .upload(filename, bytes, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from('frm-media')
      .getPublicUrl(filename);

    return urlData.publicUrl;
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
        const phaseName = FRAMING_PHASES.find(p => p.id === selectedPhase)?.name || selectedPhase;
        Alert.alert(
          'Photo Captured',
          `Lot: ${house.lot_number}\nPhase: ${phaseName}`,
          [
            { text: 'Retake', style: 'cancel' },
            {
              text: 'Upload',
              onPress: () => uploadPhoto(photo.uri),
            },
            {
              text: 'Report Issue',
              style: 'destructive',
              onPress: () => handleReportIssue(photo.uri),
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

  async function handleReportIssue(photoUri: string) {
    if (!house) return;
    setIsUploading(true);
    try {
      const photoUrl = await uploadPhotoToStorage(photoUri);
      setIssuePhotoUrl(photoUrl);
      setShowIssueModal(true);
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Error', 'Failed to upload photo.');
    } finally {
      setIsUploading(false);
    }
  }

  async function submitIssue() {
    if (!house || !issuePhotoUrl || !issueTitle.trim()) return;
    setIsSubmittingIssue(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Auto-fill crew_id via routing helper
      const crewId = await findCrewForLotPhase(supabase, house.id, selectedPhase as any);

      await supabase
        .from('frm_house_items')
        .insert({
          lot_id: house.id,
          phase_id: selectedPhase,
          crew_id: crewId,
          type: issueType,
          severity: issueSeverity,
          title: issueTitle.trim(),
          photo_url: issuePhotoUrl,
          reported_by: user.id,
          status: 'open',
          blocking: issueType === 'safety',
        });

      await supabase
        .from('frm_timeline')
        .insert({
          lot_id: house.id,
          event_type: 'issue',
          title: `Issue: ${issueTitle.trim()}`,
          description: `${issueType} (${issueSeverity}) on ${selectedPhase}`,
          source: 'field',
        });

      setShowIssueModal(false);
      setIssueTitle('');
      Alert.alert('Issue Reported', 'The issue has been logged.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('Issue submit error:', error);
      Alert.alert('Error', 'Failed to submit issue.');
    } finally {
      setIsSubmittingIssue(false);
    }
  }

  async function uploadPhoto(uri: string) {
    if (!house) return;
    setIsUploading(true);
    try {
      const photoUrl = await uploadPhotoToStorage(uri);

      const { error: photoError } = await supabase
        .from('frm_photos')
        .insert({
          lot_id: house.id,
          phase_id: selectedPhase,
          photo_url: photoUrl,
          ai_validation_status: 'pending',
        });

      if (photoError) {
        console.error('Error saving photo record:', photoError);
      }

      const phaseName = FRAMING_PHASES.find(p => p.id === selectedPhase)?.name || selectedPhase;
      await supabase
        .from('frm_timeline')
        .insert({
          lot_id: house.id,
          event_type: 'photo',
          title: `${phaseName} Photo`,
          description: `Photo uploaded for ${phaseName}`,
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
                    {FRAMING_PHASES.map((phase) => (
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
                        >
                          {PHASE_SHORT[phase.id]}
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

      {/* Issue Report Modal */}
      <Modal visible={showIssueModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Report Issue</Text>
              <TouchableOpacity onPress={() => setShowIssueModal(false)}>
                <Ionicons name="close" size={24} color="#667085" />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>Title *</Text>
            <TextInput
              style={styles.textInput}
              value={issueTitle}
              onChangeText={setIssueTitle}
              placeholder="Describe the issue..."
              placeholderTextColor="#9CA3AF"
            />

            <Text style={styles.fieldLabel}>Type</Text>
            <View style={styles.chipRow}>
              {ISSUE_TYPES.map(t => (
                <TouchableOpacity
                  key={t.value}
                  style={[styles.chip, issueType === t.value && styles.chipActive]}
                  onPress={() => setIssueType(t.value)}
                >
                  <Text style={[styles.chipText, issueType === t.value && styles.chipTextActive]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Severity</Text>
            <View style={styles.chipRow}>
              {SEVERITY_OPTIONS.map(s => (
                <TouchableOpacity
                  key={s.value}
                  style={[
                    styles.chip,
                    issueSeverity === s.value && { backgroundColor: s.color },
                  ]}
                  onPress={() => setIssueSeverity(s.value)}
                >
                  <Text style={[
                    styles.chipText,
                    issueSeverity === s.value && { color: '#fff' },
                  ]}>
                    {s.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.submitButton, (!issueTitle.trim() || isSubmittingIssue) && styles.submitButtonDisabled]}
              onPress={submitIssue}
              disabled={!issueTitle.trim() || isSubmittingIssue}
            >
              {isSubmittingIssue ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Submit Issue</Text>
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
  // Issue Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#101828',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#667085',
    marginBottom: 8,
    marginTop: 12,
  },
  textInput: {
    backgroundColor: '#F6F7F9',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#101828',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  chipActive: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
  },
  chipText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  submitButton: {
    backgroundColor: ACCENT,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
