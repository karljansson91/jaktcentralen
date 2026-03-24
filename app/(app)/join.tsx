import { Button, IconButton, Input, Label, Text } from '@/components/ui';
import { api } from '@/convex/_generated/api';
import { useMutation } from 'convex/react';
import { useRouter } from 'expo-router';
import { useForm } from '@tanstack/react-form';
import { Alert, KeyboardAvoidingView, Platform, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function JoinEventScreen() {
  const router = useRouter();
  const joinByCode = useMutation(api.events.joinByCode);

  const form = useForm({
    defaultValues: { joinCode: '' },
    onSubmit: async ({ value }) => {
      try {
        const eventId = await joinByCode({ joinCode: value.joinCode.trim().toLowerCase() });
        router.back();
        setTimeout(() => router.push(`/event/${eventId}`), 100);
      } catch (e: any) {
        Alert.alert('Kunde inte gå med', e.message ?? 'Ogiltig kod');
      }
    },
  });

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View className="flex-row items-center gap-3 border-b border-border px-4 pb-3 pt-14">
        <IconButton variant="ghost" size="sm" onPress={() => router.back()}>
          <Ionicons name="close" size={24} color="#374151" />
        </IconButton>
        <Text className="flex-1 text-lg font-semibold">Gå med i en jakt</Text>
      </View>

      <View className="p-6 gap-4">
        <Text className="text-muted-foreground">
          Ange koden du fått från jaktledaren för att gå med.
        </Text>

        <form.Field name="joinCode">
          {(field) => (
            <View className="gap-1.5">
              <Label nativeID="joinCode">Jaktkod</Label>
              <Input
                aria-labelledby="joinCode"
                placeholder="t.ex. älgjakt2026"
                value={field.state.value}
                onChangeText={field.handleChange}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          )}
        </form.Field>

        <form.Subscribe selector={(s) => s.values.joinCode}>
          {(joinCode) => (
            <Button
              onPress={form.handleSubmit}
              disabled={!joinCode.trim()}
            >
              <Text>Gå med</Text>
            </Button>
          )}
        </form.Subscribe>
      </View>
    </KeyboardAvoidingView>
  );
}
