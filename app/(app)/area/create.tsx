import { Button, Input, Text } from '@/components/ui';
import { LngLat, PolygonDrawer } from '@/components/PolygonDrawer';
import { api } from '@/convex/_generated/api';
import { useMutation } from 'convex/react';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, ScrollView } from 'react-native';

export default function CreateAreaScreen() {
  const router = useRouter();
  const [polygonPoints, setPolygonPoints] = useState<LngLat[] | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const createArea = useMutation(api.areas.create);

  const handlePolygonComplete = useCallback((points: LngLat[]) => {
    setPolygonPoints(points);
  }, []);

  const handleCancel = useCallback(() => {
    if (polygonPoints) {
      // Go back to drawing
      setPolygonPoints(null);
    } else {
      router.back();
    }
  }, [polygonPoints, router]);

  const handleSubmit = useCallback(async () => {
    if (!name.trim()) {
      Alert.alert('Fel', 'Namn krävs');
      return;
    }
    if (!polygonPoints || polygonPoints.length < 3) {
      Alert.alert('Fel', 'Rita ett område först');
      return;
    }

    const polygon = polygonPoints.map(([lng, lat]) => ({
      latitude: lat,
      longitude: lng,
    }));

    try {
      const areaId = await createArea({
        name: name.trim(),
        description: description.trim() || undefined,
        polygon,
      });
      router.replace(`/area/${areaId}`);
    } catch (e: any) {
      Alert.alert('Fel', e.message ?? 'Kunde inte skapa område');
    }
  }, [name, description, polygonPoints, createArea, router]);

  // Step 1: Draw polygon
  if (!polygonPoints) {
    return (
      <PolygonDrawer
        onComplete={handlePolygonComplete}
        onCancel={() => router.back()}
      />
    );
  }

  // Step 2: Enter details
  return (
    <ScrollView className="flex-1 bg-background p-6" keyboardShouldPersistTaps="handled">
      <Text variant="h3" className="mb-2">
        Namnge ditt område
      </Text>
      <Text className="mb-6 text-muted-foreground">
        {polygonPoints.length} punkter ritade
      </Text>

      <Text className="mb-1 font-medium">Namn *</Text>
      <Input
        value={name}
        onChangeText={setName}
        placeholder="Områdesnamn"
        className="mb-4"
        autoFocus
      />

      <Text className="mb-1 font-medium">Beskrivning</Text>
      <Input
        value={description}
        onChangeText={setDescription}
        placeholder="Valfri beskrivning"
        multiline
        numberOfLines={3}
        className="mb-6 h-20"
        textAlignVertical="top"
      />

      <Button onPress={handleSubmit} className="mb-3">
        <Text>Skapa område</Text>
      </Button>

      <Button variant="outline" onPress={handleCancel}>
        <Text>Tillbaka till ritning</Text>
      </Button>
    </ScrollView>
  );
}
