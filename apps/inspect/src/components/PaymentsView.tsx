/**
 * Payments view — payment status per lot/phase.
 */

import { View, Text, StyleSheet } from 'react-native';
import type { House } from '@onsite/shared';
import EmptyState from './EmptyState';

interface PaymentsViewProps {
  siteId: string;
  houses: House[];
}

export default function PaymentsView({ siteId, houses }: PaymentsViewProps) {
  // Payments are managed primarily from Monitor web app.
  // This view shows a summary per lot.

  if (houses.length === 0) {
    return (
      <EmptyState
        title="No payment data"
        subtitle="Payment tracking will be available when lots have schedules with phase rates."
      />
    );
  }

  return (
    <View style={styles.container}>
      <EmptyState
        title="Payments"
        subtitle="Payment tracking per lot/phase will be available soon. Use the Monitor web app for full payment management."
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
