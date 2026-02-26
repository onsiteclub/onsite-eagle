/**
 * Create new site screen.
 */

import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../src/lib/supabase';

const ACCENT = '#0F766E';

export default function SiteNewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (!name.trim()) {
      Alert.alert('Error', 'Site name is required');
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('egl_sites')
        .insert({
          name: name.trim(),
          address: address.trim() || null,
          city: city.trim() || null,
        })
        .select()
        .single();

      if (error) throw error;

      router.replace(`/(app)/site/${data.id}`);
    } catch (err: any) {
      console.error('[site-new] Create error:', err);
      Alert.alert('Error', err?.message || 'Failed to create site');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Site</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Site Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Maple Ridge Phase 2"
            placeholderTextColor="#9CA3AF"
            value={name}
            onChangeText={setName}
            autoFocus
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Address</Text>
          <TextInput
            style={styles.input}
            placeholder="Street address"
            placeholderTextColor="#9CA3AF"
            value={address}
            onChangeText={setAddress}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>City</Text>
          <TextInput
            style={styles.input}
            placeholder="City"
            placeholderTextColor="#9CA3AF"
            value={city}
            onChangeText={setCity}
          />
        </View>

        <TouchableOpacity
          style={[styles.createBtn, saving && styles.createBtnDisabled]}
          onPress={handleCreate}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.createBtnText}>Create Site</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
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
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backBtn: {
    width: 60,
  },
  backText: {
    fontSize: 16,
    color: ACCENT,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#101828',
  },
  form: {
    padding: 20,
    gap: 20,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginLeft: 4,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    height: 48,
    fontSize: 16,
    color: '#101828',
  },
  createBtn: {
    backgroundColor: ACCENT,
    borderRadius: 12,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  createBtnDisabled: {
    opacity: 0.7,
  },
  createBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
