import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { supabase } from '../../src/lib/supabase';

export default function NewSiteScreen() {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [totalLots, setTotalLots] = useState('');
  const [startDate, setStartDate] = useState('');
  const [expectedEndDate, setExpectedEndDate] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert('Erro', 'O nome do jobsite e obrigatorio');
      return;
    }

    if (!address.trim()) {
      Alert.alert('Erro', 'O endereco e obrigatorio');
      return;
    }

    if (!city.trim()) {
      Alert.alert('Erro', 'A cidade e obrigatoria');
      return;
    }

    setSaving(true);

    try {
      const { data, error } = await supabase
        .from('sites')
        .insert({
          name: name.trim(),
          address: address.trim(),
          city: city.trim(),
          total_lots: totalLots ? parseInt(totalLots, 10) : 0,
          completed_lots: 0,
          start_date: startDate || null,
          expected_end_date: expectedEndDate || null,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      Alert.alert('Sucesso', 'Jobsite criado com sucesso', [
        {
          text: 'OK',
          onPress: () => {
            if (data) {
              router.replace(`/site/${data.id}`);
            } else {
              router.back();
            }
          },
        },
      ]);
    } catch (error) {
      console.error('Error creating site:', error);
      Alert.alert('Erro', 'Nao foi possivel criar o jobsite');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.form}>
        {/* Name */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Nome do Jobsite *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Residencial Alto da Serra"
            placeholderTextColor="#6B7280"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
        </View>

        {/* Address */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Endereco *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Rua das Flores, 123"
            placeholderTextColor="#6B7280"
            value={address}
            onChangeText={setAddress}
            autoCapitalize="words"
          />
        </View>

        {/* City */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Cidade *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Sao Paulo, SP"
            placeholderTextColor="#6B7280"
            value={city}
            onChangeText={setCity}
            autoCapitalize="words"
          />
        </View>

        {/* Total Lots */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Total de Lotes</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: 50"
            placeholderTextColor="#6B7280"
            value={totalLots}
            onChangeText={setTotalLots}
            keyboardType="numeric"
          />
        </View>

        {/* Start Date */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Data de Inicio</Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#6B7280"
            value={startDate}
            onChangeText={setStartDate}
          />
          <Text style={styles.hint}>Formato: 2024-01-15</Text>
        </View>

        {/* Expected End Date */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Previsao de Termino</Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#6B7280"
            value={expectedEndDate}
            onChangeText={setExpectedEndDate}
          />
          <Text style={styles.hint}>Formato: 2025-06-30</Text>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Criar Jobsite</Text>
          )}
        </TouchableOpacity>

        {/* Cancel Button */}
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => router.back()}
          disabled={saving}
        >
          <Text style={styles.cancelButtonText}>Cancelar</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  form: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#D1D5DB',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1F2937',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#374151',
  },
  hint: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  saveButton: {
    backgroundColor: '#059669',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonDisabled: {
    backgroundColor: '#065F46',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  cancelButtonText: {
    color: '#6B7280',
    fontSize: 16,
  },
});
