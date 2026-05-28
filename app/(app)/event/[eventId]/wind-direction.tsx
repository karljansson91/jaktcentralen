import { ScentPlumeLayer } from '@/components/event/scent-plume-layer';
import { GlassIconButton } from '@/components/glass/glass-icon-button';
import { GlassSurface } from '@/components/glass/glass-surface';
import { Text } from '@/components/ui';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { getCurrentUserCoordinate } from '@/lib/location';
import {
  getCachedMapStyle,
  getSavedMapStyle,
  subscribeToMapStyleChanges,
} from '@/lib/map-styles';
import { APP_COLORS } from '@/lib/theme';
import {
  getWindDirectionDisplay,
  normalizeDegrees,
  oppositeDirectionDegrees,
} from '@/lib/wind-direction';
import { publishWindDirectionSelection } from '@/lib/wind-direction-selection';
import { Ionicons } from '@expo/vector-icons';
import { Camera, LocationPuck, MapView } from '@rnmapbox/maps';
import { useQuery } from 'convex/react';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  PanResponder,
  Pressable,
  Vibration,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const COMPASS_TOUCH_DEAD_ZONE = 10;
const FALLBACK_MAP_CENTER: [number, number] = [16, 62];
const FALLBACK_MAP_ZOOM = 4;
const USER_WIND_MAP_ZOOM = 15;

const COMPASS_LABELS = [
  { label: 'N', style: { left: '50%', top: 4, transform: [{ translateX: -7 }] } },
  { label: 'NO', style: { right: 15, top: 17 } },
  { label: 'O', style: { right: 6, top: '50%', transform: [{ translateY: -8 }] } },
  { label: 'SO', style: { bottom: 17, right: 15 } },
  { label: 'S', style: { bottom: 4, left: '50%', transform: [{ translateX: -6 }] } },
  { label: 'SV', style: { bottom: 17, left: 15 } },
  { label: 'V', style: { left: 6, top: '50%', transform: [{ translateY: -8 }] } },
  { label: 'NV', style: { left: 15, top: 17 } },
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
  const [mapStyleURL, setMapStyleURL] = useState(() => getCachedMapStyle().styleURL);
  const [currentCoordinate, setCurrentCoordinate] = useState<[number, number] | null>(null);
  const [isLocatingUser, setIsLocatingUser] = useState(true);
  const compassSize = Math.min(148, Math.max(124, width * 0.34));

  const event = useQuery(api.events.get, {
    eventId: eventId as Id<'events'>,
  });

  const close = useCallback(() => {
    if (canGoBack()) {
      back();
      return;
    }

    replace(`/event/${eventId}`);
  }, [back, canGoBack, eventId, replace]);

  useEffect(() => {
    return subscribeToMapStyleChanges((style) => {
      setMapStyleURL(style.styleURL);
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      void getSavedMapStyle().then((style) => {
        if (!cancelled) {
          setMapStyleURL((current) => (current === style.styleURL ? current : style.styleURL));
        }
      });

      setIsLocatingUser(true);
      void getCurrentUserCoordinate()
        .then((coordinate) => {
          if (!cancelled) {
            setCurrentCoordinate(coordinate ?? null);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setCurrentCoordinate(null);
          }
        })
        .finally(() => {
          if (!cancelled) {
            setIsLocatingUser(false);
          }
        });

      return () => {
        cancelled = true;
      };
    }, [])
  );

  const updateDraftFromTouch = useCallback(
    (x: number, y: number) => {
      const nextDegrees = degreesFromTouch(x, y, compassSize);
      if (nextDegrees == null) {
        return;
      }

      setDraftDegrees(nextDegrees);
    },
    [compassSize]
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

  const windDisplay = getWindDirectionDisplay(draftDegrees);
  const scentPreviewDirection = oppositeDirectionDegrees(draftDegrees);
  const mapCenterCoordinate = currentCoordinate ?? FALLBACK_MAP_CENTER;
  const mapZoomLevel = currentCoordinate ? USER_WIND_MAP_ZOOM : FALLBACK_MAP_ZOOM;

  const handleApply = useCallback(() => {
    Vibration.vibrate(8);
    publishWindDirectionSelection(draftDegrees);
    close();
  }, [close, draftDegrees]);

  const handleClear = useCallback(() => {
    Vibration.vibrate(8);
    publishWindDirectionSelection(null);
    close();
  }, [close]);

  const loading = event === undefined || isLocatingUser;

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="small" color={APP_COLORS.primary} />
      </View>
    );
  }

  if (event === null) {
    return (
      <View className="flex-1 items-center justify-center bg-background p-6">
        <Text variant="h3">Jakten hittades inte</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: APP_COLORS.background }}>
      <MapView
        attributionEnabled={false}
        pitchEnabled={false}
        rotateEnabled={false}
        scrollEnabled
        style={{ flex: 1 }}
        styleURL={mapStyleURL}
        zoomEnabled>
        <Camera
          centerCoordinate={mapCenterCoordinate}
          zoomLevel={mapZoomLevel}
          animationDuration={0}
        />
        <LocationPuck puckBearing="heading" puckBearingEnabled />

        {currentCoordinate ? (
          <ScentPlumeLayer
            directionDegrees={scentPreviewDirection}
            originCoordinate={currentCoordinate}
          />
        ) : null}
      </MapView>

      <View pointerEvents="box-none" className="absolute bottom-0 left-0 right-0 top-0">
        <View
          pointerEvents="box-none"
          className="absolute left-4 right-4 flex-row items-center justify-between gap-3"
          style={{ top: Math.max(insets.top, 12) + 8 }}>
          <GlassIconButton
            icon="chevron-back"
            iconSize={21}
            onPress={close}
            accessibilityLabel="Gå tillbaka"
            surfaceClassName="size-11"
          />
          <GlassSurface
            tone="dark"
            className="rounded-[28px]"
            style={{ height: 44 }}
            contentClassName="h-full items-center justify-center px-5">
            <Text className="text-[16px] font-semibold text-white">Vindriktning</Text>
          </GlassSurface>
          <View style={{ width: 44 }} />
        </View>

        <View
          className="absolute left-4 right-4 rounded-[28px] border border-border bg-background/95 p-4"
          style={{ bottom: Math.max(insets.bottom, 16) + 8, boxShadow: '0 18px 42px rgba(49, 52, 68, 0.18)' }}>
          <View className="flex-row items-center justify-between gap-4">
            <View className="min-w-0 flex-1 gap-2">
              <Text className="text-sm font-semibold uppercase text-muted-foreground">
                Vind från
              </Text>
              <Text className="text-4xl font-black leading-[44px] text-foreground">
                {windDisplay.label} {draftDegrees}°
              </Text>
              {initialWindDirectionDegrees != null ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Rensa vindriktning"
                  className="self-start rounded-full border border-border px-4 py-2 active:bg-muted"
                  onPress={handleClear}>
                  <Text className="text-sm font-semibold text-foreground">Rensa</Text>
                </Pressable>
              ) : null}
            </View>

            <View
              {...panResponder.panHandlers}
              accessibilityLabel="Välj vindriktning"
              accessibilityRole="adjustable"
              className="rounded-full border border-border bg-card"
              style={{ height: compassSize, width: compassSize }}>
              {COMPASS_LABELS.map((item) => (
                <Text
                  key={item.label}
                  className="absolute text-[10px] font-bold leading-[12px] text-muted-foreground"
                  style={item.style}>
                  {item.label}
                </Text>
              ))}
              <View className="absolute inset-8 items-center justify-center rounded-full border border-border bg-background/90">
                <View
                  className="size-12 items-center justify-center rounded-full bg-primary"
                  style={{ transform: [{ rotateZ: `${draftDegrees}deg` }] }}>
                  <Ionicons name="arrow-up" size={28} color={APP_COLORS.surface} />
                </View>
              </View>
            </View>
          </View>

          <View className="mt-4 flex-row gap-3">
            <Pressable
              accessibilityRole="button"
              className="h-12 flex-1 items-center justify-center rounded-2xl border border-border bg-card active:bg-muted"
              onPress={close}>
              <Text className="font-semibold text-foreground">Avbryt</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              className="h-12 flex-1 items-center justify-center rounded-2xl bg-primary active:opacity-90"
              onPress={handleApply}>
              <Text className="font-semibold text-primary-foreground">Klar</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}
