import { Button, Input, Text } from '@/components/ui';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useMutation, useQuery } from 'convex/react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function EditAreaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const area = useQuery(api.areas.get, { areaId: id as Id<'areas'> });
  const updateArea = useMutation(api.areas.update);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [initialized, setInitialized] = useState(false);

  // Initialize form when area data loads
  useEffect(() => {
    if (area && !initialized) {
      setName(area.name);
      setDescription(area.description ?? '');
      setInitialized(true);
    }
  }, [area, initialized]);

  const handleSubmit = useCallback(async () => {
    if (!name.trim()) {
      Alert.alert('Fel', 'Namn krävs');
      return;
    }

    try {
      await updateArea({
        areaId: id as Id<'areas'>,
        name: name.trim(),
        description: description.trim() || undefined,
      });
      router.back();
    } catch (e: any) {
      Alert.alert('Fel', e.message ?? 'Kunde inte uppdatera område');
    }
  }, [name, description, id, updateArea, router]);

  if (area === undefined) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="small" color="#2c4b31" />
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingTop: 24,
        paddingBottom: Math.max(insets.bottom, 24),
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
          onPress={() => router.replace(`/area/${id}`)}>
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
  );
}
