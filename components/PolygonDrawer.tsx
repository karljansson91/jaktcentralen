import { Button, Text } from '@/components/ui';
import {
  Camera,
  CircleLayer,
  FillLayer,
  LineLayer,
  LocationPuck,
  MapView,
  ShapeSource,
} from '@rnmapbox/maps';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';

export type LngLat = [number, number];

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

function buildVerticesGeoJSON(points: LngLat[], draggingIndex: number | null): GeoJSON.FeatureCollection {
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
        coordinates: [(points[i][0] + points[i + 1][0]) / 2, (points[i][1] + points[i + 1][1]) / 2],
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
  const mapRef = useRef<MapView>(null);
  const [polygonPoints, setPolygonPoints] = useState<LngLat[]>(initialPoints ?? []);
  const [draggingVertex, setDraggingVertex] = useState<number | null>(null);

  const draggingRef = useRef<number | null>(null);
  const suppressMapPress = useRef(false);

  // --- Touch handlers for vertex dragging ---

  const handleTouchStart = useCallback(
    async (e: any) => {
      if (!mapRef.current || polygonPoints.length === 0) return;
      const { pageX, pageY } = e.nativeEvent;

      for (let i = 0; i < polygonPoints.length; i++) {
        const screenPt = await mapRef.current.getPointInView(polygonPoints[i]);
        const dx = pageX - screenPt[0];
        const dy = pageY - screenPt[1];
        if (dx * dx + dy * dy < 40 * 40) {
          draggingRef.current = i;
          suppressMapPress.current = true;
          setDraggingVertex(i);
          return;
        }
      }
    },
    [polygonPoints],
  );

  const handleTouchMove = useCallback(async (e: any) => {
    if (draggingRef.current === null || !mapRef.current) return;
    const { pageX, pageY } = e.nativeEvent;
    const coords = await mapRef.current.getCoordinateFromView([pageX, pageY]);
    const idx = draggingRef.current;
    setPolygonPoints((prev) => {
      const updated = [...prev];
      updated[idx] = coords as LngLat;
      return updated;
    });
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (draggingRef.current !== null) {
      draggingRef.current = null;
      setDraggingVertex(null);
      setTimeout(() => {
        suppressMapPress.current = false;
      }, 50);
    }
  }, []);

  const handleMapPress = useCallback(
    (feature: GeoJSON.Feature) => {
      if (suppressMapPress.current) {
        suppressMapPress.current = false;
        return;
      }
      const coords = (feature.geometry as GeoJSON.Point).coordinates as LngLat;
      setPolygonPoints((prev) => [...prev, coords]);
    },
    [],
  );

  const handleMidpointPress = useCallback((e: any) => {
    suppressMapPress.current = true;
    const insertAfter = e.features?.[0]?.properties?.insertAfter;
    if (insertAfter !== undefined) {
      setPolygonPoints((prev) => {
        const updated = [...prev];
        const a = prev[insertAfter];
        const b = prev[(insertAfter + 1) % prev.length];
        const mid: LngLat = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
        updated.splice(insertAfter + 1, 0, mid);
        return updated;
      });
    }
  }, []);

  const handleUndo = useCallback(() => {
    setDraggingVertex(null);
    draggingRef.current = null;
    setPolygonPoints((prev) => prev.slice(0, -1));
  }, []);

  const handleDone = useCallback(() => {
    if (polygonPoints.length < 3) return;
    setDraggingVertex(null);
    draggingRef.current = null;
    onComplete(polygonPoints);
  }, [polygonPoints, onComplete]);

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

  const isDragging = draggingVertex !== null;

  // Camera: if we have initial points, fit to their bounds; otherwise default to Sweden
  const initialCamera = useMemo(() => {
    if (initialPoints && initialPoints.length >= 2) {
      const lngs = initialPoints.map((p) => p[0]);
      const lats = initialPoints.map((p) => p[1]);
      return {
        bounds: {
          ne: [Math.max(...lngs), Math.max(...lats)] as [number, number],
          sw: [Math.min(...lngs), Math.min(...lats)] as [number, number],
          paddingTop: 80,
          paddingBottom: 120,
          paddingLeft: 40,
          paddingRight: 40,
        },
      };
    }
    return {
      zoomLevel: 4,
      centerCoordinate: [16, 62] as [number, number],
    };
  }, [initialPoints]);

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
        styleURL="mapbox://styles/mapbox/outdoors-v12"
        onPress={handleMapPress}
        scrollEnabled={!isDragging}
        zoomEnabled={!isDragging}
        rotateEnabled={!isDragging}
        pitchEnabled={!isDragging}
      >
        {'bounds' in initialCamera ? (
          <Camera bounds={initialCamera.bounds} animationDuration={0} />
        ) : (
          <Camera zoomLevel={initialCamera.zoomLevel} centerCoordinate={initialCamera.centerCoordinate} />
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
            onPress={handleMidpointPress}
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

      {/* Drawing toolbar */}
      <View className="absolute bottom-10 left-4 right-4 flex-row justify-center gap-3">
        <Button variant="outline" className="flex-1 bg-background" onPress={onCancel}>
          <Text>Avbryt</Text>
        </Button>
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
          disabled={polygonPoints.length < 3}
        >
          <Text>Klar</Text>
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
