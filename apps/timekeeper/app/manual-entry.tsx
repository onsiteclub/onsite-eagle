/**
 * Manual Entry Screen - Placeholder
 * Backend integration (SQLite, geofences) will be added later.
 */

import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors } from '@onsite/tokens';

const C = { bg: colors.background, card: colors.card, border: colors.border, text: colors.text, muted: colors.textMuted, accent: colors.accent, white: colors.white, inputBg: colors.input };

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function ManualEntryScreen() {
  const router = useRouter();
  const [date, setDate] = useState(todayStr());
  const [enterTime, setEnterTime] = useState('07:00');
  const [exitTime, setExitTime] = useState('15:30');
  const [breakMins, setBreakMins] = useState('30');
  const [notes, setNotes] = useState('');

  function handleSubmit() {
    Alert.alert(
      'Entry Saved (Mock)',
      `${date}: ${enterTime} → ${exitTime}\nBreak: ${breakMins}min`,
      [{ text: 'OK', onPress: () => router.back() }],
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="close" size={24} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manual Entry</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.label}>Date</Text>
        <TextInput
          style={styles.input}
          value={date}
          onChangeText={setDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={C.muted}
        />

        <View style={styles.timeRow}>
          <View style={styles.timeCol}>
            <Text style={styles.label}>Start Time</Text>
            <TextInput
              style={styles.input}
              value={enterTime}
              onChangeText={setEnterTime}
              placeholder="HH:MM"
              placeholderTextColor={C.muted}
            />
          </View>
          <View style={styles.timeCol}>
            <Text style={styles.label}>End Time</Text>
            <TextInput
              style={styles.input}
              value={exitTime}
              onChangeText={setExitTime}
              placeholder="HH:MM"
              placeholderTextColor={C.muted}
            />
          </View>
        </View>

        <Text style={styles.label}>Break (minutes)</Text>
        <TextInput
          style={styles.input}
          value={breakMins}
          onChangeText={setBreakMins}
          placeholder="30"
          placeholderTextColor={C.muted}
          keyboardType="numeric"
        />

        <Text style={styles.label}>Notes (optional)</Text>
        <TextInput
          style={[styles.input, styles.notesInput]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Add notes..."
          placeholderTextColor={C.muted}
          multiline
          numberOfLines={3}
        />

        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitText}>Save Entry</Text>
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
  notesInput: { minHeight: 80, textAlignVertical: 'top' },
  timeRow: { flexDirection: 'row', gap: 12 },
  timeCol: { flex: 1 },
  submitButton: {
    backgroundColor: C.accent, borderRadius: 12,
    padding: 16, alignItems: 'center', marginTop: 32,
  },
  submitText: { color: C.white, fontSize: 16, fontWeight: '600' },
});
