import { Button, Text } from '@/components/ui';
import { APP_COLORS } from '@/lib/theme';
import { normalizeDegrees } from '@/lib/wind-direction';
import { publishWindDirectionSelection } from '@/lib/wind-direction-selection';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { PanResponder, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const COMPASS_TOUCH_DEAD_ZONE = 10;
const COMPASS_DIRECTIONS = [
  { degrees: 0, label: 'N' },
  { degrees: 45, label: 'NO' },
  { degrees: 90, label: 'O' },
  { degrees: 135, label: 'SO' },
  { degrees: 180, label: 'S' },
  { degrees: 225, label: 'SV' },
  { degrees: 270, label: 'V' },
  { degrees: 315, label: 'NV' },
] as const;

function parseInitialDegrees(value: string | string[] | undefined) {
  const rawValue = Array.isArray(value) ? value[0] : value;
  if (!rawValue) {
    return null;
  }

  const degrees = Number(rawValue);
  return Number.isFinite(degrees) ? Math.round(normalizeDegrees(degrees)) : null;
}

function degreesFromTouch(x: number, y: number, size: number) {
  const center = size / 2;
  const dx = x - center;
  const dy = y - center;

  if (Math.hypot(dx, dy) < COMPASS_TOUCH_DEAD_ZONE) {
    return null;
  }

  return Math.round(normalizeDegrees((Math.atan2(dx, -dy) * 180) / Math.PI));
}

function getCompassLabelStyle(degrees: number, size: number) {
  const angle = (degrees * Math.PI) / 180;
  const radius = size * 0.38;
  const x = size / 2 + Math.sin(angle) * radius;
  const y = size / 2 - Math.cos(angle) * radius;

  return {
    left: x - 15,
    top: y - 8,
    width: 30,
  };
}

export default function WindDirectionScreen() {
  const { eventId, initialDegrees } = useLocalSearchParams<{
    eventId: string;
    initialDegrees?: string;
  }>();
  const { back, canGoBack, replace } = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const initialWindDirectionDegrees = useMemo(
    () => parseInitialDegrees(initialDegrees),
    [initialDegrees]
  );
  const [draftDegrees, setDraftDegrees] = useState(initialWindDirectionDegrees ?? 0);
  const compassSize = Math.min(244, Math.max(214, width - 96));

  const close = useCallback(() => {
    if (canGoBack()) {
      back();
      return;
    }

    replace(`/event/${eventId}`);
  }, [back, canGoBack, eventId, replace]);

  useEffect(() => {
    publishWindDirectionSelection(initialWindDirectionDegrees ?? 0);
  }, [initialWindDirectionDegrees]);

  const setWindDirection = useCallback((degrees: number) => {
    setDraftDegrees(degrees);
    publishWindDirectionSelection(degrees);
  }, []);

  const updateDraftFromTouch = useCallback(
    (x: number, y: number) => {
      const nextDegrees = degreesFromTouch(x, y, compassSize);
      if (nextDegrees == null) {
        return;
      }

      setWindDirection(nextDegrees);
    },
    [compassSize, setWindDirection]
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: () => true,
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: (event) => {
          updateDraftFromTouch(event.nativeEvent.locationX, event.nativeEvent.locationY);
        },
        onPanResponderMove: (event) => {
          updateDraftFromTouch(event.nativeEvent.locationX, event.nativeEvent.locationY);
        },
      }),
    [updateDraftFromTouch]
  );

  const handleClear = useCallback(() => {
    publishWindDirectionSelection(null);
    close();
  }, [close]);

  return (
    <View
      className="items-center bg-background px-6 pt-5"
      style={{ paddingBottom: Math.max(insets.bottom, 16) + 12 }}>
      <View className="w-full gap-1">
        <Text variant="h3" className="text-center">
          Vindriktning
        </Text>
      </View>

      <View
        {...panResponder.panHandlers}
        accessibilityLabel="Välj vindriktning"
        accessibilityRole="adjustable"
        className="mt-5 rounded-full border border-border bg-card"
        style={{ height: compassSize, width: compassSize }}>
        {COMPASS_DIRECTIONS.map((item) => (
          <Text
            key={item.label}
            className="absolute text-center text-[11px] font-bold leading-[16px] text-muted-foreground"
            style={getCompassLabelStyle(item.degrees, compassSize)}>
            {item.label}
          </Text>
        ))}

        <View className="absolute inset-0 items-center justify-center" pointerEvents="none">
          <View style={{ transform: [{ rotateZ: `${draftDegrees}deg` }] }}>
            <Ionicons name="arrow-up" size={54} color={APP_COLORS.primary} />
          </View>
          <View className="absolute size-2 rounded-full bg-primary" />
        </View>
      </View>

      <View className="mt-5 w-full flex-row gap-3">
        <Button
          variant="outline"
          className="h-12 flex-1 rounded-2xl bg-background"
          onPress={handleClear}>
          <Text>Rensa vind</Text>
        </Button>
        <Button className="h-12 flex-1 rounded-2xl" onPress={close}>
          <Text>Klar</Text>
        </Button>
      </View>
    </View>
  );
}
