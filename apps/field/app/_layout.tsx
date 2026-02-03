import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: '#1F2937',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen
          name="(tabs)"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="lot/[id]"
          options={{
            title: 'Lot Details',
          }}
        />
        <Stack.Screen
          name="camera"
          options={{
            title: 'Take Photo',
            presentation: 'modal',
          }}
        />
      </Stack>
    </>
  );
}
