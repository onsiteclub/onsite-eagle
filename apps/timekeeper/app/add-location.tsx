/**
 * Add Location Screen - Placeholder
 * Backend integration (SQLite, GPS) will be added later.
 */

import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors, localColors } from '@onsite/tokens';

const C = { bg: colors.background, card: colors.card, border: colors.border, text: colors.text, muted: colors.textMuted, accent: colors.accent, white: colors.white };
const COLORS = localColors.slice(0, 6);

export default function AddLocationScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [radius, setRadius] = useState('150');
  const [color, setColor] = useState('#0F766E');

  function handleSubmit() {
    if (!name.trim()) {
      Alert.alert('Error', 'Location name is required.');
      return;
    }
    Alert.alert(
      'Location Created (Mock)',
      `${name.trim()}\nRadius: ${radius}m`,
      [{ text: 'OK', onPress: () => router.back() }],
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="close" size={24} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Location</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Maple Ridge Site"
          placeholderTextColor={C.muted}
          autoFocus
        />

        <Text style={styles.label}>Address (optional)</Text>
        <TextInput
          style={styles.input}
          value={address}
          onChangeText={setAddress}
          placeholder="123 Main St, Toronto"
          placeholderTextColor={C.muted}
        />

        <Text style={styles.label}>Radius (meters)</Text>
        <TextInput
          style={styles.input}
          value={radius}
          onChangeText={setRadius}
          placeholder="150"
          placeholderTextColor={C.muted}
          keyboardType="numeric"
        />

        <Text style={styles.label}>Color</Text>
        <View style={styles.colorRow}>
          {COLORS.map((c) => (
            <TouchableOpacity
              key={c}
              style={[
                styles.colorDot,
                { backgroundColor: c },
                color === c && styles.colorDotActive,
              ]}
              onPress={() => setColor(c)}
            />
          ))}
        </View>

        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitText}>Create Location</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: C.text },
  scroll: { padding: 16, paddingBottom: 40 },
  label: { fontSize: 13, fontWeight: '600', color: C.muted, marginBottom: 6, marginTop: 16 },
  input: {
    backgroundColor: C.card, color: C.text,
    borderRadius: 12, padding: 14, fontSize: 16,
    borderWidth: 1, borderColor: C.border,
  },
  colorRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  colorDot: { width: 32, height: 32, borderRadius: 16 },
  colorDotActive: { borderWidth: 3, borderColor: C.accent },
  submitButton: {
    backgroundColor: C.accent, borderRadius: 12,
    padding: 16, alignItems: 'center', marginTop: 32,
  },
  submitText: { color: C.white, fontSize: 16, fontWeight: '600' },
});
