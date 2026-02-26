/**
 * Horizontal scrollable tab bar for site detail.
 * Responsive: tablet shows all tabs, phone scrolls horizontally.
 */

import { ScrollView, TouchableOpacity, Text, StyleSheet, View } from 'react-native';

export type ViewType = 'lots' | 'schedule' | 'gantt' | 'chat' | 'team' | 'documents' | 'payments' | 'reports';

interface Tab {
  id: ViewType;
  label: string;
}

const TABS: Tab[] = [
  { id: 'lots', label: 'Lots' },
  { id: 'schedule', label: 'Schedule' },
  { id: 'gantt', label: 'Gantt' },
  { id: 'chat', label: 'Chat' },
  { id: 'team', label: 'Team' },
  { id: 'documents', label: 'Docs' },
  { id: 'payments', label: 'Payments' },
  { id: 'reports', label: 'Reports' },
];

interface TabBarProps {
  activeView: ViewType;
  onChangeView: (view: ViewType) => void;
}

export default function TabBar({ activeView, onChangeView }: TabBarProps) {
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {TABS.map((tab) => {
          const isActive = tab.id === activeView;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => onChangeView(tab.id)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 4,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#0F766E',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#667085',
  },
  tabTextActive: {
    color: '#0F766E',
    fontWeight: '600',
  },
});
