/**
 * Tabs Layout - OnSite Field
 *
 * 3 tabs: My Lots (main), Agenda, Settings
 * Enterprise v3 theme — identical to Operator.
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
          title: 'My Lots',
          tabBarIcon: ({ color }: { color: string }) => (
            <Ionicons name="home" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="agenda"
        options={{
          title: 'Agenda',
          tabBarIcon: ({ color }: { color: string }) => (
            <Ionicons name="calendar" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="config"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }: { color: string }) => (
            <Ionicons name="settings" size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
