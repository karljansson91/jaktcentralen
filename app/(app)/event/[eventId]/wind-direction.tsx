import { AreaFeatureLayers } from '@/components/AreaFeatureLayers';
import { ScentPlumeLayer } from '@/components/event/scent-plume-layer';
import { Text } from '@/components/ui';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { buildAreaPolygonFeature, getAreaCameraBounds } from '@/lib/area-map';
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
import {
  Camera,
  FillLayer,
  LineLayer,
  LocationPuck,
  MapView,
  ShapeSource,
} from '@rnmapbox/maps';
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

const COMPASS_TOUCH_DEAD_ZONE = 18;

const COMPASS_LABELS = [
  { label: 'N', style: { left: '50%', top: 5, transform: [{ translateX: -8 }] } },
  { label: 'NO', style: { right: 24, top: 30 } },
  { label: 'O', style: { right: 9, top: '50%', transform: [{ translateY: -9 }] } },
  { label: 'SO', style: { bottom: 30, right: 24 } },
  { label: 'S', style: { bottom: 5, left: '50%', transform: [{ translateX: -7 }] } },
  { label: 'SV', style: { bottom: 30, left: 24 } },
  { label: 'V', style: { left: 9, top: '50%', transform: [{ translateY: -9 }] } },
  { label: 'NV', style: { left: 24, top: 30 } },
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
  const compassSize = Math.min(252, Math.max(212, width - 64));

  const event = useQuery(api.events.get, {
    eventId: eventId as Id<'events'>,
  });
  const area = useQuery(
    api.areas.getForEvent,
    event ? { eventId: eventId as Id<'events'> } : 'skip'
  );
  const areaFeatures = useQuery(
    api.areaFeatures.listForEvent,
    event ? { eventId: eventId as Id<'events'> } : 'skip'
  );

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

      void getCurrentUserCoordinate().then((coordinate) => {
        if (!cancelled && coordinate) {
          setCurrentCoordinate(coordinate);
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

  const polygonGeoJSON = useMemo(() => {
    if (!area) return null;
    return buildAreaPolygonFeature(area);
  }, [area]);

  const cameraBounds = useMemo(() => {
    if (!area) return null;
    return getAreaCameraBounds(area, {
      top: Math.max(insets.top + 32, 64),
      bottom: Math.max(insets.bottom + 328, 360),
      left: 32,
      right: 32,
    });
  }, [area, insets.bottom, insets.top]);

  const windDisplay = getWindDirectionDisplay(draftDegrees);
  const scentPreviewDirection = oppositeDirectionDegrees(draftDegrees);

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

  const loading =
    event === undefined ||
    (event !== null && area === undefined) ||
    (event !== null &&
      area !== null &&
      (areaFeatures === undefined || cameraBounds === null));

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="small" color={APP_COLORS.primary} />
      </View>
    );
  }

  if (event === null || area === null) {
    return (
      <View className="flex-1 items-center justify-center bg-background p-6">
        <Text variant="h3">Kartan hittades inte</Text>
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
        {cameraBounds && <Camera bounds={cameraBounds} animationDuration={0} />}
        <LocationPuck puckBearing="heading" puckBearingEnabled />

        {polygonGeoJSON && (
          <ShapeSource id="wind-area-polygon" shape={polygonGeoJSON}>
            <FillLayer id="wind-area-fill" style={{ fillColor: APP_COLORS.mapAreaFill }} />
            <LineLayer
              id="wind-area-line"
              style={{ lineColor: APP_COLORS.mapAreaLine, lineWidth: 2.5 }}
            />
          </ShapeSource>
        )}

        {currentCoordinate ? (
          <ScentPlumeLayer
            directionDegrees={scentPreviewDirection}
            originCoordinate={currentCoordinate}
          />
        ) : null}

        <AreaFeatureLayers
          features={areaFeatures ?? []}
          idPrefix="wind-area-features"
        />
      </MapView>

      <View pointerEvents="box-none" className="absolute bottom-0 left-0 right-0 top-0">
        <View
          className="absolute left-4 right-4 rounded-[28px] border border-border bg-background/95 p-4"
          style={{ bottom: Math.max(insets.bottom, 16) + 8, boxShadow: '0 18px 42px rgba(49, 52, 68, 0.18)' }}>
          <View className="flex-row items-center justify-between gap-3">
            <View>
              <Text className="text-sm font-semibold uppercase text-muted-foreground">
                Vind från
              </Text>
              <Text className="text-3xl font-black text-foreground">
                {windDisplay.label} {draftDegrees}°
              </Text>
            </View>
            {initialWindDirectionDegrees != null ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Rensa vindriktning"
                className="rounded-full border border-border px-4 py-2 active:bg-muted"
                onPress={handleClear}>
                <Text className="text-sm font-semibold text-foreground">Rensa</Text>
              </Pressable>
            ) : null}
          </View>

          <View
            {...panResponder.panHandlers}
            accessibilityLabel="Välj vindriktning"
            accessibilityRole="adjustable"
            className="mt-4 self-center rounded-full border border-border bg-card"
            style={{ height: compassSize, width: compassSize }}>
            {COMPASS_LABELS.map((item) => (
              <Text
                key={item.label}
                className="absolute text-xs font-bold text-muted-foreground"
                style={item.style}>
                {item.label}
              </Text>
            ))}
            <View className="absolute inset-12 items-center justify-center rounded-full border border-border bg-background">
              <View
                className="size-20 items-center justify-center rounded-full bg-primary"
                style={{ transform: [{ rotateZ: `${draftDegrees}deg` }] }}>
                <Ionicons name="arrow-up" size={42} color={APP_COLORS.surface} />
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
