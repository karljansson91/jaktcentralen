import { AreaFeatureLayers } from '@/components/AreaFeatureLayers';
import { EventMapSummary } from '@/components/event/event-map-summary';
import { IconButton, Text } from '@/components/ui';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import {
  formatElapsedHuntTime,
  formatParticipantCount,
  getMemberInitials,
} from '@/lib/event-formatting';
import { getCurrentUserCoordinate } from '@/lib/location';
import {
  DEFAULT_MAP_STYLE,
  getSavedMapStyle,
  subscribeToMapStyleChanges,
} from '@/lib/map-styles';
import { APP_COLORS } from '@/lib/theme';
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
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { type ElementRef, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function EventMapScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<ElementRef<typeof Camera>>(null);
  const watchRef = useRef<Location.LocationSubscription | null>(null);
  const [mapStyleURL, setMapStyleURL] = useState(DEFAULT_MAP_STYLE.styleURL);
  const [now, setNow] = useState(() => Date.now());

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
  const areaFeatures = useQuery(
    api.areaFeatures.listForEvent,
    event ? { eventId: eventId as Id<'events'> } : 'skip'
  );

  const updatePosition = useMutation(api.eventMembers.updatePosition);

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
          setMapStyleURL(style.styleURL);
        }
      });

      return () => {
        cancelled = true;
      };
    }, [])
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 60_000);

    return () => {
      clearInterval(interval);
    };
  }, []);

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
    const coords = area.polygon.map((p) => [p.longitude, p.latitude] as [number, number]);
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
      paddingTop: Math.max(insets.top + 180, 200),
      paddingBottom: Math.max(insets.bottom + 132, 160),
      paddingLeft: 42,
      paddingRight: 42,
    };
  }, [area, insets.bottom, insets.top]);

  const memberPositionsGeoJSON = useMemo(() => {
    if (!members) return null;
    const features = members
      .filter((member) => member.lastLatitude != null && member.lastLongitude != null)
      .map((member) => {
        const name = member.user?.name?.trim() || 'Okänd';

        return {
          type: 'Feature' as const,
          properties: {
            id: member._id,
            name,
            initials: getMemberInitials(name),
          },
          geometry: {
            type: 'Point' as const,
            coordinates: [member.lastLongitude!, member.lastLatitude!],
          },
        };
      });

    return {
      type: 'FeatureCollection' as const,
      features,
    };
  }, [members]);

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

  if (area === undefined || members === undefined || cameraBounds === null) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="small" color={APP_COLORS.primary} />
      </View>
    );
  }

  if (area === null) {
    return (
      <View className="flex-1 items-center justify-center bg-background p-6">
        <Text variant="h3">Området hittades inte</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: APP_COLORS.background }}>
      <MapView
        style={{ flex: 1 }}
        styleURL={mapStyleURL}
        scrollEnabled
        zoomEnabled
        rotateEnabled={false}
        pitchEnabled={false}
        attributionEnabled={false}>
        {cameraBounds && <Camera ref={cameraRef} bounds={cameraBounds} animationDuration={0} />}
        <LocationPuck puckBearingEnabled puckBearing="heading" />

        {polygonGeoJSON && (
          <ShapeSource id="event-area-polygon" shape={polygonGeoJSON}>
            <FillLayer id="event-area-fill" style={{ fillColor: APP_COLORS.mapAreaFill }} />
            <LineLayer
              id="event-area-line"
              style={{ lineColor: APP_COLORS.mapAreaLine, lineWidth: 2.5 }}
            />
          </ShapeSource>
        )}

        {areaFeatures && (
          <AreaFeatureLayers features={areaFeatures} idPrefix="event-area-features" />
        )}

        {memberPositionsGeoJSON && memberPositionsGeoJSON.features.length > 0 && (
          <ShapeSource id="event-member-positions" shape={memberPositionsGeoJSON}>
            <CircleLayer
              id="event-member-circle"
              style={{
                circleRadius: 35,
                circleColor: APP_COLORS.primary,
                circleStrokeColor: APP_COLORS.surface,
                circleStrokeWidth: 3,
              }}
            />
            <SymbolLayer
              id="event-member-initials"
              style={{
                textField: ['get', 'initials'],
                textSize: 27,
                textAnchor: 'center',
                textColor: APP_COLORS.surface,
                textAllowOverlap: true,
                textIgnorePlacement: true,
                textFont: ['DIN Pro Medium', 'Arial Unicode MS Regular'],
              }}
            />
          </ShapeSource>
        )}
      </MapView>

      <View pointerEvents="box-none" className="absolute bottom-0 left-0 right-0 top-0">
        <View pointerEvents="box-none" className="absolute left-0 right-0 top-0">
          <EventMapSummary
            title={event.title}
            elapsedLabel={formatElapsedHuntTime(event.startDate, now)}
            areaName={area.name}
            participantLabel={formatParticipantCount(members.length)}
            topInset={insets.top}
            onOpenActions={() => router.push(`/event/${eventId}/actions`)}
          />
        </View>

        <View
          className="absolute left-6"
          style={{ bottom: Math.max(insets.bottom, 20) + 18 }}>
          <IconButton
            variant="outline"
            size="lg"
            onPress={handleGoToMyPosition}
            accessibilityLabel="Gå till min position"
            className="h-16 w-16 bg-card"
            style={{ boxShadow: '0 8px 22px rgba(49, 52, 68, 0.16)' }}>
            <Ionicons name="locate" size={30} color={APP_COLORS.text} />
          </IconButton>
        </View>

        <View
          className="absolute right-6"
          style={{ bottom: Math.max(insets.bottom, 20) + 18 }}>
          <IconButton
            size="lg"
            onPress={() => router.push(`/event/${eventId}/chat`)}
            accessibilityLabel="Öppna chat"
            className="h-16 w-16 bg-primary"
            style={{ boxShadow: '0 8px 22px rgba(49, 52, 68, 0.2)' }}>
            <Ionicons name="chatbubbles" size={29} color={APP_COLORS.surface} />
          </IconButton>
        </View>
      </View>
    </View>
  );
}
