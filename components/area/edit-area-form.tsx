import { Button, Input, Text } from '@/components/ui';
import { api } from '@/convex/_generated/api';
import { Doc } from '@/convex/_generated/dataModel';
import { APP_COLORS } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from 'convex/react';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type EditAreaFormProps = {
  area: Doc<'areas'>;
};

export function EditAreaForm({ area }: EditAreaFormProps) {
  const { back } = useRouter();
  const insets = useSafeAreaInsets();
  const updateArea = useMutation(api.areas.update);
  const [name, setName] = useState(() => area.name);

  const handleSubmit = useCallback(async () => {
    if (!name.trim()) {
      Alert.alert('Fel', 'Namn krävs');
      return;
    }

    try {
      await updateArea({
        areaId: area._id,
        name: name.trim(),
      });
      back();
    } catch (e: any) {
      Alert.alert('Fel', e.message ?? 'Kunde inte uppdatera område');
    }
  }, [area._id, back, name, updateArea]);

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View
        className="border-b border-border bg-background px-5 pb-3"
        style={{ paddingTop: Math.max(insets.top, 12) }}>
        <View className="h-11 flex-row items-center justify-between gap-3">
          <View className="size-10" />
          <Text
            className="min-w-0 flex-1 text-center text-base font-semibold"
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.72}>
            Uppdatera info
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Stäng"
            hitSlop={10}
            onPress={() => back()}
            className="size-10 items-center justify-center rounded-full border border-border bg-card"
            style={{ boxShadow: '0 5px 14px rgba(49, 52, 68, 0.10)' }}>
            <Ionicons name="close" size={22} color={APP_COLORS.text} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        className="flex-1 bg-background"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: 40,
          paddingHorizontal: 24,
          paddingTop: 24,
        }}
        keyboardShouldPersistTaps="handled">
        <View className="flex-1">
          <Text className="mb-1 font-medium">Namn *</Text>
          <Input
            value={name}
            onChangeText={setName}
            placeholder="Områdesnamn"
            className="mb-4"
          />
        </View>
      </ScrollView>

      <View
        className="border-t border-border bg-background px-6 pt-3"
        style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
        <View className="flex-row items-center gap-3">
          <Button
            variant="ghost"
            className="h-12 flex-1 rounded-xl"
            onPress={() => back()}>
            <Text className="text-muted-foreground">Avbryt</Text>
          </Button>

          <Button onPress={handleSubmit} className="h-12 flex-1 rounded-xl">
            <Text>Spara ändringar</Text>
          </Button>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
