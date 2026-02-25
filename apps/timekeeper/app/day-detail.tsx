/**
 * Day Detail Screen - Placeholder
 * Backend integration (SQLite queries) will be added later.
 */

import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors } from '@onsite/tokens';

const C = { bg: colors.background, card: colors.card, border: colors.border, text: colors.text, muted: colors.textMuted, accent: colors.accent, primary: colors.primary, white: colors.white };

export default function DayDetailScreen() {
  const router = useRouter();
  const { date } = useLocalSearchParams<{ date: string }>();

  const dateDisplay = date
    ? new Date(date + 'T12:00:00').toLocaleDateString('en-CA', {
        weekday: 'long', month: 'long', day: 'numeric',
      })
    : 'Day Detail';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={C.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{dateDisplay}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.emptyCard}>
          <Ionicons name="calendar-outline" size={32} color={C.muted} />
          <Text style={styles.emptyTitle}>No sessions yet</Text>
          <Text style={styles.emptyText}>
            Sessions for this day will appear here once backend is connected.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  backButton: { padding: 4 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '600', color: C.text },
  scroll: { padding: 16, paddingBottom: 40 },
  emptyCard: {
    backgroundColor: C.card, borderRadius: 12,
    padding: 32, alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: C.border, marginTop: 32,
  },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: C.text },
  emptyText: { fontSize: 13, color: C.muted, textAlign: 'center' },
});
