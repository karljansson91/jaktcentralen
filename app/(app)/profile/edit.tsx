import { Button, Input, Text } from '@/components/ui';
import { api } from '@/convex/_generated/api';
import type { Doc } from '@/convex/_generated/dataModel';
import { APP_COLORS } from '@/lib/theme';
import { useForm } from '@tanstack/react-form';
import { useMutation, useQuery } from 'convex/react';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function EditProfileScreen() {
  const { back } = useRouter();
  const user = useQuery(api.users.getCurrentUserProfile);

  if (user === undefined) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="small" color={APP_COLORS.primary} />
      </View>
    );
  }

  if (user === null) {
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-background px-6">
        <Text className="text-center text-muted-foreground">Profilen kunde inte laddas.</Text>
        <Button variant="outline" className="h-11 rounded-xl bg-background" onPress={() => back()}>
          <Text>Tillbaka</Text>
        </Button>
      </View>
    );
  }

  return <EditProfileForm key={user._id} user={user} onDone={() => back()} />;
}

type ProfileFormValues = {
  email: string;
  name: string;
  phoneNumber: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeProfileValues(values: ProfileFormValues) {
  return {
    email: values.email.trim(),
    name: values.name.trim(),
    phoneNumber: values.phoneNumber.trim(),
  };
}

function validateName(value: string) {
  return value.trim() ? undefined : 'Namn krävs';
}

function validateEmail(value: string) {
  const email = value.trim();
  if (!email) {
    return 'Kontaktmejl krävs';
  }
  return EMAIL_PATTERN.test(email) ? undefined : 'Ange en giltig e-postadress';
}

function hasProfileChanges(initialValues: ProfileFormValues, nextValues: ProfileFormValues) {
  const initial = normalizeProfileValues(initialValues);
  const next = normalizeProfileValues(nextValues);

  return (
    initial.name !== next.name ||
    initial.email !== next.email ||
    initial.phoneNumber !== next.phoneNumber
  );
}

function canSubmitProfileForm(initialValues: ProfileFormValues, values: ProfileFormValues) {
  return (
    hasProfileChanges(initialValues, values) &&
    !validateName(values.name) &&
    !validateEmail(values.email)
  );
}

function EditProfileForm({ user, onDone }: { user: Doc<'users'>; onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const updateProfile = useMutation(api.users.updateAppProfile);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const initialValues = useMemo<ProfileFormValues>(
    () => ({
      email: user.email ?? '',
      name: user.name ?? '',
      phoneNumber: user.phoneNumber ?? '',
    }),
    [user.email, user.name, user.phoneNumber]
  );

  const form = useForm({
    defaultValues: initialValues,
    onSubmit: async ({ value }) => {
      const normalized = normalizeProfileValues(value);

      setIsSubmitting(true);
      try {
        await updateProfile({
          email: normalized.email,
          name: normalized.name,
          phoneNumber: normalized.phoneNumber || undefined,
        });
        onDone();
      } catch (error) {
        Alert.alert(
          'Kunde inte spara profil',
          error instanceof Error ? error.message : 'Försök igen om en stund.'
        );
        setIsSubmitting(false);
      }
    },
  });

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-5 px-5 pt-5"
        contentContainerStyle={{ paddingBottom: 16 }}
        contentInset={{ bottom: Math.max(insets.bottom, 16) }}
        keyboardShouldPersistTaps="handled"
        scrollIndicatorInsets={{ bottom: Math.max(insets.bottom, 16) }}
        showsVerticalScrollIndicator={false}>
        <View className="gap-2">
          <Text className="text-[26px] font-semibold leading-[32px] text-foreground">
            Redigera profil
          </Text>
          <Text className="text-sm leading-5 text-muted-foreground">
            Detta är din Jaktcentralen-profil. Inloggning och konto hanteras av Clerk.
          </Text>
        </View>

        <form.Field name="name" validators={{ onChange: ({ value }) => validateName(value) }}>
          {(field) => (
            <View className="gap-2">
              <Text className="text-sm font-medium text-foreground">Namn</Text>
              <Input
                value={field.state.value}
                onChangeText={(value) => field.handleChange(value)}
                onBlur={() => field.handleBlur()}
                placeholder="Ditt namn"
                autoCapitalize="words"
                className="h-12 rounded-xl bg-card"
              />
              {field.state.meta.errors.length > 0 ? (
                <Text className="text-sm text-destructive">{field.state.meta.errors[0]}</Text>
              ) : null}
            </View>
          )}
        </form.Field>

        <form.Field name="email" validators={{ onChange: ({ value }) => validateEmail(value) }}>
          {(field) => (
            <View className="gap-2">
              <Text className="text-sm font-medium text-foreground">Kontaktmejl</Text>
              <Input
                value={field.state.value}
                onChangeText={(value) => field.handleChange(value)}
                onBlur={() => field.handleBlur()}
                placeholder="namn@example.com"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                className="h-12 rounded-xl bg-card"
              />
              {field.state.meta.errors.length > 0 ? (
                <Text className="text-sm text-destructive">{field.state.meta.errors[0]}</Text>
              ) : null}
            </View>
          )}
        </form.Field>

        <form.Field name="phoneNumber">
          {(field) => (
            <View className="gap-2">
              <Text className="text-sm font-medium text-foreground">Telefonnummer</Text>
              <Input
                value={field.state.value}
                onChangeText={(value) => field.handleChange(value)}
                onBlur={() => field.handleBlur()}
                placeholder="+46701234567"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="phone-pad"
                className="h-12 rounded-xl bg-card"
              />
            </View>
          )}
        </form.Field>

        <View className="flex-row gap-3 pt-2">
          <Button
            variant="outline"
            className="h-12 flex-1 rounded-xl bg-background"
            disabled={isSubmitting}
            onPress={onDone}>
            <Text>Avbryt</Text>
          </Button>
          <form.Subscribe selector={(state) => state.values}>
            {(values) => (
              <Button
                className="h-12 flex-1 rounded-xl"
                disabled={isSubmitting || !canSubmitProfileForm(initialValues, values)}
                onPress={() => form.handleSubmit()}>
                <Text>{isSubmitting ? 'Sparar...' : 'Spara'}</Text>
              </Button>
            )}
          </form.Subscribe>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
