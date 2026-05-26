import { APP_COLORS } from '@/lib/theme';
import { Stack } from 'expo-router';

export default function AreaLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="events"
        options={{
          presentation: 'modal',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="edit"
        options={{
          presentation: 'modal',
          headerShown: true,
          title: 'Uppdatera info',
          headerLargeTitle: false,
          headerTitleAlign: 'center',
          headerShadowVisible: false,
          headerStyle: { backgroundColor: APP_COLORS.background },
          headerTintColor: APP_COLORS.text,
          contentStyle: { backgroundColor: APP_COLORS.background },
        }}
      />
      <Stack.Screen
        name="redraw"
        options={{
          presentation: 'fullScreenModal',
          headerShown: false,
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="marker-sheet"
        options={{
          presentation: 'formSheet',
          headerShown: false,
          contentStyle: { backgroundColor: APP_COLORS.background },
          sheetAllowedDetents: 'fitToContents',
          sheetGrabberVisible: true,
          sheetCornerRadius: 28,
        }}
      />
      <Stack.Screen
        name="marker"
        options={{
          presentation: 'modal',
          headerShown: true,
          headerBackVisible: false,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: APP_COLORS.background },
          contentStyle: { backgroundColor: APP_COLORS.background },
        }}
      />
      <Stack.Screen
        name="marker-geometry"
        options={{
          presentation: 'modal',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="event/create"
        options={{
          presentation: 'fullScreenModal',
          headerShown: true,
          title: 'Skapa jakt',
          headerLargeTitle: false,
          headerTitleAlign: 'center',
          headerShadowVisible: false,
          headerStyle: { backgroundColor: APP_COLORS.background },
          headerTintColor: APP_COLORS.text,
          contentStyle: { backgroundColor: APP_COLORS.background },
        }}
      />
    </Stack>
  );
}
