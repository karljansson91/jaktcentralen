import {
  ResultChoices,
  SpeciesChoices,
} from '@/components/event/shot-report-form-controls';
import { Button, Text } from '@/components/ui';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { withLoadingState } from '@/lib/async-state';
import { useCurrentTime } from '@/hooks/use-current-time';
import {
  getLastKnownUserPosition,
  type LastKnownUserPosition,
} from '@/lib/location';
import {
  getShotSpeciesOptions,
  type ShotReportResult,
} from '@/lib/shot-reports';
import { APP_COLORS } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery } from 'convex/react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const STALE_POSITION_MS = 5 * 60_000;

function parseCoordinate(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return null;
  const number = Number(raw);
  return Number.isFinite(number) ? number : null;
}

function createOperationKey() {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`
  );
}

function formatPositionTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString('sv-SE', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ShotReportScreen() {
  const { eventId, latitude, longitude } = useLocalSearchParams<{
    eventId: string;
    latitude?: string;
    longitude?: string;
  }>();
  const { back, replace } = useRouter();
  const insets = useSafeAreaInsets();
  const currentTime = useCurrentTime();
  const [operationKey] = useState(createOperationKey);
  const [selectedSpeciesId, setSelectedSpeciesId] = useState<string | null>(null);
  const [selectedResult, setSelectedResult] = useState<ShotReportResult | null>(null);
  const [shooterPosition, setShooterPosition] = useState<LastKnownUserPosition | null>(null);
  const [positionLoading, setPositionLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const reportShot = useMutation(api.shotReports.report);
  const event = useQuery(api.events.get, { eventId: eventId as Id<'events'> });
  const shotLatitude = parseCoordinate(latitude);
  const shotLongitude = parseCoordinate(longitude);
  const speciesOptions = getShotSpeciesOptions(event?.allowedGame);

  useEffect(() => {
    let cancelled = false;
    void getLastKnownUserPosition()
      .then((position) => {
        if (!cancelled) {
          setShooterPosition(position);
        }
      })
      .catch((error) => {
        console.error('Failed to read last known shooter position:', error);
      })
      .finally(() => {
        if (!cancelled) {
          setPositionLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = async () => {
    if (
      !selectedSpeciesId ||
      !selectedResult ||
      shotLatitude == null ||
      shotLongitude == null
    ) {
      return;
    }

    await withLoadingState(setIsSaving, async () => {
      try {
        const reportId = await reportShot({
          eventId: eventId as Id<'events'>,
          operationKey,
          result: selectedResult,
          shooterPosition: shooterPosition ?? undefined,
          shotLatitude,
          shotLongitude,
          speciesId: selectedSpeciesId,
        });
        replace(`/event/${eventId}/shot-report-details?reportId=${reportId}`);
      } catch (error) {
        Alert.alert(
          'Kunde inte rapportera skottet',
          error instanceof Error ? error.message : 'Försök igen om en stund.'
        );
      }
    });
  };

  if (event === undefined) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color={APP_COLORS.primary} />
      </View>
    );
  }

  const stalePosition =
    shooterPosition !== null && currentTime - shooterPosition.timestamp > STALE_POSITION_MS;
  const canSave =
    selectedSpeciesId !== null &&
    selectedResult !== null &&
    shotLatitude !== null &&
    shotLongitude !== null &&
    !positionLoading &&
    !isSaving;

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        contentContainerStyle={{
          gap: 22,
          paddingHorizontal: 20,
          paddingTop: 14,
        }}>
        <View className="flex-row items-start justify-between gap-4">
          <View className="min-w-0 flex-1 gap-1">
            <Text variant="h2">Rapportera skott</Text>
            <Text className="text-sm text-muted-foreground">Plats och tid sparas automatiskt.</Text>
          </View>
          <Pressable
            accessibilityLabel="Stäng"
            accessibilityRole="button"
            className="size-10 items-center justify-center rounded-full bg-muted active:bg-accent"
            onPress={() => back()}>
            <Ionicons name="close" color={APP_COLORS.text} size={22} />
          </Pressable>
        </View>

        <View className="gap-3">
          <Text className="text-base font-semibold">Viltart</Text>
          <SpeciesChoices
            onChange={setSelectedSpeciesId}
            options={speciesOptions}
            value={selectedSpeciesId}
          />
        </View>

        <View className="gap-3">
          <Text className="text-base font-semibold">Resultat</Text>
          <ResultChoices onChange={setSelectedResult} value={selectedResult} />
        </View>

        <View className="flex-row items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3">
          <Ionicons name="navigate-outline" color={APP_COLORS.primary} size={20} />
          <View className="min-w-0 flex-1">
            <Text className="font-semibold">Skyttposition</Text>
            <Text className="text-sm text-muted-foreground">
              {positionLoading
                ? 'Läser senaste position…'
                : shooterPosition
                  ? `${formatPositionTime(shooterPosition.timestamp)}${
                      stalePosition ? ' · Äldre position – kan vara inaktuell' : ''
                    }`
                  : 'Skyttposition saknas'}
            </Text>
          </View>
        </View>

        <Button size="xl" disabled={!canSave} onPress={() => void handleSave()}>
          {isSaving ? <ActivityIndicator color={APP_COLORS.surface} /> : <Text>Spara rapport</Text>}
        </Button>
        <View style={{ height: Math.max(insets.bottom, 16) + 24 }} />
      </ScrollView>
    </View>
  );
}
