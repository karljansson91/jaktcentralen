import { Button, Text } from '@/components/ui';
import { useInitialPolygonCamera } from '@/hooks/use-initial-polygon-camera';
import { usePolygonEditing } from '@/hooks/use-polygon-editing';
import type { LngLat } from '@/lib/geo';
import { APP_COLORS } from '@/lib/theme';
import {
  getCachedMapStyle,
  getSavedMapStyle,
  subscribeToMapStyleChanges,
} from '@/lib/map-styles';
import { Ionicons } from '@expo/vector-icons';
import {
  Camera,
  CircleLayer,
  FillLayer,
  LineLayer,
  LocationPuck,
  MapView,
  ShapeSource,
} from '@rnmapbox/maps';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type { LngLat } from '@/lib/geo';

function buildShapeGeoJSON(points: LngLat[]): GeoJSON.Feature {
  if (points.length >= 3) {
    return {
      type: 'Feature',
      properties: {},
      geometry: { type: 'Polygon', coordinates: [[...points, points[0]]] },
    };
  }
  return {
    type: 'Feature',
    properties: {},
    geometry: { type: 'LineString', coordinates: points },
  };
}

function buildVerticesGeoJSON(
  points: LngLat[],
  draggingIndex: number | null
): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: points.map((p, i) => ({
      type: 'Feature',
      properties: { index: i, dragging: i === draggingIndex },
      geometry: { type: 'Point', coordinates: p },
    })),
  };
}

function buildMidpointsGeoJSON(points: LngLat[]): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    features.push({
      type: 'Feature',
      properties: { insertAfter: i },
      geometry: {
        type: 'Point',
        coordinates: [
          (points[i][0] + points[i + 1][0]) / 2,
          (points[i][1] + points[i + 1][1]) / 2,
        ],
      },
    });
  }
  if (points.length >= 3) {
    const last = points[points.length - 1];
    const first = points[0];
    features.push({
      type: 'Feature',
      properties: { insertAfter: points.length - 1 },
      geometry: {
        type: 'Point',
        coordinates: [(last[0] + first[0]) / 2, (last[1] + first[1]) / 2],
      },
    });
  }
  return { type: 'FeatureCollection', features };
}

interface PolygonDrawerProps {
  initialPoints?: LngLat[];
  onComplete: (points: LngLat[]) => void;
  onCancel: () => void;
}

export function PolygonDrawer({ initialPoints, onComplete, onCancel }: PolygonDrawerProps) {
  const mapRef = useRef<MapView | null>(null);
  const insets = useSafeAreaInsets();
  const [mapStyleURL, setMapStyleURL] = useState(() => getCachedMapStyle().styleURL);
  const initialCamera = useInitialPolygonCamera(initialPoints);
  const {
    draggingVertex,
    handleDone,
    handleMapPress,
    handleTouchEnd,
    handleTouchMove,
    handleTouchStart,
    handleUndo,
    hasChanges,
    isDragging,
    polygonPoints,
  } = usePolygonEditing({ initialPoints, mapRef, onComplete });

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

  // --- Derived data ---

  const shapeGeoJSON = useMemo(
    () => (polygonPoints.length >= 2 ? buildShapeGeoJSON(polygonPoints) : null),
    [polygonPoints],
  );
  const verticesGeoJSON = useMemo(
    () => buildVerticesGeoJSON(polygonPoints, draggingVertex),
    [polygonPoints, draggingVertex],
  );
  const midpointsGeoJSON = useMemo(
    () => buildMidpointsGeoJSON(polygonPoints),
    [polygonPoints],
  );

  return (
    <View
      style={{ flex: 1 }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        styleURL={mapStyleURL}
        onPress={handleMapPress}
        scrollEnabled={!isDragging}
        zoomEnabled={!isDragging}
        rotateEnabled={!isDragging}
        pitchEnabled={!isDragging}
      >
        {'bounds' in initialCamera ? (
          <Camera bounds={initialCamera.bounds} animationDuration={0} />
        ) : (
          <Camera
            zoomLevel={initialCamera.zoomLevel}
            centerCoordinate={initialCamera.centerCoordinate}
          />
        )}
        <LocationPuck puckBearingEnabled puckBearing="heading" />

        {shapeGeoJSON && (
          <ShapeSource id="polygon-shape" shape={shapeGeoJSON}>
            <FillLayer
              id="polygon-fill"
              style={{ fillColor: 'rgba(34, 197, 94, 0.2)' }}
              filter={['==', '$type', 'Polygon']}
            />
            <LineLayer
              id="polygon-line"
              style={{ lineColor: 'rgb(34, 197, 94)', lineWidth: 2 }}
            />
          </ShapeSource>
        )}

        {/* Midpoints */}
        {!isDragging && polygonPoints.length >= 2 && (
          <ShapeSource
            id="midpoints"
            shape={midpointsGeoJSON}
            hitbox={{ width: 30, height: 30 }}
          >
            <CircleLayer
              id="midpoint-circles"
              style={{
                circleRadius: 6,
                circleColor: 'rgb(34, 197, 94)',
                circleOpacity: 0.4,
              }}
            />
          </ShapeSource>
        )}

        {/* Vertices */}
        {polygonPoints.length > 0 && (
          <ShapeSource id="vertices" shape={verticesGeoJSON}>
            <CircleLayer
              id="vertex-dragging"
              filter={['==', ['get', 'dragging'], true]}
              style={{
                circleRadius: 14,
                circleColor: 'rgb(220, 252, 231)',
                circleStrokeColor: 'rgb(22, 163, 74)',
                circleStrokeWidth: 3,
              }}
            />
            <CircleLayer
              id="vertex-normal"
              filter={['==', ['get', 'dragging'], false]}
              style={{
                circleRadius: 10,
                circleColor: 'white',
                circleStrokeColor: 'rgb(34, 197, 94)',
                circleStrokeWidth: 2,
              }}
            />
          </ShapeSource>
        )}
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

      {/* Drawing toolbar */}
      <View
        className="absolute left-4 right-4 flex-row justify-center gap-3"
        style={{ bottom: Math.max(insets.bottom, 16) + 16 }}>
        <Button
          variant="outline"
          className="flex-1 bg-background"
          onPress={handleUndo}
          disabled={polygonPoints.length === 0}
        >
          <Text>Ångra</Text>
        </Button>
        <Button
          className="flex-1"
          onPress={handleDone}
          disabled={polygonPoints.length < 3 || !hasChanges}
        >
          <Text>spara</Text>
        </Button>
      </View>

      {/* Drag hint */}
      {isDragging && (
        <View className="absolute left-4 right-4 top-16 items-center pointer-events-none">
          <View className="rounded-full bg-black/70 px-4 py-2">
            <Text className="text-sm text-white">Dra för att flytta punkt</Text>
          </View>
        </View>
      )}
    </View>
  );
}
