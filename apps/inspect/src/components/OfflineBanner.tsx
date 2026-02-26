/**
 * Offline indicator banner — shows when device is offline.
 */

import { View, Text, StyleSheet } from 'react-native';

interface OfflineBannerProps {
  isOnline: boolean;
  queueSize: number;
}

export default function OfflineBanner({ isOnline, queueSize }: OfflineBannerProps) {
  if (isOnline && queueSize === 0) return null;

  return (
    <View style={[styles.banner, isOnline ? styles.syncing : styles.offline]}>
      <Text style={styles.text}>
        {isOnline
          ? `Syncing ${queueSize} pending items...`
          : `Offline — ${queueSize} items pending`
        }
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  offline: {
    backgroundColor: '#FEF2F2',
  },
  syncing: {
    backgroundColor: '#FFF7ED',
  },
  text: {
    fontSize: 13,
    fontWeight: '500',
    color: '#92400E',
  },
});
