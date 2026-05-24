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
import { APP_COLORS } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from 'convex/react';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type MarkerSheetMode = 'create' | 'actions';

function shouldClearDraft(
  draftId: string | undefined,
  preserveDraftRef: { current: boolean }
): draftId is string {
  return Boolean(draftId && !preserveDraftRef.current);
}

type MarkerOptionCardProps = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  fullWidth?: boolean;
};

function MarkerOptionCard({ label, icon, onPress, fullWidth }: MarkerOptionCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="min-h-24 items-center justify-center gap-3 rounded-3xl border border-border bg-card p-4 active:bg-muted"
      style={{
        width: fullWidth ? '100%' : '48%',
        boxShadow: '0 7px 18px rgba(49, 52, 68, 0.08)',
      }}>
      <View className="size-10 items-center justify-center rounded-full bg-primary/10">
        <Ionicons name={icon} size={20} color={APP_COLORS.primary} />
      </View>
      <Text className="text-center text-sm font-semibold">{label}</Text>
    </Pressable>
  );
}

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
  const { back, replace } = useRouter();
  const removeFeature = useMutation(api.areaFeatures.remove);
  const preserveDraftRef = useRef(false);
  const insets = useSafeAreaInsets();

  const draft = draftId ? getAreaFeatureDraft(draftId) : undefined;
  const sheetMode: MarkerSheetMode = mode === 'actions' ? 'actions' : 'create';

  useEffect(() => {
    return () => {
      if (shouldClearDraft(draftId, preserveDraftRef)) {
        clearAreaFeatureDraft(draftId);
      }
    };
  }, [draftId]);

  function closeSheet() {
    if (draftId) {
      clearAreaFeatureDraft(draftId);
    }
    preserveDraftRef.current = true;
    back();
  }

  function goToDraft(route: 'marker' | 'marker-geometry', nextDraft: AreaFeatureDraft) {
    if (!draftId) {
      return;
    }

    saveAreaFeatureDraft(nextDraft, draftId);
    preserveDraftRef.current = true;
    replace(`/area/${id}/${route}?draftId=${draftId}`);
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
          <Button variant="outline" onPress={() => back()} className="rounded-2xl">
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
        <Text variant="h3">{sheetMode === 'create' ? 'Ny markör' : draft.name}</Text>
        {sheetMode === 'actions' ? (
          <Text className="mt-2 text-muted-foreground">Välj vad du vill göra med markören.</Text>
        ) : null}
      </View>

      <View
        className="mt-6 px-6"
        style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
        {sheetMode === 'create' ? (
          <View className="flex-row flex-wrap justify-between gap-y-3">
            <MarkerOptionCard
              label="Jaktorn"
              icon="trail-sign-outline"
              onPress={() => openPointMarker('tower')}
            />
            <MarkerOptionCard
              label="Parkering"
              icon="car-outline"
              onPress={() => openPointMarker('parking')}
            />
            <MarkerOptionCard
              label="Samlingsplats"
              icon="people-outline"
              onPress={() => openPointMarker('meeting')}
            />
            <MarkerOptionCard
              label="Anpassad"
              icon="sparkles-outline"
              onPress={() => openPointMarker('custom')}
            />
            <MarkerOptionCard
              label="Anpassat område"
              icon="map-outline"
              fullWidth
              onPress={openPolygonMarker}
            />
          </View>
        ) : (
          <View className="gap-3">
            {draft.images.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-1">
                <View className="flex-row gap-3 px-1">
                  {draft.images.map((image) => (
                    <Image
                      key={image.fileId}
                      source={{ uri: image.url }}
                      className="size-24 rounded-2xl bg-muted"
                    />
                  ))}
                </View>
              </ScrollView>
            ) : null}
            <Button
              variant="outline"
              onPress={() => goToDraft('marker', draft)}
              className="rounded-2xl">
              <Text>Redigera markör</Text>
            </Button>
            <Button variant="destructive" onPress={confirmDelete} className="rounded-2xl">
              <Text>Ta bort markör</Text>
            </Button>
          </View>
        )}

      </View>
    </View>
  );
}
