import { View, Text, StyleSheet } from 'react-native';
import { formatDateDivider } from '@onsite/timeline';

interface DateDividerProps {
  date: string;
}

export default function DateDivider({ date }: DateDividerProps) {
  return (
    <View style={styles.container}>
      <View style={styles.line} />
      <View style={styles.pill}>
        <Text style={styles.text}>{formatDateDivider(date)}</Text>
      </View>
      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    paddingHorizontal: 16,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  pill: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginHorizontal: 8,
  },
  text: {
    fontSize: 12,
    fontWeight: '500',
    color: '#667085',
  },
});
