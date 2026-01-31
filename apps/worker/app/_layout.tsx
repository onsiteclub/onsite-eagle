import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: '#059669',
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
          name="house/[id]"
          options={{
            title: 'Casa',
          }}
        />
        <Stack.Screen
          name="camera"
          options={{
            title: 'Tirar Foto',
            presentation: 'modal',
          }}
        />
      </Stack>
    </>
  );
}
