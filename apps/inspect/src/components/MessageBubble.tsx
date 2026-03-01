import { View, Text, Image, StyleSheet } from 'react-native';
import { formatMessageTime, SENDER_CONFIG } from '@onsite/timeline';
import type { TimelineMessage } from '@onsite/timeline';

interface MessageBubbleProps {
  message: TimelineMessage;
  isCurrentUser: boolean;
}

export default function MessageBubble({ message, isCurrentUser }: MessageBubbleProps) {
  const sender = SENDER_CONFIG[message.sender_type] || SENDER_CONFIG.system;
  const isRight = isCurrentUser || message.sender_type === 'supervisor' || message.sender_type === 'ai';
  const isSystem = message.sender_type === 'system';

  if (isSystem) {
    return (
      <View style={styles.systemContainer}>
        <Text style={styles.systemText}>{message.content}</Text>
        <Text style={styles.systemTime}>{formatMessageTime(message.created_at)}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.row, isRight ? styles.rowRight : styles.rowLeft]}>
      {/* Avatar */}
      {!isRight && (
        <View style={[styles.avatar, { backgroundColor: sender.color + '20' }]}>
          <Text style={[styles.avatarText, { color: sender.color }]}>
            {message.sender_name.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}

      {/* Bubble */}
      <View
        style={[
          styles.bubble,
          isRight ? styles.bubbleRight : styles.bubbleLeft,
          { borderLeftColor: isRight ? 'transparent' : sender.color },
          { borderRightColor: isRight ? sender.color : 'transparent' },
        ]}
      >
        {/* Sender label */}
        <View style={styles.senderRow}>
          <Text style={[styles.senderName, { color: sender.color }]}>
            {message.sender_name}
          </Text>
          <Text style={styles.senderLabel}>{sender.label}</Text>
        </View>

        {/* Content */}
        <Text style={styles.content}>{message.content}</Text>

        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <View style={styles.attachments}>
            {message.attachments.map((att, i) =>
              att.type === 'photo' ? (
                <Image
                  key={i}
                  source={{ uri: att.thumbnail_url || att.url }}
                  style={styles.photoThumb}
                  resizeMode="cover"
                />
              ) : (
                <View key={i} style={styles.docBadge}>
                  <Text style={styles.docText}>{att.name || 'Document'}</Text>
                </View>
              ),
            )}
          </View>
        )}

        {/* AI response indicator */}
        {message.is_ai_response && (
          <View style={styles.aiBadge}>
            <Text style={styles.aiText}>AI Response</Text>
          </View>
        )}

        {/* Time */}
        <Text style={[styles.time, isRight ? styles.timeRight : styles.timeLeft]}>
          {formatMessageTime(message.created_at)}
        </Text>
      </View>

      {/* Avatar (right side) */}
      {isRight && (
        <View style={[styles.avatar, { backgroundColor: sender.color + '20' }]}>
          <Text style={[styles.avatarText, { color: sender.color }]}>
            {message.sender_name.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingHorizontal: 8,
    gap: 8,
  },
  rowLeft: {
    justifyContent: 'flex-start',
  },
  rowRight: {
    justifyContent: 'flex-end',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
  },
  bubble: {
    maxWidth: '75%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderLeftWidth: 3,
    borderRightWidth: 3,
  },
  bubbleLeft: {
    borderRightColor: 'transparent',
    borderTopLeftRadius: 4,
  },
  bubbleRight: {
    borderLeftColor: 'transparent',
    borderTopRightRadius: 4,
  },
  senderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  senderName: {
    fontSize: 13,
    fontWeight: '600',
  },
  senderLabel: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  content: {
    fontSize: 15,
    color: '#101828',
    lineHeight: 20,
  },
  attachments: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  photoThumb: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  docBadge: {
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  docText: {
    fontSize: 12,
    color: '#667085',
  },
  aiBadge: {
    marginTop: 6,
    backgroundColor: '#AF52DE15',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  aiText: {
    fontSize: 11,
    color: '#AF52DE',
    fontWeight: '500',
  },
  time: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
  },
  timeLeft: {
    textAlign: 'left',
  },
  timeRight: {
    textAlign: 'right',
  },
  // System messages
  systemContainer: {
    alignItems: 'center',
    marginVertical: 8,
    paddingHorizontal: 32,
  },
  systemText: {
    fontSize: 13,
    color: '#667085',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  systemTime: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 2,
  },
});
