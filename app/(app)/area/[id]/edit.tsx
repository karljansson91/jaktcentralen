import { Button, Input, Text } from '@/components/ui';
import { LngLat, PolygonDrawer } from '@/components/PolygonDrawer';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useMutation, useQuery } from 'convex/react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, View } from 'react-native';

export default function EditAreaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const area = useQuery(api.areas.get, { areaId: id as Id<'areas'> });
  const updateArea = useMutation(api.areas.update);

  const [polygonPoints, setPolygonPoints] = useState<LngLat[] | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [initialized, setInitialized] = useState(false);

  // Initialize form when area data loads
  useEffect(() => {
    if (area && !initialized) {
      setName(area.name);
      setDescription(area.description ?? '');
      setPolygonPoints(
        area.polygon.map((p) => [p.longitude, p.latitude] as LngLat)
      );
      setInitialized(true);
    }
  }, [area, initialized]);

  const handlePolygonComplete = useCallback((points: LngLat[]) => {
    setPolygonPoints(points);
    setIsDrawing(false);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!name.trim()) {
      Alert.alert('Fel', 'Namn krävs');
      return;
    }
    if (!polygonPoints || polygonPoints.length < 3) {
      Alert.alert('Fel', 'Området måste ha minst 3 punkter');
      return;
    }

    const polygon = polygonPoints.map(([lng, lat]) => ({
      latitude: lat,
      longitude: lng,
    }));

    try {
      await updateArea({
        areaId: id as Id<'areas'>,
        name: name.trim(),
        description: description.trim() || undefined,
        polygon,
      });
      router.back();
    } catch (e: any) {
      Alert.alert('Fel', e.message ?? 'Kunde inte uppdatera område');
    }
  }, [name, description, polygonPoints, id, updateArea, router]);

  if (area === undefined) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="small" color="#2c4b31" />
      </View>
    );
  }

  // Redraw polygon mode
  if (isDrawing) {
    return (
      <PolygonDrawer
        initialPoints={polygonPoints ?? undefined}
        onComplete={handlePolygonComplete}
        onCancel={() => setIsDrawing(false)}
      />
    );
  }

  return (
    <ScrollView className="flex-1 bg-background p-6" keyboardShouldPersistTaps="handled">
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

      <Text className="mb-4 text-muted-foreground">
        {polygonPoints?.length ?? 0} polygonpunkter
      </Text>

      <Button variant="outline" className="mb-4" onPress={() => setIsDrawing(true)}>
        <Text>Rita om polygon</Text>
      </Button>

      <Button
        variant="outline"
        className="mb-4"
        onPress={() => router.replace(`/area/${id}`)}>
        <Text>Hantera markörer på kartan</Text>
      </Button>

      <Button onPress={handleSubmit} className="mb-3">
        <Text>Spara ändringar</Text>
      </Button>

      <Button variant="outline" onPress={() => router.back()}>
        <Text>Avbryt</Text>
      </Button>
    </ScrollView>
  );
}
