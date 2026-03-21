import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import Mapbox, {
  Camera,
  CircleLayer,
  FillLayer,
  LineLayer,
  LocationPuck,
  MapView,
  ShapeSource,
} from '@rnmapbox/maps';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';

Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? '');

type LngLat = [number, number];

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

export default function HomeScreen() {
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [polygonPoints, setPolygonPoints] = useState<LngLat[]>([]);
  const [draggingVertex, setDraggingVertex] = useState<number | null>(null);

  // Ref mirrors draggingVertex for synchronous access in touch handlers
  const draggingRef = useRef<number | null>(null);
  // Prevent map onPress from firing when we just grabbed a vertex
  const suppressMapPress = useRef(false);

  React.useEffect(() => {
    Location.requestForegroundPermissionsAsync();
  }, []);

  // --- Touch handlers on parent View for drag ---

  const handleTouchStart = useCallback(
    async (e: any) => {
      if (!isDrawing || !mapRef.current || polygonPoints.length === 0) return;
      const { pageX, pageY } = e.nativeEvent;

      // Check if finger landed on/near a vertex
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
    [isDrawing, polygonPoints],
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
      // Keep suppressMapPress true briefly so the onPress that follows touchEnd is ignored
      setTimeout(() => {
        suppressMapPress.current = false;
      }, 50);
    }
  }, []);

  // --- Map handlers ---

  const handleMapPress = useCallback(
    (feature: GeoJSON.Feature) => {
      if (!isDrawing) return;
      if (suppressMapPress.current) {
        suppressMapPress.current = false;
        return;
      }
      const coords = (feature.geometry as GeoJSON.Point).coordinates as LngLat;
      setPolygonPoints((prev) => [...prev, coords]);
    },
    [isDrawing],
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

  const handleCancel = useCallback(() => {
    setIsDrawing(false);
    setDraggingVertex(null);
    draggingRef.current = null;
    setPolygonPoints([]);
  }, []);

  const handleDone = useCallback(() => {
    if (polygonPoints.length < 3) return;
    setIsDrawing(false);
    setDraggingVertex(null);
    draggingRef.current = null;
    router.push({
      pathname: '/create-hunt',
      params: { area: JSON.stringify(polygonPoints) },
    });
  }, [polygonPoints, router]);

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
        <Camera zoomLevel={4} centerCoordinate={[16, 62]} />
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
        {isDrawing && !isDragging && polygonPoints.length >= 2 && (
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
        {isDrawing && polygonPoints.length > 0 && (
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

      {/* FAB */}
      {!isDrawing && (
        <Pressable
          onPress={() => setIsDrawing(true)}
          className="absolute bottom-10 right-4 h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg"
        >
          <Ionicons name="add" size={28} color="white" />
        </Pressable>
      )}

      {/* Drawing toolbar */}
      {isDrawing && (
        <View className="absolute bottom-10 left-4 right-4 flex-row justify-center gap-3">
          <Button variant="outline" className="flex-1 bg-background" onPress={handleCancel}>
            <Text>Cancel</Text>
          </Button>
          <Button
            variant="outline"
            className="flex-1 bg-background"
            onPress={handleUndo}
            disabled={polygonPoints.length === 0}
          >
            <Text>Undo</Text>
          </Button>
          <Button
            className="flex-1"
            onPress={handleDone}
            disabled={polygonPoints.length < 3}
          >
            <Text>Done</Text>
          </Button>
        </View>
      )}

      {/* Drag hint */}
      {isDragging && (
        <View className="absolute left-4 right-4 top-16 items-center pointer-events-none">
          <View className="rounded-full bg-black/70 px-4 py-2">
            <Text className="text-sm text-white">Drag to move point</Text>
          </View>
        </View>
      )}
    </View>
  );
}
