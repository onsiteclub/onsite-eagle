import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Pressable,
} from 'react-native';
import { EVENT_TYPE_CONFIG } from '@onsite/timeline';
import type { TimelineEventType } from '@onsite/timeline';

interface EventTypePickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (eventType: TimelineEventType, label: string) => void;
}

const INSPECTOR_EVENTS: TimelineEventType[] = [
  'inspection',
  'issue',
  'note',
  'status_change',
  'alert',
  'photo',
  'milestone',
  'material_issue',
];

export default function EventTypePicker({ visible, onClose, onSelect }: EventTypePickerProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Add Event</Text>

          <View style={styles.grid}>
            {INSPECTOR_EVENTS.map((type) => {
              const config = EVENT_TYPE_CONFIG[type];
              return (
                <TouchableOpacity
                  key={type}
                  style={styles.item}
                  onPress={() => onSelect(type, config.label)}
                >
                  <View style={[styles.iconCircle, { backgroundColor: config.color + '15' }]}>
                    <Text style={[styles.iconText, { color: config.color }]}>
                      {getEmoji(type)}
                    </Text>
                  </View>
                  <Text style={styles.label}>{config.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
}

function getEmoji(type: TimelineEventType): string {
  const map: Partial<Record<TimelineEventType, string>> = {
    inspection: '🔍',
    issue: '⚠️',
    note: '📝',
    status_change: '🔄',
    alert: '🚨',
    photo: '📸',
    milestone: '🏁',
    material_issue: '📦',
  };
  return map[type] || '📌';
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 32,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#101828',
    textAlign: 'center',
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  item: {
    width: 76,
    alignItems: 'center',
    gap: 6,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 22,
  },
  label: {
    fontSize: 11,
    color: '#374151',
    textAlign: 'center',
    fontWeight: '500',
  },
  cancelBtn: {
    marginTop: 20,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    color: '#667085',
    fontWeight: '500',
  },
});
