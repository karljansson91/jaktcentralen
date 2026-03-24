import { useAuth } from '@clerk/expo';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import * as Location from 'expo-location';
import { Redirect, Stack } from 'expo-router';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

export default function AppLayout() {
  const { isLoaded, isSignedIn } = useAuth();
  const getOrCreateUser = useMutation(api.users.getOrCreateCurrentUser);
  const hasSynced = useRef(false);

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
      <Stack.Screen name="area/create" options={{ headerShown: false }} />
      <Stack.Screen name="join" options={{ presentation: 'modal', headerShown: false }} />
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
