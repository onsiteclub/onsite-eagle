import { Stack } from 'expo-router';

export default function LotLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#1F2937',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: '600',
        },
        headerBackTitle: 'Back',
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
    </Stack>
  );
}
