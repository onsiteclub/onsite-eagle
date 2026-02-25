/**
 * Share QR Screen - Placeholder
 * Backend integration (QR generation, sharing) will be added later.
 */

import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const C = { bg: '#F6F7F9', card: '#FFFFFF', border: '#E5E7EB', text: '#101828', muted: '#667085', accent: '#0F766E' };

export default function ShareQRScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="close" size={24} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Share QR Code</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Ionicons name="qr-code-outline" size={48} color={C.accent} />
        </View>
        <Text style={styles.title}>Share Your Hours</Text>
        <Text style={styles.subtitle}>
          QR code sharing will let you share your hours with your manager instantly.
        </Text>
        <Text style={styles.hint}>Coming soon — QR generation in progress</Text>
      </View>
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
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  iconCircle: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: C.card, borderWidth: 2, borderColor: C.accent,
    justifyContent: 'center', alignItems: 'center', marginBottom: 24,
  },
  title: { fontSize: 22, fontWeight: '700', color: C.text, marginBottom: 8 },
  subtitle: { fontSize: 14, color: C.muted, textAlign: 'center', lineHeight: 20, marginBottom: 16 },
  hint: { fontSize: 12, color: C.accent, fontWeight: '500' },
});
