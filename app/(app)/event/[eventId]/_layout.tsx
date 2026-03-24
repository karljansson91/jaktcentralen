import { Stack } from 'expo-router';

export default function EventLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="chat"
        options={{ presentation: 'modal', headerShown: false }}
      />
      <Stack.Screen
        name="members"
        options={{ presentation: 'modal', headerShown: true, title: 'Deltagare' }}
      />
    </Stack>
  );
}
