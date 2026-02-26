import { Stack } from 'expo-router';

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#F6F7F9' },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="site-new" />
      <Stack.Screen name="site/[id]" />
      <Stack.Screen
        name="lot/[lotId]"
        options={{
          headerShown: true,
          title: 'Lot Detail',
          headerStyle: { backgroundColor: '#FFFFFF' },
          headerTintColor: '#101828',
          headerTitleStyle: { fontWeight: '600' },
        }}
      />
      <Stack.Screen
        name="camera"
        options={{
          headerShown: false,
          presentation: 'fullScreenModal',
        }}
      />
      <Stack.Screen
        name="settings"
        options={{
          headerShown: true,
          title: 'Settings',
          headerStyle: { backgroundColor: '#FFFFFF' },
          headerTintColor: '#101828',
          headerTitleStyle: { fontWeight: '600' },
        }}
      />
    </Stack>
  );
}
