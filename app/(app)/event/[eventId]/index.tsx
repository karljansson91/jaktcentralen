import { IconButton, Text } from '@/components/ui';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { getCurrentUserCoordinate } from '@/lib/location';
import { Ionicons } from '@expo/vector-icons';
import {
  Camera,
  CircleLayer,
  FillLayer,
  LineLayer,
  LocationPuck,
  MapView,
  ShapeSource,
  SymbolLayer,
} from '@rnmapbox/maps';
import { useMutation, useQuery } from 'convex/react';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { type ElementRef, useCallback, useEffect, useMemo, useRef } from 'react';
import { ActivityIndicator, Alert, View } from 'react-native';

const POINT_TYPE_COLORS: Record<string, string> = {
  pass: '#ef4444',
  tower: '#8b5cf6',
  meeting: '#3b82f6',
  parking: '#6b7280',
  other: '#f59e0b',
};

export default function EventMapScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const router = useRouter();
  const cameraRef = useRef<ElementRef<typeof Camera>>(null);

  const event = useQuery(api.events.get, {
    eventId: eventId as Id<'events'>,
  });
  const area = useQuery(
    api.areas.getForEvent,
    event ? { eventId: eventId as Id<'events'> } : 'skip'
  );
  const members = useQuery(
    api.eventMembers.listMembers,
    event ? { eventId: eventId as Id<'events'> } : 'skip'
  );
  const areaPoints = useQuery(
    api.areaPoints.listForEvent,
    event ? { eventId: eventId as Id<'events'> } : 'skip'
  );

  // GPS position tracking
  const updatePosition = useMutation(api.eventMembers.updatePosition);
  const watchRef = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    if (!event) return;

    let cancelled = false;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted' || cancelled) return;

      watchRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 10,
          timeInterval: 10_000,
        },
        (loc) => {
          void updatePosition({
            eventId: eventId as Id<'events'>,
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            heading: loc.coords.heading ?? undefined,
          }).catch((error) => {
            console.error('Failed to update event position:', error);
          });
        }
      );
    })().catch((error) => {
      if (!cancelled) {
        console.error('Failed to start location tracking:', error);
      }
    });

    return () => {
      cancelled = true;
      watchRef.current?.remove();
      watchRef.current = null;
    };
  }, [event, eventId, updatePosition]);

  const polygonGeoJSON = useMemo(() => {
    if (!area) return null;
    const coords = area.polygon.map(
      (p) => [p.longitude, p.latitude] as [number, number]
    );
    return {
      type: 'Feature' as const,
      properties: {},
      geometry: {
        type: 'Polygon' as const,
        coordinates: [[...coords, coords[0]]],
      },
    };
  }, [area]);

  const cameraBounds = useMemo(() => {
    if (!area || area.polygon.length < 2) return null;
    const lngs = area.polygon.map((p) => p.longitude);
    const lats = area.polygon.map((p) => p.latitude);
    return {
      ne: [Math.max(...lngs), Math.max(...lats)] as [number, number],
      sw: [Math.min(...lngs), Math.min(...lats)] as [number, number],
      paddingTop: 120,
      paddingBottom: 120,
      paddingLeft: 40,
      paddingRight: 40,
    };
  }, [area]);

  const memberPositionsGeoJSON = useMemo(() => {
    if (!members) return null;
    const features = members
      .filter((m) => m.lastLatitude != null && m.lastLongitude != null)
      .map((m) => ({
        type: 'Feature' as const,
        properties: {
          name: m.user?.name ?? 'Okänd',
          id: m._id,
        },
        geometry: {
          type: 'Point' as const,
          coordinates: [m.lastLongitude!, m.lastLatitude!],
        },
      }));
    return {
      type: 'FeatureCollection' as const,
      features,
    };
  }, [members]);

  const areaPointsGeoJSON = useMemo(() => {
    if (!areaPoints || areaPoints.length === 0) return null;
    const features = areaPoints.map((p) => ({
      type: 'Feature' as const,
      properties: {
        name: p.name,
        type: p.type,
        color: POINT_TYPE_COLORS[p.type] ?? '#f59e0b',
      },
      geometry: {
        type: 'Point' as const,
        coordinates: [p.longitude, p.latitude],
      },
    }));
    return {
      type: 'FeatureCollection' as const,
      features,
    };
  }, [areaPoints]);

  const handleGoToMyPosition = useCallback(async () => {
    try {
      const coordinate = await getCurrentUserCoordinate();
      if (!coordinate) {
        Alert.alert('Plats saknas', 'Ge appen platsbehörighet för att centrera kartan.');
        return;
      }

      cameraRef.current?.setCamera({
        centerCoordinate: coordinate,
        zoomLevel: 15,
        animationDuration: 1200,
        animationMode: 'flyTo',
      });
    } catch (error) {
      console.error('Failed to center on user position:', error);
      Alert.alert('Kunde inte hitta position', 'Försök igen om en stund.');
    }
  }, []);

  if (event === undefined) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="small" color="#2c4b31" />
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

  if (area === undefined || cameraBounds === null) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="small" color="#2c4b31" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <MapView
        style={{ flex: 1 }}
        styleURL="mapbox://styles/mapbox/outdoors-v12"
        scrollEnabled
        zoomEnabled
        rotateEnabled={false}
        pitchEnabled={false}
      >
        {cameraBounds && (
          <Camera ref={cameraRef} bounds={cameraBounds} animationDuration={0} />
        )}
        <LocationPuck puckBearingEnabled puckBearing="heading" />

        {/* Area polygon */}
        {polygonGeoJSON && (
          <ShapeSource id="area-polygon" shape={polygonGeoJSON}>
            <FillLayer
              id="area-fill"
              style={{ fillColor: 'rgba(34, 197, 94, 0.2)' }}
            />
            <LineLayer
              id="area-line"
              style={{ lineColor: 'rgb(34, 197, 94)', lineWidth: 2 }}
            />
          </ShapeSource>
        )}

        {/* Area points */}
        {areaPointsGeoJSON && (
          <ShapeSource id="area-points" shape={areaPointsGeoJSON}>
            <CircleLayer
              id="area-points-circle"
              style={{
                circleRadius: 6,
                circleColor: ['get', 'color'],
                circleStrokeColor: '#ffffff',
                circleStrokeWidth: 2,
              }}
            />
            <SymbolLayer
              id="area-points-label"
              style={{
                textField: ['get', 'name'],
                textSize: 11,
                textOffset: [0, 1.5],
                textAnchor: 'top',
                textColor: '#374151',
                textHaloColor: '#ffffff',
                textHaloWidth: 1,
              }}
            />
          </ShapeSource>
        )}

        {/* Member positions */}
        {memberPositionsGeoJSON &&
          memberPositionsGeoJSON.features.length > 0 && (
            <ShapeSource id="member-positions" shape={memberPositionsGeoJSON}>
              <CircleLayer
                id="member-circle"
                style={{
                  circleRadius: 8,
                  circleColor: '#2c4b31',
                  circleStrokeColor: '#ffffff',
                  circleStrokeWidth: 2,
                }}
              />
              <SymbolLayer
                id="member-label"
                style={{
                  textField: ['get', 'name'],
                  textSize: 12,
                  textOffset: [0, -1.8],
                  textAnchor: 'bottom',
                  textColor: '#1f2937',
                  textHaloColor: '#ffffff',
                  textHaloWidth: 1.5,
                  textFont: ['DIN Pro Medium', 'Arial Unicode MS Regular'],
                }}
              />
            </ShapeSource>
          )}
      </MapView>

      {/* My position button */}
      <IconButton
        variant="outline"
        onPress={handleGoToMyPosition}
        accessibilityLabel="Gå till min position"
        className="absolute bottom-24 left-4 bg-background/90 shadow">
        <Ionicons name="locate" size={22} color="#374151" />
      </IconButton>

      {/* Back button */}
      <IconButton
        variant="outline"
        onPress={() => router.back()}
        className="absolute bottom-10 left-4 bg-background/90 shadow">
        <Ionicons name="arrow-back" size={22} color="#374151" />
      </IconButton>

      {/* Event actions */}
      <View className="absolute bottom-10 right-4 gap-3">
        <IconButton
          variant="outline"
          onPress={() => router.push(`/event/${eventId}/members`)}
          size="lg"
          className="bg-background/90 shadow-lg">
          <Ionicons name="people" size={24} color="#374151" />
        </IconButton>

        <IconButton
          onPress={() => router.push(`/event/${eventId}/chat`)}
          size="lg"
          className="bg-primary shadow-lg">
          <Ionicons name="chatbubbles" size={24} color="white" />
        </IconButton>
      </View>
    </View>
  );
}
