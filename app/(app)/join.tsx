import { Button, Input, Label, Text } from '@/components/ui';
import { api } from '@/convex/_generated/api';
import { formatJoinCodeInput, validateJoinCode } from '@/lib/join-code';
import { useMutation } from 'convex/react';
import { useRouter } from 'expo-router';
import { useForm } from '@tanstack/react-form';
import { useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function JoinEventScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const joinByCode = useMutation(api.events.joinByCode);

  const form = useForm({
    defaultValues: { joinCode: '' },
    onSubmit: async ({ value }) => {
      const joinCodeError = validateJoinCode(value.joinCode);
      if (joinCodeError) {
        Alert.alert('Kunde inte gå med', joinCodeError);
        return;
      }

      setIsSubmitting(true);
      try {
        const eventId = await joinByCode({ joinCode: value.joinCode.trim() });
        router.back();
        setTimeout(() => router.push(`/event/${eventId}`), 100);
      } catch (e: any) {
        Alert.alert('Kunde inte gå med', e.message ?? 'Ogiltig kod');
      } finally {
        setIsSubmitting(false);
      }
    },
  });

  return (
    <View
      className="flex-1 bg-background"
      collapsable={false}
      style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
      <ScrollView
        className="min-h-0 flex-1"
        contentContainerClassName="gap-5 px-5 pb-5 pt-5"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        collapsable={false}>
        <View className="gap-2" collapsable={false}>
          <Text className="text-[26px] font-semibold leading-[32px] text-foreground">
            Gå med i jakt
          </Text>
          <Text className="text-sm leading-5 text-muted-foreground">
            Ange jaktkoden du fått från jaktledaren.
          </Text>
        </View>

        <form.Field
          name="joinCode"
          validators={{
            onSubmit: ({ value }) => validateJoinCode(value),
          }}>
          {(field) => (
            <View className="gap-1.5">
              <Label nativeID="joinCode">Jaktkod</Label>
              <Input
                aria-labelledby="joinCode"
                placeholder="t.ex. algjakt2026"
                value={field.state.value}
                onChangeText={(value) => field.handleChange(formatJoinCodeInput(value))}
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
                className="h-12 rounded-xl bg-card"
                returnKeyType="go"
                onSubmitEditing={() => {
                  if (!isSubmitting && field.state.value.trim()) {
                    void form.handleSubmit();
                  }
                }}
              />
              {field.state.meta.errors.length > 0 && (
                <Text className="text-sm text-destructive">
                  {field.state.meta.errors[0]}
                </Text>
              )}
            </View>
          )}
        </form.Field>

        <form.Subscribe selector={(s) => s.values.joinCode}>
          {(joinCode) => (
            <Button
              size="xl"
              onPress={form.handleSubmit}
              disabled={!joinCode.trim() || isSubmitting}
              className="rounded-2xl">
              <Text>{isSubmitting ? 'Går med...' : 'Gå med'}</Text>
            </Button>
          )}
        </form.Subscribe>
      </ScrollView>
    </View>
  );
}
