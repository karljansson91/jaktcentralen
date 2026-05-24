import { Button, Input, Text } from '@/components/ui';
import { LngLat, PolygonDrawer } from '@/components/PolygonDrawer';
import { api } from '@/convex/_generated/api';
import { APP_COLORS } from '@/lib/theme';
import { useMutation } from 'convex/react';
import { Stack, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CreateAreaScreen() {
  const { back, replace } = useRouter();
  const insets = useSafeAreaInsets();
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
      back();
    }
  }, [back, polygonPoints]);

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
      replace(`/area/${areaId}`);
    } catch (e: any) {
      Alert.alert('Fel', e.message ?? 'Kunde inte skapa område');
    }
  }, [createArea, description, name, polygonPoints, replace]);

  // Step 1: Draw polygon
  if (!polygonPoints) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <PolygonDrawer
          onComplete={handlePolygonComplete}
          onCancel={() => back()}
        />
      </>
    );
  }

  // Step 2: Enter details
  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Skapa område',
          headerLargeTitle: false,
          headerTitleAlign: 'center',
          headerShadowVisible: false,
          headerStyle: { backgroundColor: APP_COLORS.background },
          headerTintColor: APP_COLORS.text,
          contentStyle: { backgroundColor: APP_COLORS.background },
        }}
      />
      <KeyboardAvoidingView
        className="flex-1 bg-background"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          className="flex-1 bg-background"
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 24,
            paddingTop: 24,
          }}
          contentInset={{ bottom: Math.max(insets.bottom, 24) }}
          scrollIndicatorInsets={{ bottom: Math.max(insets.bottom, 24) }}
          keyboardShouldPersistTaps="handled">
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
      </KeyboardAvoidingView>
    </>
  );
}
