import { ColorSwatch } from '@/components/area/color-swatch';
import { Button, Input, Text } from '@/components/ui';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import {
  AREA_SAT_COLOR_PALETTE,
  AreaSatDraft,
  getDefaultAreaSatColor,
  getPassMarkersInsideSat,
} from '@/lib/area-sats';
import {
  clearAreaSatDraft,
  getAreaSatDraft,
} from '@/lib/area-sat-draft-store';
import { APP_COLORS } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery } from 'convex/react';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function shouldClearDraft(
  draftId: string | undefined,
  preserveDraftRef: { current: boolean }
): draftId is string {
  return Boolean(draftId && !preserveDraftRef.current);
}

export default function SatFormScreen() {
  const { id, draftId, satId } = useLocalSearchParams<{
    id: string;
    draftId?: string;
    satId?: string;
  }>();
  const { back } = useRouter();
  const insets = useSafeAreaInsets();
  const preserveDraftRef = useRef(false);
  const areaFeatures = useQuery(api.areaFeatures.listByArea, { areaId: id as Id<'areas'> });
  const existingSat = useQuery(
    api.areaSats.get,
    satId ? { satId: satId as Id<'areaSats'> } : 'skip'
  );
  const saveSat = useMutation(api.areaSats.save);
  const removeSat = useMutation(api.areaSats.remove);
  const [draft] = useState<AreaSatDraft | null>(() => {
    if (draftId) {
      return getAreaSatDraft(draftId) ?? null;
    }
    return null;
  });
  const [nameOverride, setNameOverride] = useState<string | null>(draft?.name ?? null);
  const [colorOverride, setColorOverride] = useState<string | null>(draft?.color ?? null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (shouldClearDraft(draftId, preserveDraftRef)) {
        clearAreaSatDraft(draftId);
      }
    };
  }, [draftId]);

  const activeDraft = useMemo<AreaSatDraft | null>(
    () =>
      draft ??
      (existingSat
        ? {
            areaId: id as Id<'areas'>,
            color: existingSat.color,
            name: existingSat.name,
            polygon: existingSat.polygon,
            satId: existingSat.id,
          }
        : null),
    [draft, existingSat, id]
  );
  const name = nameOverride ?? activeDraft?.name ?? '';
  const color = colorOverride ?? activeDraft?.color ?? getDefaultAreaSatColor();

  const passMarkers = useMemo(() => {
    if (!activeDraft?.polygon || !areaFeatures) {
      return [];
    }
    return getPassMarkersInsideSat({ polygon: activeDraft.polygon }, areaFeatures);
  }, [activeDraft, areaFeatures]);

  const canDelete = Boolean(satId || activeDraft?.satId);
  const canSave = Boolean(name.trim() && activeDraft?.polygon);

  const close = useCallback(() => {
    if (draftId) {
      clearAreaSatDraft(draftId);
    }
    preserveDraftRef.current = true;
    back();
  }, [back, draftId]);

  async function handleSave() {
    if (!activeDraft?.polygon) {
      setErrorText('Rita såten först.');
      return;
    }
    if (!name.trim()) {
      setErrorText('Namn krävs.');
      return;
    }
    setIsSubmitting(true);
    setErrorText(null);
    try {
      await saveSat({
        ...(activeDraft.satId ? { satId: activeDraft.satId } : { areaId: id as Id<'areas'> }),
        color,
        name: name.trim(),
        polygon: activeDraft.polygon,
      });
      close();
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : 'Kunde inte spara såten.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    const targetSatId = (satId as Id<'areaSats'> | undefined) ?? activeDraft?.satId;
    if (!targetSatId) {
      close();
      return;
    }

    setIsSubmitting(true);
    try {
      await removeSat({ satId: targetSatId });
      close();
    } catch (error) {
      Alert.alert(
        'Kunde inte ta bort såten',
        error instanceof Error ? error.message : 'Försök igen om en stund.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function confirmDelete() {
    Alert.alert('Ta bort såt', 'Vill du ta bort såten?', [
      { text: 'Avbryt', style: 'cancel' },
      { text: 'Ta bort', style: 'destructive', onPress: () => void handleDelete() },
    ]);
  }

  if (satId && existingSat === undefined) {
    return (
      <View className="flex-1 items-center justify-center bg-background p-6">
        <ActivityIndicator size="small" color={APP_COLORS.primary} />
      </View>
    );
  }

  if (!activeDraft) {
    return (
      <View className="flex-1 items-center justify-center bg-background p-6">
        <Text>Såtutkastet kunde inte hittas.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{
        gap: 18,
        paddingBottom: 24,
        paddingHorizontal: 24,
        paddingTop: 24,
      }}
      contentInset={{ bottom: Math.max(insets.bottom, 24) }}
      scrollIndicatorInsets={{ bottom: Math.max(insets.bottom, 24) }}
      keyboardShouldPersistTaps="handled">
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Stäng"
              hitSlop={12}
              onPress={close}>
              <Ionicons name="close" size={24} color={APP_COLORS.text} />
            </Pressable>
          ),
          title: activeDraft?.satId || satId ? 'Redigera såt' : 'Ny såt',
        }}
      />

      <View className="gap-2">
        <Text className="font-medium">Namn *</Text>
        <Input value={name} onChangeText={setNameOverride} placeholder="Namn på såten" />
      </View>

      <View className="gap-2">
        <Text className="font-medium">Område</Text>
        <View className="rounded-2xl border border-border bg-card px-4 py-3">
          <Text className="text-sm text-muted-foreground">
            {activeDraft?.polygon ? `${activeDraft.polygon.length} polygonpunkter` : 'Ingen såt ritad'}
          </Text>
        </View>
      </View>

      <View className="gap-2">
        <Text className="font-medium">Pass i såten</Text>
        <View className="rounded-2xl border border-border bg-card px-4 py-3">
          <Text className="text-sm text-muted-foreground">
            {`${passMarkers.length} pass i såten`}
          </Text>
        </View>
      </View>

      <View className="gap-3">
        <Text className="font-medium">Färg</Text>
        <View className="flex-row flex-wrap gap-3">
          {AREA_SAT_COLOR_PALETTE.map((option) => (
            <ColorSwatch
              key={option}
              color={option}
              selected={color === option}
              onPress={() => setColorOverride(option)}
            />
          ))}
        </View>
      </View>

      {errorText ? <Text className="text-sm text-destructive">{errorText}</Text> : null}

      <Button size="xl" className="rounded-2xl" onPress={() => void handleSave()} disabled={isSubmitting || !canSave}>
        <Text>{isSubmitting ? 'Sparar...' : 'Spara såt'}</Text>
      </Button>

      {canDelete ? (
        <Button
          variant="destructive"
          size="xl"
          className="rounded-2xl"
          onPress={confirmDelete}
          disabled={isSubmitting}>
          <Text>Ta bort såt</Text>
        </Button>
      ) : null}
    </ScrollView>
  );
}
