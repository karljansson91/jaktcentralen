import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';

export const STARTUP_BACKGROUND_COLOR = '#398048';

const STARTUP_TIMEOUT_MS = 15_000;
const CONNECTION_ERROR_MESSAGE =
  'Kunde inte starta appen. Kontrollera anslutningen och försök igen.';

type StartupScreenProps = {
  errorMessage?: string;
  onReady?: (event: LayoutChangeEvent) => void;
};

export function StartupScreen({ errorMessage, onReady }: StartupScreenProps) {
  const [retryCount, setRetryCount] = useState(0);
  const [hasTimedOut, setHasTimedOut] = useState(false);

  useEffect(() => {
    if (errorMessage) {
      return;
    }

    const timeout = setTimeout(() => {
      setHasTimedOut(true);
    }, STARTUP_TIMEOUT_MS);

    return () => clearTimeout(timeout);
  }, [errorMessage, retryCount]);

  const visibleError = errorMessage ?? (hasTimedOut ? CONNECTION_ERROR_MESSAGE : undefined);

  function handleRetry() {
    setHasTimedOut(false);
    setRetryCount((current) => current + 1);
  }

  return (
    <View style={styles.screen} onLayout={onReady}>
      <StatusBar style="light" />
      <Image
        source={require('../assets/images/splash-icon.png')}
        style={styles.logo}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />

      {visibleError ? (
        <View style={styles.errorContainer} accessibilityLiveRegion="polite">
          <Text style={styles.errorText}>{visibleError}</Text>
          {!errorMessage ? (
            <Pressable
              accessibilityRole="button"
              onPress={handleRetry}
              style={({ pressed }) => [styles.retryButton, pressed && styles.retryButtonPressed]}
            >
              <Text style={styles.retryButtonText}>Försök igen</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: STARTUP_BACKGROUND_COLOR,
  },
  logo: {
    width: 200,
    height: 200,
  },
  errorContainer: {
    position: 'absolute',
    right: 32,
    bottom: 48,
    left: 32,
    alignItems: 'center',
    gap: 16,
  },
  errorText: {
    maxWidth: 320,
    color: '#ffffff',
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
  },
  retryButton: {
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#ffffff',
    paddingHorizontal: 22,
  },
  retryButtonPressed: {
    opacity: 0.82,
  },
  retryButtonText: {
    color: '#274f32',
    fontSize: 15,
    fontWeight: '600',
  },
});
