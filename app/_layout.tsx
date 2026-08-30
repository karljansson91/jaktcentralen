import '@/global.css';

import { IssueReportGesture } from '@/components/issues/issue-report-gesture';
import { STARTUP_BACKGROUND_COLOR, StartupScreen } from '@/components/startup-screen';
import { useNotificationResponseRouting } from '@/hooks/use-push-notifications';
import { ClerkProvider, useAuth } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import { ConvexProviderWithClerk } from 'convex/react-clerk';
import { ConvexReactClient } from 'convex/react';
import Mapbox from '@rnmapbox/maps';
import { useColorScheme } from 'nativewind';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_PUBLISHABLE_KEY ?? '');

void SplashScreen.preventAutoHideAsync().catch((error) => {
  console.error('Failed to keep the native splash screen visible:', error);
});

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? '';
const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL ?? '';

const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;
let hasHiddenNativeSplash = false;

function hideNativeSplash() {
  if (hasHiddenNativeSplash) {
    return;
  }

  hasHiddenNativeSplash = true;
  void SplashScreen.hideAsync().catch((error) => {
    console.error('Failed to hide the native splash screen:', error);
    hasHiddenNativeSplash = false;
  });
}

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

  return (
    <IssueReportGesture enabled={isLoaded && Boolean(isSignedIn)}>{children}</IssueReportGesture>
  );
}

function AppBootstrap() {
  const { isLoaded } = useAuth();

  if (!isLoaded) {
    return <StartupScreen onReady={hideNativeSplash} />;
  }

  return (
    <View style={styles.app} onLayout={hideNativeSplash}>
      <KeyboardProvider>
        <NotificationResponseRouting />
        <LightModeLock />
        <StatusBar style="dark" />
        <IssueReportGestureBoundary>
          <Stack screenOptions={{ headerShown: false }} />
        </IssueReportGestureBoundary>
      </KeyboardProvider>
    </View>
  );
}

export default function RootLayout() {
  if (!publishableKey || !convex) {
    return (
      <GestureHandlerRootView style={styles.root}>
        <StartupScreen
          errorMessage="Appen saknar nödvändig konfiguration och kan inte starta."
          onReady={hideNativeSplash}
        />
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
        <ConvexProviderWithClerk client={convex} useAuth={useClerkAuthBridge}>
          <AppBootstrap />
        </ConvexProviderWithClerk>
      </ClerkProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: STARTUP_BACKGROUND_COLOR,
  },
  app: {
    flex: 1,
    backgroundColor: STARTUP_BACKGROUND_COLOR,
  },
});
