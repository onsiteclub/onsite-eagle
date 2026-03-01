/**
 * Team — Site-level team members view.
 */
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TeamScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { siteId } = useLocalSearchParams<{ siteId?: string }>();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Team</Text>
        <View style={{ width: 60 }} />
      </View>
      <View style={styles.content}>
        <Text style={styles.emoji}>👥</Text>
        <Text style={styles.heading}>Site Team</Text>
        <Text style={styles.subtitle}>
          Workers, supervisors and their assignments for this site will appear here.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F7F9' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  backBtn: { width: 60 },
  backText: { fontSize: 16, color: '#0F766E', fontWeight: '500' },
  title: { fontSize: 18, fontWeight: '700', color: '#101828' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emoji: { fontSize: 48, marginBottom: 16 },
  heading: { fontSize: 20, fontWeight: '600', color: '#101828', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#667085', textAlign: 'center', lineHeight: 22 },
});
