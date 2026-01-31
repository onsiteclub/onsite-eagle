import { CameraView, useCameraPermissions } from 'expo-camera';
import { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { CONSTRUCTION_PHASES } from '@onsite/shared';

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [selectedPhase, setSelectedPhase] = useState(CONSTRUCTION_PHASES[0].name);
  const [isCapturing, setIsCapturing] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>
          We need camera permission to take construction photos
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  async function takePhoto() {
    if (!cameraRef.current || isCapturing) return;

    setIsCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: true,
      });

      if (photo) {
        // Here you would upload to the API for validation
        Alert.alert(
          'Photo Captured',
          `Phase: ${selectedPhase}\n\nThis photo will be sent for AI validation.`,
          [
            { text: 'Retake', style: 'cancel' },
            {
              text: 'Submit',
              onPress: () => {
                // TODO: Submit to validation API
                router.back();
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to capture photo');
    } finally {
      setIsCapturing(false);
    }
  }

  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} ref={cameraRef}>
        <View style={styles.overlay}>
          {/* Phase selector at top */}
          <View style={styles.phaseSelector}>
            <Text style={styles.phaseSelectorLabel}>Select Phase:</Text>
            <View style={styles.phaseButtons}>
              {CONSTRUCTION_PHASES.slice(0, 4).map((phase) => (
                <TouchableOpacity
                  key={phase.id}
                  style={[
                    styles.phaseButton,
                    selectedPhase === phase.name && styles.phaseButtonActive,
                  ]}
                  onPress={() => setSelectedPhase(phase.name)}
                >
                  <Text
                    style={[
                      styles.phaseButtonText,
                      selectedPhase === phase.name && styles.phaseButtonTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {phase.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Capture button at bottom */}
          <View style={styles.controls}>
            <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
              <Text style={styles.closeButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.captureButton}
              onPress={takePhoto}
              disabled={isCapturing}
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
    backgroundColor: '#3B82F6',
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
  phaseSelector: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 16,
    paddingTop: 8,
  },
  phaseSelectorLabel: {
    color: '#9CA3AF',
    fontSize: 12,
    marginBottom: 8,
  },
  phaseButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  phaseButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  phaseButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  phaseButtonText: {
    color: '#fff',
    fontSize: 12,
  },
  phaseButtonTextActive: {
    fontWeight: '600',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 40,
    backgroundColor: 'rgba(0,0,0,0.5)',
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
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  captureButtonInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
  },
  placeholder: {
    width: 80,
  },
});
