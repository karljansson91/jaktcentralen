import '@/global.css';

import { IssueReportGesture } from '@/components/issues/issue-report-gesture';
import { useNotificationResponseRouting } from '@/hooks/use-push-notifications';
import { ClerkProvider, useAuth } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import { ConvexProviderWithClerk } from 'convex/react-clerk';
import { ConvexReactClient } from 'convex/react';
import Mapbox from '@rnmapbox/maps';
import { useColorScheme } from 'nativewind';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, type ReactNode } from 'react';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

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

function useClerkAuthBridge() {
  return useAuth();
}

function LightModeLock() {
  const { colorScheme, setColorScheme } = useColorScheme();

  useEffect(() => {
    if (colorScheme !== 'light') {
      setColorScheme('light');
    }
  }, [colorScheme, setColorScheme]);

  return null;
}

function NotificationResponseRouting() {
  useNotificationResponseRouting();
  return null;
}

function IssueReportGestureBoundary({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();

  return <IssueReportGesture enabled={isLoaded && Boolean(isSignedIn)}>{children}</IssueReportGesture>;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
        <ConvexProviderWithClerk client={convex} useAuth={useClerkAuthBridge}>
          <KeyboardProvider>
            <NotificationResponseRouting />
            <LightModeLock />
            <StatusBar style="dark" />
            <IssueReportGestureBoundary>
              <Stack screenOptions={{ headerShown: false }} />
            </IssueReportGestureBoundary>
          </KeyboardProvider>
        </ConvexProviderWithClerk>
      </ClerkProvider>
    </GestureHandlerRootView>
  );
}
