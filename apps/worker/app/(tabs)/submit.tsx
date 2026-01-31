import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { CONSTRUCTION_PHASES, PHASE_ITEMS } from '@onsite/shared';

export default function SubmitScreen() {
  const [selectedPhase, setSelectedPhase] = useState<number | null>(null);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  const handleSelectPhase = (phaseIndex: number) => {
    setSelectedPhase(phaseIndex);
    setSelectedItem(null);
  };

  const handleTakePhoto = async () => {
    if (selectedPhase === null) {
      Alert.alert('Selecione uma fase', 'Escolha a fase da construção primeiro.');
      return;
    }

    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permissão necessária', 'Precisamos de acesso à câmera.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      allowsEditing: false,
    });

    if (!result.canceled && result.assets[0]) {
      // Navigate to confirmation/upload screen
      Alert.alert(
        'Foto Capturada',
        `Fase: ${CONSTRUCTION_PHASES[selectedPhase].name}\n${selectedItem ? `Item: ${selectedItem}` : 'Foto geral da fase'}`,
        [
          { text: 'Descartar', style: 'cancel' },
          {
            text: 'Enviar para IA',
            onPress: () => {
              // TODO: Upload and validate
              Alert.alert('Enviado!', 'A foto será analisada pela IA.');
            },
          },
        ]
      );
    }
  };

  const handlePickImage = async () => {
    if (selectedPhase === null) {
      Alert.alert('Selecione uma fase', 'Escolha a fase da construção primeiro.');
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permissão necessária', 'Precisamos de acesso às fotos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 0.8,
      allowsEditing: false,
    });

    if (!result.canceled && result.assets[0]) {
      Alert.alert(
        'Foto Selecionada',
        `Fase: ${CONSTRUCTION_PHASES[selectedPhase].name}`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Enviar para IA',
            onPress: () => {
              Alert.alert('Enviado!', 'A foto será analisada pela IA.');
            },
          },
        ]
      );
    }
  };

  const currentPhaseItems = selectedPhase !== null ? PHASE_ITEMS[selectedPhase] : [];

  return (
    <ScrollView style={styles.container}>
      {/* Phase Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>1. Selecione a Fase</Text>
        <View style={styles.phaseGrid}>
          {CONSTRUCTION_PHASES.map((phase, index) => (
            <TouchableOpacity
              key={phase.id}
              style={[
                styles.phaseButton,
                selectedPhase === index && styles.phaseButtonActive,
              ]}
              onPress={() => handleSelectPhase(index)}
            >
              <Text style={styles.phaseNumber}>{index + 1}</Text>
              <Text
                style={[
                  styles.phaseName,
                  selectedPhase === index && styles.phaseNameActive,
                ]}
                numberOfLines={2}
              >
                {phase.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Item Selection (Optional) */}
      {selectedPhase !== null && currentPhaseItems.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Item Específico (Opcional)</Text>
          <Text style={styles.sectionSubtitle}>
            A IA pode identificar múltiplos itens em uma foto
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.itemsRow}>
              <TouchableOpacity
                style={[
                  styles.itemChip,
                  selectedItem === null && styles.itemChipActive,
                ]}
                onPress={() => setSelectedItem(null)}
              >
                <Text style={[styles.itemText, selectedItem === null && styles.itemTextActive]}>
                  Foto Geral
                </Text>
              </TouchableOpacity>
              {currentPhaseItems.slice(0, 8).map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.itemChip,
                    selectedItem === item.name && styles.itemChipActive,
                  ]}
                  onPress={() => setSelectedItem(item.name)}
                >
                  <Text
                    style={[
                      styles.itemText,
                      selectedItem === item.name && styles.itemTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {item.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>3. Capture ou Selecione</Text>

        <TouchableOpacity
          style={[styles.actionButton, styles.cameraButton]}
          onPress={handleTakePhoto}
        >
          <Text style={styles.actionIcon}>📷</Text>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Tirar Foto</Text>
            <Text style={styles.actionSubtitle}>Abrir câmera agora</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.galleryButton]}
          onPress={handlePickImage}
        >
          <Text style={styles.actionIcon}>🖼️</Text>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Da Galeria</Text>
            <Text style={styles.actionSubtitle}>Selecionar foto existente</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Info */}
      <View style={styles.infoBox}>
        <Text style={styles.infoIcon}>💡</Text>
        <Text style={styles.infoText}>
          A IA analisará sua foto e preencherá automaticamente os itens detectados.
          Uma foto pode validar múltiplos itens!
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 12,
  },
  phaseGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  phaseButton: {
    width: '31%',
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  phaseButtonActive: {
    borderColor: '#10B981',
    backgroundColor: '#064E3B',
  },
  phaseNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#10B981',
    marginBottom: 4,
  },
  phaseName: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  phaseNameActive: {
    color: '#fff',
  },
  itemsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  itemChip: {
    backgroundColor: '#1F2937',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#374151',
  },
  itemChipActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  itemText: {
    color: '#9CA3AF',
    fontSize: 13,
  },
  itemTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  cameraButton: {
    backgroundColor: '#10B981',
  },
  galleryButton: {
    backgroundColor: '#1F2937',
    borderWidth: 1,
    borderColor: '#374151',
  },
  actionIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  actionSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#1E3A5F',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'flex-start',
  },
  infoIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  infoText: {
    flex: 1,
    color: '#93C5FD',
    fontSize: 13,
    lineHeight: 20,
  },
});
