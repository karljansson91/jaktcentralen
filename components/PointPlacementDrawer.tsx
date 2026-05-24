import { Button, Text } from '@/components/ui';
import {
  getCachedMapStyle,
  getSavedMapStyle,
  subscribeToMapStyleChanges,
} from '@/lib/map-styles';
import { APP_COLORS } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import {
  Camera,
  CircleLayer,
  LocationPuck,
  MapView,
  ShapeSource,
} from '@rnmapbox/maps';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LngLat } from './PolygonDrawer';

function hasPointChanged(current?: LngLat, initial?: LngLat) {
  return JSON.stringify(current ?? null) !== JSON.stringify(initial ?? null);
}

export function PointPlacementDrawer({
  initialPoint,
  onCancel,
  onComplete,
}: {
  initialPoint?: LngLat;
  onCancel: () => void;
  onComplete: (point: LngLat) => void;
}) {
  const insets = useSafeAreaInsets();
  const [point, setPoint] = useState<LngLat | undefined>(initialPoint);
  const [mapStyleURL, setMapStyleURL] = useState(() => getCachedMapStyle().styleURL);

  useEffect(() => {
    let cancelled = false;
    const unsubscribe = subscribeToMapStyleChanges((style) => {
      setMapStyleURL(style.styleURL);
    });

    void getSavedMapStyle().then((style) => {
      if (!cancelled) {
        setMapStyleURL((current) => (current === style.styleURL ? current : style.styleURL));
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const pointGeoJSON = useMemo(() => {
    if (!point) return null;

    return {
      type: 'Feature' as const,
      properties: {},
      geometry: {
        type: 'Point' as const,
        coordinates: point,
      },
    };
  }, [point]);

  const handleMapPress = useCallback((feature: GeoJSON.Feature) => {
    const coordinates = (feature.geometry as GeoJSON.Point).coordinates as LngLat;
    setPoint(coordinates);
  }, []);

  const hasChanges = hasPointChanged(point, initialPoint);

  return (
    <View className="flex-1">
      <MapView
        style={{ flex: 1 }}
        styleURL={mapStyleURL}
        onPress={handleMapPress}
        rotateEnabled={false}
        pitchEnabled={false}>
        <Camera
          zoomLevel={initialPoint ? 15 : 4}
          centerCoordinate={initialPoint ?? ([16, 62] as LngLat)}
          animationDuration={0}
        />
        <LocationPuck puckBearingEnabled puckBearing="heading" />

        {pointGeoJSON ? (
          <ShapeSource id="placement-point" shape={pointGeoJSON}>
            <CircleLayer
              id="placement-point-ring"
              style={{
                circleColor: APP_COLORS.surface,
                circleRadius: 14,
                circleStrokeColor: APP_COLORS.primary,
                circleStrokeWidth: 3,
              }}
            />
            <CircleLayer
              id="placement-point-center"
              style={{
                circleColor: APP_COLORS.primary,
                circleRadius: 6,
              }}
            />
          </ShapeSource>
        ) : null}
      </MapView>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Stäng"
        hitSlop={12}
        onPress={onCancel}
        className="absolute right-4 size-11 items-center justify-center rounded-full bg-background/95"
        style={{
          top: Math.max(insets.top, 12) + 8,
          boxShadow: '0 8px 22px rgba(49, 52, 68, 0.18)',
        }}>
        <Ionicons name="close" size={24} color={APP_COLORS.text} />
      </Pressable>

      <View
        className="absolute left-4 right-4 flex-row justify-center gap-3"
        style={{ bottom: Math.max(insets.bottom, 16) + 16 }}>
        <Button
          variant="outline"
          className="flex-1 bg-background"
          onPress={() => setPoint(initialPoint)}
          disabled={!hasChanges}>
          <Text>Ångra</Text>
        </Button>
        <Button
          className="flex-1"
          onPress={() => {
            if (point) {
              onComplete(point);
            }
          }}
          disabled={!point || !hasChanges}>
          <Text>spara</Text>
        </Button>
      </View>

      <View className="absolute left-4 right-4 top-16 items-center pointer-events-none">
        <View className="rounded-full bg-black/70 px-4 py-2">
          <Text className="text-sm text-white">Tryck på kartan för att flytta punkten</Text>
        </View>
      </View>
    </View>
  );
}
