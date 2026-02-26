import { Stack } from 'expo-router';

export default function LotLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#FFFFFF',
        },
        headerTintColor: '#101828',
        headerTitleStyle: {
          fontWeight: '600',
        },
        headerBackTitle: 'Back',
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Lot Details',
        }}
      />
      <Stack.Screen
        name="documents"
        options={{
          title: 'Documents',
        }}
      />
      <Stack.Screen
        name="notes"
        options={{
          title: 'Add Note',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="timeline"
        options={{
          title: 'Timeline',
        }}
      />
    </Stack>
  );
}
