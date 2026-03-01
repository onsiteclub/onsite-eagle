import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { PHASE_COLORS } from '@onsite/timeline';
import StatusBadge from './StatusBadge';
import type { House, HouseStatus } from '@onsite/shared';

const ACCENT = '#0F766E';

interface LotHeaderProps {
  house: House;
  onBackPress: () => void;
}

export default function LotHeader({ house, onBackPress }: LotHeaderProps) {
  const phase = house.current_phase || 1;
  const phaseInfo = PHASE_COLORS[phase] || PHASE_COLORS[1];
  const progress = Math.round(house.progress_percentage || 0);

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {/* Back */}
        <TouchableOpacity onPress={onBackPress} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>

        {/* Center info */}
        <View style={styles.center}>
          <Text style={styles.title} numberOfLines={1}>Lot {house.lot_number}</Text>
          {house.address && (
            <Text style={styles.subtitle} numberOfLines={1}>{house.address}</Text>
          )}
        </View>

        {/* Right: status + phase */}
        <View style={styles.right}>
          <StatusBadge status={(house.status as HouseStatus) || 'not_started'} size="sm" />
          <View style={[styles.phasePill, { backgroundColor: phaseInfo.bg, borderColor: phaseInfo.border }]}>
            <Text style={styles.phaseText}>P{phase}</Text>
          </View>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  backBtn: {
    paddingRight: 4,
  },
  backText: {
    fontSize: 22,
    color: ACCENT,
    fontWeight: '500',
  },
  center: {
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#101828',
  },
  subtitle: {
    fontSize: 12,
    color: '#667085',
    marginTop: 1,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  phasePill: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  phaseText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  progressBar: {
    height: 3,
    backgroundColor: '#E5E7EB',
  },
  progressFill: {
    height: '100%',
    backgroundColor: ACCENT,
  },
});
