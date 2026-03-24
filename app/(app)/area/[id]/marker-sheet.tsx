import { Button, Text } from '@/components/ui';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import {
  AreaFeatureCategory,
  AreaFeatureDraft,
  getDefaultColorForCategory,
} from '@/lib/area-features';
import {
  clearAreaFeatureDraft,
  getAreaFeatureDraft,
  saveAreaFeatureDraft,
} from '@/lib/area-feature-draft-store';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from 'convex/react';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type MarkerSheetMode = 'create' | 'actions';

function buildPointDraft(draft: AreaFeatureDraft, category: AreaFeatureCategory): AreaFeatureDraft {
  return {
    ...draft,
    category,
    geometryType: 'point',
    color: getDefaultColorForCategory(category),
    point: draft.point ?? draft.polygon?.[0],
    polygon: undefined,
  };
}

function buildPolygonDraft(draft: AreaFeatureDraft): AreaFeatureDraft {
  return {
    ...draft,
    category: 'custom',
    geometryType: 'polygon',
    color: getDefaultColorForCategory('custom'),
    point: undefined,
    polygon: draft.polygon ?? (draft.point ? [draft.point] : undefined),
  };
}

export default function MarkerSheetScreen() {
  const { id, draftId, mode } = useLocalSearchParams<{
    id: string;
    draftId?: string;
    mode?: MarkerSheetMode;
  }>();
  const router = useRouter();
  const removeFeature = useMutation(api.areaFeatures.remove);
  const preserveDraftRef = useRef(false);
  const insets = useSafeAreaInsets();

  const draft = draftId ? getAreaFeatureDraft(draftId) : undefined;
  const sheetMode: MarkerSheetMode = mode === 'actions' ? 'actions' : 'create';

  useEffect(() => {
    return () => {
      if (draftId && !preserveDraftRef.current) {
        clearAreaFeatureDraft(draftId);
      }
    };
  }, [draftId]);

  function closeSheet() {
    if (draftId) {
      clearAreaFeatureDraft(draftId);
    }
    preserveDraftRef.current = true;
    router.back();
  }

  function goToDraft(route: 'marker' | 'marker-geometry', nextDraft: AreaFeatureDraft) {
    if (!draftId) {
      return;
    }

    saveAreaFeatureDraft(nextDraft, draftId);
    preserveDraftRef.current = true;
    router.replace(`/area/${id}/${route}?draftId=${draftId}`);
  }

  function openPointMarker(category: AreaFeatureCategory) {
    if (!draft) {
      return;
    }
    goToDraft('marker', buildPointDraft(draft, category));
  }

  function openPolygonMarker() {
    if (!draft) {
      return;
    }
    goToDraft('marker-geometry', buildPolygonDraft(draft));
  }

  async function handleDelete() {
    if (!draft || draft.mode === 'create') {
      closeSheet();
      return;
    }

    try {
      await removeFeature(
        draft.mode === 'edit' && draft.featureId
          ? { featureId: draft.featureId }
          : { legacyPointId: draft.legacyPointId as Id<'areaPoints'> }
      );
      closeSheet();
    } catch (error: any) {
      Alert.alert('Fel', error.message ?? 'Kunde inte ta bort markören');
    }
  }

  function confirmDelete() {
    Alert.alert('Ta bort markör', 'Vill du verkligen ta bort markören?', [
      { text: 'Avbryt', style: 'cancel' },
      { text: 'Ta bort', style: 'destructive', onPress: () => void handleDelete() },
    ]);
  }

  if (!draftId || !draft) {
    return (
      <View
        className="flex-1 bg-background px-6 pt-4"
        style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
        <Text variant="h3">Markörer</Text>
        <Text className="mt-2 text-muted-foreground">Markörutkastet kunde inte hittas.</Text>
        <View className="mt-6">
          <Button variant="outline" onPress={() => router.back()} className="rounded-2xl">
            <Text>Stäng</Text>
          </Button>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen
        options={{
          sheetAllowedDetents: 'fitToContents',
        }}
      />

      <View className="px-6 pt-4">
        <View className="flex-row items-start justify-between">
          <View className="flex-1 pr-4">
            <Text variant="h3">{sheetMode === 'create' ? 'Ny markör' : draft.name}</Text>
            <Text className="mt-2 text-muted-foreground">
              {sheetMode === 'create'
                ? 'Välj vad du vill placera på kartan.'
                : 'Välj vad du vill göra med markören.'}
            </Text>
          </View>

          <Pressable
            onPress={closeSheet}
            className="h-11 w-11 items-center justify-center rounded-full bg-muted/70">
            <Ionicons name="close" size={22} color="#374151" />
          </Pressable>
        </View>
      </View>

      <View
        className="mt-6 gap-3 px-6"
        style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
        {sheetMode === 'create' ? (
          <>
            <Button variant="outline" onPress={() => openPointMarker('tower')} className="rounded-2xl">
              <Text>Jaktorn</Text>
            </Button>
            <Button
              variant="outline"
              onPress={() => openPointMarker('parking')}
              className="rounded-2xl">
              <Text>Parkering</Text>
            </Button>
            <Button
              variant="outline"
              onPress={() => openPointMarker('meeting')}
              className="rounded-2xl">
              <Text>Samlingsplats</Text>
            </Button>
            <Button
              variant="outline"
              onPress={() => openPointMarker('custom')}
              className="rounded-2xl">
              <Text>Anpassad punkt</Text>
            </Button>
            <Button variant="outline" onPress={openPolygonMarker} className="rounded-2xl">
              <Text>Anpassat område</Text>
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="outline"
              onPress={() => goToDraft('marker', draft)}
              className="rounded-2xl">
              <Text>Redigera markör</Text>
            </Button>
            <Button variant="destructive" onPress={confirmDelete} className="rounded-2xl">
              <Text>Ta bort markör</Text>
            </Button>
          </>
        )}

        <Button variant="ghost" onPress={closeSheet} className="mt-1 rounded-2xl">
          <Text>Stäng</Text>
        </Button>
      </View>
    </View>
  );
}
