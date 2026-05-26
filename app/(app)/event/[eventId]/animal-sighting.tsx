import { Text } from '@/components/ui';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import {
  ANIMAL_SIGHTING_OPTIONS,
  type AnimalSightingType,
} from '@/lib/animal-sightings';
import { APP_COLORS } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from 'convex/react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function parseCoordinate(value: string | string[] | undefined) {
  const rawValue = Array.isArray(value) ? value[0] : value;
  if (!rawValue) {
    return null;
  }

  const coordinate = Number(rawValue);
  return Number.isFinite(coordinate) ? coordinate : null;
}

type AnimalSightingOptionRowProps = {
  color: string;
  disabled: boolean;
  isSaving: boolean;
  label: string;
  onPress: () => void;
};

function AnimalSightingOptionRow({
  color,
  disabled,
  isSaving,
  label,
  onPress,
}: AnimalSightingOptionRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Rapportera ${label.toLowerCase()}`}
      disabled={disabled}
      onPress={onPress}
      className="h-14 flex-row items-center gap-3 rounded-2xl border border-border bg-card px-4 active:bg-accent"
      style={{ opacity: disabled && !isSaving ? 0.54 : 1 }}>
      <View className="size-3 rounded-full" style={{ backgroundColor: color }} />
      <Text className="min-w-0 flex-1 text-base font-semibold">{label}</Text>
      {isSaving ? (
        <ActivityIndicator size="small" color={APP_COLORS.primary} />
      ) : (
        <Ionicons name="chevron-forward" size={18} color={APP_COLORS.textMuted} />
      )}
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
  const reportAnimalSighting = useMutation(api.animalSightings.report);
  const [savingAnimal, setSavingAnimal] = useState<AnimalSightingType | null>(null);

  const sightingLatitude = parseCoordinate(latitude);
  const sightingLongitude = parseCoordinate(longitude);
  const hasCoordinate = sightingLatitude !== null && sightingLongitude !== null;

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
      className="flex-1 bg-background px-6 pt-4"
      style={{ paddingBottom: Math.max(insets.bottom, 16) + 10 }}>
      <View className="gap-1">
        <Text variant="h3">Vad såg du?</Text>
        <Text className="text-sm text-muted-foreground">
          Välj djur för markeringen på kartan.
        </Text>
      </View>

      {hasCoordinate ? (
        <View className="mt-5 gap-3">
          {ANIMAL_SIGHTING_OPTIONS.map((option) => (
            <AnimalSightingOptionRow
              key={option.value}
              color={option.color}
              disabled={savingAnimal !== null}
              isSaving={savingAnimal === option.value}
              label={option.label}
              onPress={() => {
                void handleSelectAnimal(option.value);
              }}
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
