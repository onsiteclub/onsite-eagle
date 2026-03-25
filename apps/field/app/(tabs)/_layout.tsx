/**
 * Tabs Layout - EagleField
 *
 * 4 tabs: Sites (main), Schedule, Tasks, Materials
 * Config hidden from tab bar but accessible via route.
 * Enterprise v3 theme.
 */

import { Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  tabBar: '#FFFFFF',
  tabBarBorder: '#E5E7EB',
  active: '#0F766E',
  inactive: '#9CA3AF',
};

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.tabBar,
          borderTopColor: COLORS.tabBarBorder,
          borderTopWidth: 1,
          height: Platform.OS === 'android' ? 64 : 84,
          paddingBottom: Platform.OS === 'android' ? 8 : 24,
          paddingTop: 8,
        },
        tabBarActiveTintColor: COLORS.active,
        tabBarInactiveTintColor: COLORS.inactive,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Sites',
          tabBarIcon: ({ color }: { color: string }) => (
            <Ionicons name="home" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: 'Schedule',
          tabBarIcon: ({ color }: { color: string }) => (
            <Ionicons name="calendar" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: 'Tasks',
          tabBarIcon: ({ color }: { color: string }) => (
            <Ionicons name="clipboard" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="materials"
        options={{
          title: 'Materials',
          tabBarIcon: ({ color }: { color: string }) => (
            <Ionicons name="cube" size={24} color={color} />
          ),
        }}
      />
      {/* Hidden tabs - accessible via router.push but not in tab bar */}
      <Tabs.Screen
        name="config"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="agenda"
        options={{ href: null }}
      />
    </Tabs>
  );
}
