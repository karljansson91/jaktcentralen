import { useAuth } from '@clerk/expo';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { GlassIconButton } from '@/components/glass';
import { APP_COLORS } from '@/lib/theme';
import * as Location from 'expo-location';
import { Redirect, Stack, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';

export default function AppLayout() {
  const { isLoaded, isSignedIn, signOut } = useAuth();
  const router = useRouter();
  const getOrCreateUser = useMutation(api.users.getOrCreateCurrentUser);
  const hasSynced = useRef(false);

  async function handleSignOut() {
    try {
      await signOut();
    } catch (error) {
      Alert.alert(
        'Kunde inte logga ut',
        error instanceof Error ? error.message : 'Försök igen om en stund.'
      );
    }
  }

  const profileHeaderOptions = (title: string) => ({
    headerShown: true,
    title,
    headerLargeTitle: false,
    headerTitleAlign: 'center' as const,
    headerBackVisible: false,
    headerLeft: () => (
      <GlassIconButton
        icon="chevron-back"
        iconSize={21}
        onPress={() => router.back()}
        accessibilityLabel="Gå tillbaka"
        surfaceClassName="h-10 w-10"
      />
    ),
    headerRight: () => (
      <GlassIconButton
        icon="log-out-outline"
        iconSize={20}
        onPress={() => void handleSignOut()}
        accessibilityLabel="Logga ut"
        surfaceClassName="h-10 w-10"
      />
    ),
    headerShadowVisible: false,
    headerStyle: { backgroundColor: APP_COLORS.background },
    headerTintColor: APP_COLORS.text,
    contentStyle: { backgroundColor: APP_COLORS.background },
  });

  useEffect(() => {
    if (isSignedIn && !hasSynced.current) {
      hasSynced.current = true;
      getOrCreateUser().catch((err) => {
        console.error('Failed to sync user:', err);
        hasSynced.current = false;
      });
    }
    if (!isSignedIn) {
      hasSynced.current = false;
    }
  }, [getOrCreateUser, isSignedIn]);

  useEffect(() => {
    if (isSignedIn) {
      void Location.requestForegroundPermissionsAsync().catch((error) => {
        console.error('Failed to request location permission:', error);
      });
    }
  }, [isSignedIn]);

  if (!isLoaded) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="small" color="#2c4b31" />
      </View>
    );
  }

  if (!isSignedIn) {
    return <Redirect href="/sign-in" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen
        name="profile"
        options={profileHeaderOptions('')}
      />
      <Stack.Screen
        name="profile/add-friend"
        options={{
          presentation: 'formSheet',
          headerShown: false,
          contentStyle: { backgroundColor: APP_COLORS.background },
          sheetAllowedDetents: [0.58, 0.86],
          sheetInitialDetentIndex: 0,
          sheetGrabberVisible: true,
          sheetExpandsWhenScrolledToEdge: true,
          sheetCornerRadius: 28,
        }}
      />
      <Stack.Screen name="area/create" options={{ headerShown: false }} />
      <Stack.Screen
        name="join"
        options={{
          presentation: 'formSheet',
          headerShown: false,
          contentStyle: { backgroundColor: APP_COLORS.background },
          sheetAllowedDetents: [0.42, 0.72],
          sheetInitialDetentIndex: 0,
          sheetGrabberVisible: true,
          sheetExpandsWhenScrolledToEdge: true,
          sheetCornerRadius: 28,
        }}
      />
      <Stack.Screen name="area/[id]" />
      <Stack.Screen name="event/[eventId]" options={{ headerShown: false }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
});
