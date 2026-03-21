import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useSSO, type StartSSOFlowParams } from '@clerk/expo';
import * as WebBrowser from 'expo-web-browser';
import { useColorScheme } from 'nativewind';
import * as React from 'react';
import { Alert, Image, Platform, View, type ImageSourcePropType } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

type SocialConnectionStrategy = Extract<
  StartSSOFlowParams['strategy'],
  'oauth_google' | 'oauth_github' | 'oauth_apple'
>;

const SOCIAL_CONNECTION_STRATEGIES: {
  type: SocialConnectionStrategy;
  source: ImageSourcePropType;
  useTint?: boolean;
  label: string;
}[] = [
  {
    type: 'oauth_apple',
    source: { uri: 'https://img.clerk.com/static/apple.png?width=160' },
    useTint: true,
    label: 'Apple',
  },
  {
    type: 'oauth_google',
    source: { uri: 'https://img.clerk.com/static/google.png?width=160' },
    useTint: false,
    label: 'Google',
  },
];

export function SocialConnections() {
  useWarmUpBrowser();
  const { colorScheme } = useColorScheme();
  const { startSSOFlow } = useSSO();
  const [loading, setLoading] = React.useState(false);

  function onSocialLoginPress(strategy: SocialConnectionStrategy, label: string) {
    return async () => {
      setLoading(true);

      try {
        const result = await startSSOFlow({ strategy });

        if (result.createdSessionId && result.setActive) {
          await result.setActive({ session: result.createdSessionId });
          return;
        }

        Alert.alert('Inloggning misslyckades', `${label}-inloggning kunde inte slutföras.`);
      } catch (error) {
        console.error('Social login error:', JSON.stringify(error, null, 2));

        const message =
          typeof error === 'object' && error && 'message' in error
            ? String((error as { message?: string }).message)
            : typeof error === 'object' && error && 'errors' in error
              ? (error as { errors?: { message?: string }[] }).errors?.[0]?.message
              : undefined;

        Alert.alert(
          'Inloggning misslyckades',
          message || `Ett fel uppstod vid ${label}-inloggning. Försök igen.`,
        );
      } finally {
        setLoading(false);
      }
    };
  }

  return (
    <View className="gap-2 sm:flex-row sm:gap-3">
      {SOCIAL_CONNECTION_STRATEGIES.map((strategy) => (
        <Button
          key={strategy.type}
          variant="outline"
          size="sm"
          className="sm:flex-1"
          disabled={loading}
          onPress={onSocialLoginPress(strategy.type, strategy.label)}>
          <Image
            className={cn('size-4', strategy.useTint && Platform.select({ web: 'dark:invert' }))}
            tintColor={Platform.select({
              native: strategy.useTint ? (colorScheme === 'dark' ? 'white' : 'black') : undefined,
            })}
            source={strategy.source}
          />
        </Button>
      ))}
    </View>
  );
}

function useWarmUpBrowser() {
  React.useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }

    void WebBrowser.warmUpAsync();

    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);
}
