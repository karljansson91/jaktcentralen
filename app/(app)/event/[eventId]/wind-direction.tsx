import { Button, Text } from '@/components/ui';
import { APP_COLORS } from '@/lib/theme';
import { getWindDirectionDisplay, normalizeDegrees } from '@/lib/wind-direction';
import { publishWindDirectionSelection } from '@/lib/wind-direction-selection';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
  type GestureResponderEvent,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const COMPASS_TOUCH_DEAD_ZONE = 14;
const COMPASS_TICKS = Array.from({ length: 24 }, (_, index) => index * 15);
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
  const radius = size * 0.39;
  const x = size / 2 + Math.sin(angle) * radius;
  const y = size / 2 - Math.cos(angle) * radius;

  return {
    left: x - 17,
    top: y - 9,
    width: 34,
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
  const compassSize = Math.min(256, Math.max(218, width - 96));

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
    const nextDegrees = Math.round(normalizeDegrees(degrees));
    setDraftDegrees(nextDegrees);
    publishWindDirectionSelection(nextDegrees);
  }, []);

  const handleCompassPress = useCallback(
    (event: GestureResponderEvent) => {
      const nextDegrees = degreesFromTouch(
        event.nativeEvent.locationX,
        event.nativeEvent.locationY,
        compassSize
      );
      if (nextDegrees == null) {
        return;
      }

      setWindDirection(nextDegrees);
    },
    [compassSize, setWindDirection]
  );

  const handleClear = useCallback(() => {
    publishWindDirectionSelection(null);
    close();
  }, [close]);
  const selectedWindLabel = getWindDirectionDisplay(draftDegrees).label;
  const selectedDegrees = Math.round(normalizeDegrees(draftDegrees));

  return (
    <View
      className="items-center bg-background px-6 pt-5"
      style={{ paddingBottom: Math.max(insets.bottom, 16) + 12 }}>
      <View className="w-full gap-1">
        <Text variant="h3" className="text-center">
          Vindriktning
        </Text>
      </View>

      <Pressable
        accessibilityLabel={`Välj vindriktning. Vald ${selectedWindLabel}, ${selectedDegrees} grader`}
        accessibilityRole="button"
        hitSlop={6}
        onPress={handleCompassPress}
        style={[
          styles.compassPicker,
          {
            borderRadius: compassSize / 2,
            height: compassSize,
            marginTop: 20,
            width: compassSize,
          },
        ]}>
        {COMPASS_TICKS.map((degrees, index) => (
          <View
            key={degrees}
            pointerEvents="none"
            style={[styles.compassTickRing, { transform: [{ rotate: `${degrees}deg` }] }]}>
            <View style={index % 6 === 0 ? styles.compassMajorTick : styles.compassTick} />
          </View>
        ))}

        {COMPASS_DIRECTIONS.map((item) => (
          <Text
            key={item.label}
            pointerEvents="none"
            style={[
              styles.compassLabel,
              item.label === selectedWindLabel ? styles.compassLabelSelected : null,
              getCompassLabelStyle(item.degrees, compassSize),
            ]}>
            {item.label}
          </Text>
        ))}

        <View
          pointerEvents="none"
          style={[styles.windNeedleRing, { paddingTop: compassSize * 0.14 }]}>
          <View
            style={[
              styles.windNeedle,
              {
                transform: [{ rotate: `${selectedDegrees}deg` }],
              },
            ]}>
            <Ionicons
              accessibilityElementsHidden
              importantForAccessibility="no"
              name="caret-up"
              size={34}
              color={APP_COLORS.primary}
            />
            <View style={[styles.windNeedleStem, { height: compassSize * 0.21 }]} />
          </View>
        </View>

        <View pointerEvents="none" style={styles.compassCenterBadge}>
          <Text style={styles.compassCenterLabel}>{selectedWindLabel}</Text>
          <Text style={styles.compassCenterDegrees}>{selectedDegrees}°</Text>
        </View>

        <View pointerEvents="none" style={styles.northNeedle}>
          <Ionicons
            accessibilityElementsHidden
            importantForAccessibility="no"
            name="caret-up"
            size={20}
            color="#FF4B4B"
            style={styles.northNeedleIcon}
          />
        </View>
      </Pressable>

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

const styles = StyleSheet.create({
  compassCenterBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(19, 23, 37, 0.94)',
    borderColor: 'rgba(143, 232, 165, 0.34)',
    borderRadius: 34,
    borderWidth: 1,
    height: 68,
    justifyContent: 'center',
    left: '50%',
    marginLeft: -34,
    marginTop: -34,
    position: 'absolute',
    top: '50%',
    width: 68,
  } satisfies ViewStyle,
  compassCenterDegrees: {
    color: 'rgba(255, 255, 255, 0.72)',
    fontSize: 12,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
    lineHeight: 15,
  } satisfies TextStyle,
  compassCenterLabel: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 26,
  } satisfies TextStyle,
  compassLabel: {
    color: 'rgba(255, 255, 255, 0.54)',
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 18,
    position: 'absolute',
    textAlign: 'center',
  } satisfies TextStyle,
  compassLabelSelected: {
    color: APP_COLORS.primary,
    fontSize: 13,
  } satisfies TextStyle,
  compassMajorTick: {
    backgroundColor: 'rgba(255, 255, 255, 0.74)',
    borderRadius: 999,
    height: 14,
    width: 2,
  } satisfies ViewStyle,
  compassPicker: {
    alignItems: 'center',
    backgroundColor: 'rgba(17, 20, 38, 0.98)',
    borderColor: 'rgba(112, 92, 207, 0.72)',
    borderWidth: 2,
    justifyContent: 'center',
    overflow: 'hidden',
  } satisfies ViewStyle,
  compassTick: {
    backgroundColor: 'rgba(255, 255, 255, 0.32)',
    borderRadius: 999,
    height: 8,
    width: 1,
  } satisfies ViewStyle,
  compassTickRing: {
    alignItems: 'center',
    bottom: 0,
    left: 0,
    paddingTop: 8,
    position: 'absolute',
    right: 0,
    top: 0,
  } satisfies ViewStyle,
  northNeedle: {
    alignItems: 'center',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  } satisfies ViewStyle,
  northNeedleIcon: {
    transform: [{ translateY: -4 }],
  } satisfies TextStyle,
  windNeedle: {
    alignItems: 'center',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  } satisfies ViewStyle,
  windNeedleRing: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  } satisfies ViewStyle,
  windNeedleStem: {
    backgroundColor: APP_COLORS.primary,
    borderRadius: 999,
    marginTop: -2,
    opacity: 0.86,
    width: 4,
  } satisfies ViewStyle,
});
