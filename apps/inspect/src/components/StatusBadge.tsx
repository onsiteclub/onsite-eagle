/**
 * Status badge for house/lot status.
 * Enterprise v3 colors matching Monitor.
 */

import { View, Text, StyleSheet } from 'react-native';
import type { HouseStatus } from '@onsite/shared';

const STATUS_COLORS: Record<HouseStatus, { bg: string; text: string }> = {
  not_started: { bg: '#F3F4F6', text: '#6B7280' },
  in_progress: { bg: '#FFF7ED', text: '#EA580C' },
  delayed: { bg: '#FEF2F2', text: '#DC2626' },
  completed: { bg: '#F0FDF4', text: '#16A34A' },
  on_hold: { bg: '#F5F3FF', text: '#7C3AED' },
};

const STATUS_LABELS: Record<HouseStatus, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  delayed: 'Delayed',
  completed: 'Completed',
  on_hold: 'On Hold',
};

interface StatusBadgeProps {
  status: HouseStatus;
  size?: 'sm' | 'md';
}

export default function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const colors = STATUS_COLORS[status] || STATUS_COLORS.not_started;
  const label = STATUS_LABELS[status] || status;
  const isMd = size === 'md';

  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }, isMd && styles.badgeMd]}>
      <Text style={[styles.text, { color: colors.text }, isMd && styles.textMd]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  badgeMd: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
  textMd: {
    fontSize: 14,
  },
});
