import { Stack } from 'expo-router';
import { colors } from '../../../src/constants/colors';

export default function LotLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.surface,
        },
        headerTintColor: colors.text,
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
    </Stack>
  );
}
