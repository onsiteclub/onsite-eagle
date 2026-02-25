import { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors } from '@onsite/tokens';

interface MessageInputProps {
  disabled?: boolean;
  sending?: boolean;
  onSend: (content: string) => Promise<void> | void;
}

export function MessageInput({ disabled, sending, onSend }: MessageInputProps) {
  const [value, setValue] = useState('');

  const submit = async () => {
    const content = value.trim();
    if (!content || disabled || sending) return;
    setValue('');
    await onSend(content);
  };

  return (
    <View style={styles.wrap}>
      <TextInput
        value={value}
        onChangeText={setValue}
        placeholder="Type a message..."
        placeholderTextColor={colors.textSecondary}
        style={styles.input}
        editable={!disabled && !sending}
        multiline
      />
      <TouchableOpacity
        style={[styles.sendButton, (!value.trim() || disabled || sending) && styles.sendButtonDisabled]}
        onPress={submit}
        disabled={!value.trim() || disabled || sending}
      >
        <Text style={styles.sendText}>{sending ? '...' : 'Send'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.background,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    color: colors.text,
  },
  sendButton: {
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 13,
  },
});
