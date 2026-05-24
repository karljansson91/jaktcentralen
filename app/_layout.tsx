import '@/global.css';

import { ClerkProvider, useAuth } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import { ConvexProviderWithClerk } from 'convex/react-clerk';
import { ConvexReactClient } from 'convex/react';
import Mapbox from '@rnmapbox/maps';
import { useColorScheme } from 'nativewind';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? '');

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? '';
const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL ?? '';

if (!publishableKey) {
  throw new Error('Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY. Add it to your .env file.');
}

if (!convexUrl) {
  throw new Error('Missing EXPO_PUBLIC_CONVEX_URL. Add it to your .env file.');
}

const convex = new ConvexReactClient(convexUrl);

function LightModeLock() {
  const { colorScheme, setColorScheme } = useColorScheme();

  useEffect(() => {
    if (colorScheme !== 'light') {
      setColorScheme('light');
    }
  }, [colorScheme, setColorScheme]);

  return null;
}

export default function RootLayout() {
  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <LightModeLock />
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }} />
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
