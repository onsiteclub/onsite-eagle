/**
 * Empty/placeholder state for tabs not yet populated.
 */

import { View, Text, StyleSheet } from 'react-native';

interface EmptyStateProps {
  title: string;
  subtitle?: string;
}

export default function EmptyState({ title, subtitle }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#101828',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#667085',
    textAlign: 'center',
    lineHeight: 20,
  },
});
