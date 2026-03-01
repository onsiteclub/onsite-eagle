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
      <Stack.Screen name="site/[id]" />
      <Stack.Screen name="lot/[lotId]" />
      <Stack.Screen name="agenda" />
      <Stack.Screen name="team" />
      <Stack.Screen name="site-timeline" />
      <Stack.Screen name="documents" />
      <Stack.Screen name="gate-check/[lotId]" />
      <Stack.Screen name="gate-check/checklist" />
      <Stack.Screen name="gate-check/summary" />
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
