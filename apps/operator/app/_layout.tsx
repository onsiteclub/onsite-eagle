import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
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
          name="index"
          options={{
            title: 'Operator Dashboard',
          }}
        />
        <Stack.Screen
          name="requests/index"
          options={{
            title: 'Material Requests',
          }}
        />
        <Stack.Screen
          name="requests/[id]"
          options={{
            title: 'Request Details',
          }}
        />
        <Stack.Screen
          name="deliver/[id]"
          options={{
            title: 'Confirm Delivery',
          }}
        />
        <Stack.Screen
          name="profile"
          options={{
            title: 'My Profile',
          }}
        />
      </Stack>
    </SafeAreaProvider>
  );
}
