import { Stack } from 'expo-router';

export default function EventLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="chat"
        options={{
          presentation: 'modal',
          headerShown: false,
          contentStyle: { backgroundColor: '#FCF8F2' },
        }}
      />
      <Stack.Screen
        name="chat-image-viewer"
        options={{
          presentation: 'fullScreenModal',
          headerShown: false,
          contentStyle: { backgroundColor: '#000000' },
        }}
      />
      <Stack.Screen
        name="animal-sighting"
        options={{
          presentation: 'formSheet',
          headerShown: false,
          contentStyle: { backgroundColor: '#FCF8F2' },
          sheetAllowedDetents: 'fitToContents',
          sheetGrabberVisible: true,
          sheetCornerRadius: 28,
        }}
      />
      <Stack.Screen
        name="map-point-actions"
        options={{
          presentation: 'formSheet',
          headerShown: false,
          contentStyle: { backgroundColor: '#FCF8F2' },
          sheetAllowedDetents: 'fitToContents',
          sheetGrabberVisible: true,
          sheetCornerRadius: 28,
        }}
      />
      <Stack.Screen
        name="wind-direction"
        options={{
          presentation: 'formSheet',
          headerShown: false,
          contentStyle: { backgroundColor: '#FCF8F2' },
          sheetAllowedDetents: 'fitToContents',
          sheetGrabberVisible: true,
          sheetCornerRadius: 28,
        }}
      />
      <Stack.Screen
        name="sat"
        options={{
          presentation: 'modal',
          headerShown: true,
          title: 'Såt',
          headerBackVisible: false,
          headerLargeTitle: false,
          headerTitleAlign: 'center',
          headerShadowVisible: false,
          headerStyle: { backgroundColor: '#FCF8F2' },
          headerTintColor: '#313444',
          contentStyle: { backgroundColor: '#FCF8F2' },
        }}
      />
      <Stack.Screen
        name="station"
        options={{
          presentation: 'formSheet',
          headerShown: false,
          contentStyle: { backgroundColor: '#FCF8F2' },
          sheetAllowedDetents: 'fitToContents',
          sheetGrabberVisible: true,
          sheetCornerRadius: 28,
        }}
      />
      <Stack.Screen name="timeline" options={{ headerShown: false }} />
      <Stack.Screen
        name="invite"
        options={{
          presentation: 'modal',
          headerShown: true,
          title: 'Bjud in användare',
          headerLargeTitle: false,
          headerTitleAlign: 'center',
          headerShadowVisible: false,
          headerStyle: { backgroundColor: '#FCF8F2' },
          headerTintColor: '#313444',
          contentStyle: { backgroundColor: '#FCF8F2' },
        }}
      />
      <Stack.Screen
        name="members"
        options={{
          presentation: 'modal',
          headerShown: true,
          title: 'Info',
          headerBackVisible: false,
          headerLargeTitle: false,
          headerTitleAlign: 'center',
          headerShadowVisible: false,
          headerStyle: { backgroundColor: '#FCF8F2' },
          headerTintColor: '#313444',
          contentStyle: { backgroundColor: '#FCF8F2' },
        }}
      />
    </Stack>
  );
}
