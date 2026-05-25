import { Button, Input, Text } from '@/components/ui';
import { api } from '@/convex/_generated/api';
import type { Doc } from '@/convex/_generated/dataModel';
import { APP_COLORS } from '@/lib/theme';
import { useMutation, useQuery } from 'convex/react';
import { useRouter } from 'expo-router';
import { useState } from 'react';
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
      <View className="flex-1 items-center justify-center bg-background px-6">
        <Text className="text-center text-muted-foreground">Profilen kunde inte laddas.</Text>
      </View>
    );
  }

  return <EditProfileForm user={user} onDone={() => back()} />;
}

function EditProfileForm({ user, onDone }: { user: Doc<'users'>; onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const updateProfile = useMutation(api.users.updateAppProfile);
  const [name, setName] = useState(user.name ?? '');
  const [email, setEmail] = useState(user.email ?? '');
  const [phoneNumber, setPhoneNumber] = useState(user.phoneNumber ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSave() {
    setIsSubmitting(true);
    try {
      await updateProfile({
        email,
        name,
        phoneNumber: phoneNumber.trim() || undefined,
      });
      onDone();
    } catch (error) {
      Alert.alert(
        'Kunde inte spara profil',
        error instanceof Error ? error.message : 'Försök igen om en stund.'
      );
      setIsSubmitting(false);
    }
  }

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

        <View className="gap-2">
          <Text className="text-sm font-medium text-foreground">Namn</Text>
          <Input
            value={name}
            onChangeText={setName}
            placeholder="Ditt namn"
            autoCapitalize="words"
            className="h-12 rounded-xl bg-card"
          />
        </View>

        <View className="gap-2">
          <Text className="text-sm font-medium text-foreground">Kontaktmejl</Text>
          <Input
            value={email}
            onChangeText={setEmail}
            placeholder="namn@example.com"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            className="h-12 rounded-xl bg-card"
          />
        </View>

        <View className="gap-2">
          <Text className="text-sm font-medium text-foreground">Telefonnummer</Text>
          <Input
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            placeholder="+46701234567"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="phone-pad"
            className="h-12 rounded-xl bg-card"
          />
        </View>

        <View className="flex-row gap-3 pt-2">
          <Button
            variant="outline"
            className="h-12 flex-1 rounded-xl bg-background"
            disabled={isSubmitting}
            onPress={onDone}>
            <Text>Avbryt</Text>
          </Button>
          <Button
            className="h-12 flex-1 rounded-xl"
            disabled={isSubmitting}
            onPress={() => void handleSave()}>
            <Text>{isSubmitting ? 'Sparar...' : 'Spara'}</Text>
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
