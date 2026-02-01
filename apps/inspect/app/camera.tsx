import { CameraView, useCameraPermissions } from 'expo-camera';
import { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { CONSTRUCTION_PHASES } from '@onsite/shared';

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [selectedPhase, setSelectedPhase] = useState(0);
  const [isCapturing, setIsCapturing] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionIcon}>📷</Text>
        <Text style={styles.permissionText}>
          Precisamos de acesso à câmera para tirar fotos da obra
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Permitir Câmera</Text>
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
        Alert.alert(
          'Foto Capturada! 📷',
          `Fase: ${CONSTRUCTION_PHASES[selectedPhase].name}`,
          [
            { text: 'Descartar', style: 'cancel' },
            {
              text: 'Enviar',
              onPress: () => {
                Alert.alert('Sucesso!', 'Foto enviada para análise da IA.');
                router.back();
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Erro', 'Falha ao capturar foto');
    } finally {
      setIsCapturing(false);
    }
  }

  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} ref={cameraRef}>
        <View style={styles.overlay}>
          {/* Phase selector */}
          <View style={styles.phaseSelector}>
            <Text style={styles.selectorLabel}>Fase:</Text>
            <View style={styles.phaseButtons}>
              {CONSTRUCTION_PHASES.map((phase, index) => (
                <TouchableOpacity
                  key={phase.id}
                  style={[
                    styles.phaseChip,
                    selectedPhase === index && styles.phaseChipActive,
                  ]}
                  onPress={() => setSelectedPhase(index)}
                >
                  <Text
                    style={[
                      styles.phaseChipText,
                      selectedPhase === index && styles.phaseChipTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {phase.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Controls */}
          <View style={styles.controls}>
            <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.captureButton}
              onPress={takePhoto}
              disabled={isCapturing}
            >
              {isCapturing ? (
                <ActivityIndicator color="#fff" size="large" />
              ) : (
                <View style={styles.captureInner} />
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
    padding: 24,
  },
  permissionIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  permissionText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  permissionButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 32,
    paddingVertical: 14,
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
  phaseSelector: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 12,
  },
  selectorLabel: {
    color: '#9CA3AF',
    fontSize: 12,
    marginBottom: 8,
  },
  phaseButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  phaseChip: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  phaseChipActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  phaseChipText: {
    color: '#fff',
    fontSize: 12,
  },
  phaseChipTextActive: {
    fontWeight: '600',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 40,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  cancelButton: {
    padding: 10,
    width: 80,
  },
  cancelText: {
    color: '#fff',
    fontSize: 16,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
  },
  captureInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff',
  },
  placeholder: {
    width: 80,
  },
});
