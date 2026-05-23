import { Stack } from 'expo-router';

export default function EventLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="chat"
        options={{
          presentation: 'formSheet',
          headerShown: false,
          contentStyle: { backgroundColor: '#FCF8F2' },
          sheetAllowedDetents: [0.32, 0.72, 0.94],
          sheetInitialDetentIndex: 0,
          sheetGrabberVisible: true,
          sheetExpandsWhenScrolledToEdge: true,
          sheetLargestUndimmedDetentIndex: 'none',
        }}
      />
      <Stack.Screen
        name="actions"
        options={{
          presentation: 'formSheet',
          headerShown: false,
          contentStyle: { backgroundColor: '#FCF8F2' },
          sheetAllowedDetents: 'fitToContents',
          sheetGrabberVisible: true,
        }}
      />
      <Stack.Screen
        name="invite"
        options={{
          presentation: 'formSheet',
          headerShown: false,
          contentStyle: { backgroundColor: '#FCF8F2' },
          sheetAllowedDetents: [0.5, 0.86],
          sheetInitialDetentIndex: 0,
          sheetGrabberVisible: true,
          sheetExpandsWhenScrolledToEdge: true,
        }}
      />
      <Stack.Screen
        name="members"
        options={{ presentation: 'modal', headerShown: true, title: 'Deltagare' }}
      />
    </Stack>
  );
}
