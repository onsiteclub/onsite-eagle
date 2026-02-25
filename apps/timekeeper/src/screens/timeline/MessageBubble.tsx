import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@onsite/tokens';
import { formatMessageTime } from '@onsite/timeline/data';
import { SENDER_CONFIG } from '@onsite/timeline/constants';
import type { TimelineMessage } from '@onsite/timeline';

interface MessageBubbleProps {
  message: TimelineMessage;
  isOwn: boolean;
}

export function MessageBubble({ message, isOwn }: MessageBubbleProps) {
  const cfg = SENDER_CONFIG[message.sender_type] || SENDER_CONFIG.system;

  return (
    <View style={[styles.row, isOwn ? styles.rowOwn : styles.rowOther]}>
      <View
        style={[
          styles.bubble,
          isOwn ? styles.ownBubble : styles.otherBubble,
          !isOwn && { borderLeftColor: cfg.color },
        ]}
      >
        {!isOwn ? (
          <Text style={[styles.sender, { color: cfg.color }]}>{message.sender_name || cfg.label}</Text>
        ) : null}
        <Text style={[styles.content, isOwn && styles.contentOwn]}>{message.content}</Text>
        <Text style={[styles.time, isOwn && styles.timeOwn]}>{formatMessageTime(message.created_at)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    width: '100%',
    marginBottom: 8,
    paddingHorizontal: 12,
  },
  rowOwn: {
    alignItems: 'flex-end',
  },
  rowOther: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '84%',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
  },
  ownBubble: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  otherBubble: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderLeftWidth: 3,
  },
  sender: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  content: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  contentOwn: {
    color: colors.white,
  },
  time: {
    marginTop: 4,
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'right',
  },
  timeOwn: {
    color: 'rgba(255,255,255,0.85)',
  },
});
