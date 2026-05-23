import { GlassScreenHeader, useGlassHeaderSpacing } from '@/components/glass';
import { Button, Input, Text } from '@/components/ui';
import { api } from '@/convex/_generated/api';
import { Doc, Id } from '@/convex/_generated/dataModel';
import { useMutation } from 'convex/react';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';

type EditAreaFormProps = {
  area: Doc<'areas'>;
};

export function EditAreaForm({ area }: EditAreaFormProps) {
  const router = useRouter();
  const { insets } = useGlassHeaderSpacing();
  const updateArea = useMutation(api.areas.update);
  const [name, setName] = useState(area.name);
  const [description, setDescription] = useState(area.description ?? '');

  const handleSubmit = useCallback(async () => {
    if (!name.trim()) {
      Alert.alert('Fel', 'Namn krävs');
      return;
    }

    try {
      await updateArea({
        areaId: area._id as Id<'areas'>,
        name: name.trim(),
        description: description.trim() || undefined,
      });
      router.back();
    } catch (e: any) {
      Alert.alert('Fel', e.message ?? 'Kunde inte uppdatera område');
    }
  }, [area._id, description, name, router, updateArea]);

  return (
    <View className="flex-1 bg-background">
      <GlassScreenHeader title="Uppdatera info" onBack={() => router.back()} />

      <ScrollView
        className="flex-1 bg-background"
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: Math.max(insets.bottom, 24),
          paddingHorizontal: 24,
          paddingTop: 0,
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

          <Text className="mb-1 font-medium">Beskrivning</Text>
          <Input
            value={description}
            onChangeText={setDescription}
            placeholder="Valfri beskrivning"
            multiline
            numberOfLines={3}
            className="mb-4 h-20"
            textAlignVertical="top"
          />

          <Button
            variant="outline"
            className="mb-4"
            onPress={() => router.replace(`/area/${area._id}`)}>
            <Text>Hantera markörer på kartan</Text>
          </Button>

          <View className="flex-1" />

          <View className="gap-3 pt-6">
            <Button onPress={handleSubmit}>
              <Text>Spara ändringar</Text>
            </Button>

            <Button variant="outline" onPress={() => router.back()}>
              <Text>Avbryt</Text>
            </Button>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
