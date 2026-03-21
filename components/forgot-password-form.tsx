import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { useSignIn } from '@clerk/expo/legacy';
import { router, useLocalSearchParams } from 'expo-router';
import * as React from 'react';
import { View } from 'react-native';

export function ForgotPasswordForm() {
  const { email: emailParam = '' } = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = React.useState(emailParam);
  const { signIn, isLoaded } = useSignIn();
  const [error, setError] = React.useState<{ email?: string }>({});

  const onSubmit = async () => {
    if (!email) {
      setError({ email: 'E-post krävs' });
      return;
    }

    if (!isLoaded) {
      return;
    }

    try {
      await signIn.create({
        strategy: 'reset_password_email_code',
        identifier: email,
      });

      router.push(`/(auth)/reset-password?email=${email}`);
    } catch (err) {
      if (err instanceof Error) {
        setError({ email: err.message });
        return;
      }

      console.error(JSON.stringify(err, null, 2));
    }
  };

  return (
    <View className="gap-6">
      <Card className="border-border/0 shadow-none sm:border-border sm:shadow-sm sm:shadow-black/5">
        <CardHeader>
          <CardTitle className="text-center text-xl sm:text-left">Glömt lösenord?</CardTitle>
          <CardDescription className="text-center sm:text-left">
            Ange din e-post för att återställa lösenordet.
          </CardDescription>
        </CardHeader>
        <CardContent className="gap-6">
          <View className="gap-6">
            <View className="gap-1.5">
              <Label htmlFor="email">E-post</Label>
              <Input
                id="email"
                defaultValue={email}
                placeholder="m@example.com"
                keyboardType="email-address"
                autoComplete="email"
                autoCapitalize="none"
                onChangeText={setEmail}
                onSubmitEditing={onSubmit}
                returnKeyType="send"
              />
              {error.email ? (
                <Text className="text-sm font-medium text-destructive">{error.email}</Text>
              ) : null}
            </View>

            <Button className="w-full" onPress={onSubmit}>
              <Text>Återställ lösenord</Text>
            </Button>
          </View>
        </CardContent>
      </Card>
    </View>
  );
}
