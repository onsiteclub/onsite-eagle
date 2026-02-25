/**
 * Tabs Layout - OnSite Operator (Maquinista)
 *
 * 3 tabs: Pedidos (main), Reportar, Config
 * Simplified design — operator lives on Pedidos 95% of the time.
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
          title: 'Pedidos',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cube" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="report"
        options={{
          title: 'Reportar',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="warning" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="config"
        options={{
          title: 'Config',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
