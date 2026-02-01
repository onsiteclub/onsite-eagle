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
          name="index"
          options={{
            title: 'OnSite Eagle',
          }}
        />
        <Stack.Screen
          name="camera"
          options={{
            title: 'Take Photo',
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="house/[id]"
          options={{
            title: 'House Details',
          }}
        />
        <Stack.Screen
          name="site/[id]"
          options={{
            title: 'Jobsite',
          }}
        />
        <Stack.Screen
          name="site/new"
          options={{
            title: 'Novo Jobsite',
            presentation: 'modal',
          }}
        />
      </Stack>
    </>
  );
}
