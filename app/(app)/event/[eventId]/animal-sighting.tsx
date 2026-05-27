import { Text } from '@/components/ui';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import {
  ANIMAL_SIGHTING_OPTIONS,
  type AnimalSightingType,
} from '@/lib/animal-sightings';
import { APP_COLORS } from '@/lib/theme';
import { useMutation } from 'convex/react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function parseCoordinate(value: string | string[] | undefined) {
  const rawValue = Array.isArray(value) ? value[0] : value;
  if (!rawValue) {
    return null;
  }

  const coordinate = Number(rawValue);
  return Number.isFinite(coordinate) ? coordinate : null;
}

type AnimalSightingOptionTileProps = {
  color: string;
  disabled: boolean;
  isSaving: boolean;
  label: string;
  onPress: () => void;
  width: '100%' | '48.5%';
};

function AnimalSightingOptionTile({
  color,
  disabled,
  isSaving,
  label,
  onPress,
  width,
}: AnimalSightingOptionTileProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Rapportera ${label.toLowerCase()}`}
      disabled={disabled}
      onPress={onPress}
      className="min-h-12 flex-row items-center gap-2 rounded-2xl border border-border bg-card px-3 active:bg-accent"
      style={{ opacity: disabled && !isSaving ? 0.54 : 1, width }}>
      <View className="size-3 rounded-full" style={{ backgroundColor: color }} />
      <Text className="min-w-0 flex-1 text-sm font-semibold" numberOfLines={1}>
        {label}
      </Text>
      {isSaving ? <ActivityIndicator size="small" color={APP_COLORS.primary} /> : null}
    </Pressable>
  );
}

export default function AnimalSightingSheetScreen() {
  const { eventId, latitude, longitude } = useLocalSearchParams<{
    eventId: string;
    latitude?: string;
    longitude?: string;
  }>();
  const { back, canGoBack, replace } = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const reportAnimalSighting = useMutation(api.animalSightings.report);
  const [savingAnimal, setSavingAnimal] = useState<AnimalSightingType | null>(null);

  const sightingLatitude = parseCoordinate(latitude);
  const sightingLongitude = parseCoordinate(longitude);
  const hasCoordinate = sightingLatitude !== null && sightingLongitude !== null;
  const optionWidth = width >= 360 ? '48.5%' : '100%';

  const closeSheet = useCallback(() => {
    if (canGoBack()) {
      back();
      return;
    }

    replace(`/event/${eventId}`);
  }, [back, canGoBack, eventId, replace]);

  const handleSelectAnimal = useCallback(
    async (animal: AnimalSightingType) => {
      if (sightingLatitude === null || sightingLongitude === null || savingAnimal) {
        return;
      }

      setSavingAnimal(animal);
      try {
        await reportAnimalSighting({
          eventId: eventId as Id<'events'>,
          animal,
          latitude: sightingLatitude,
          longitude: sightingLongitude,
        });
        closeSheet();
      } catch (error) {
        console.error('Failed to report animal sighting:', error);
        Alert.alert('Kunde inte skicka observation', 'Försök igen om en stund.');
        setSavingAnimal(null);
      }
    },
    [
      closeSheet,
      eventId,
      reportAnimalSighting,
      savingAnimal,
      sightingLatitude,
      sightingLongitude,
    ]
  );

  return (
    <View
      className="bg-background px-6 pt-4"
      style={{ paddingBottom: Math.max(insets.bottom, 16) + 10 }}>
      <View className="gap-1">
        <Text variant="h3">Vad såg du?</Text>
      </View>

      {hasCoordinate ? (
        <View className="mt-5 flex-row flex-wrap justify-between gap-y-3">
          {ANIMAL_SIGHTING_OPTIONS.map((option) => (
            <AnimalSightingOptionTile
              key={option.value}
              color={option.color}
              disabled={savingAnimal !== null}
              isSaving={savingAnimal === option.value}
              label={option.label}
              onPress={() => {
                void handleSelectAnimal(option.value);
              }}
              width={optionWidth}
            />
          ))}
        </View>
      ) : (
        <View className="mt-8 rounded-2xl border border-border bg-card p-4">
          <Text className="text-base font-semibold">Kartpunkten saknas</Text>
          <Text className="mt-1 text-sm text-muted-foreground">
            Stäng bladet och tryck länge på kartan igen.
          </Text>
        </View>
      )}
    </View>
  );
}
