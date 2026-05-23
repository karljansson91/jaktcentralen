import { AreaFeatureLayers } from '@/components/AreaFeatureLayers';
import { GlassFloatingButton, GlassTopNav } from '@/components/glass';
import { IconButton, Text } from '@/components/ui';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { AreaFeatureListItem, getAreaFeatureTargetKey } from '@/lib/area-features';
import { getMemberInitials } from '@/lib/event-formatting';
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
  MarkerView,
  ShapeSource,
  SymbolLayer,
} from '@rnmapbox/maps';
import { useMutation, useQuery } from 'convex/react';
import * as Location from 'expo-location';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { type ElementRef, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type AssignedStationMarkerItem = {
  coordinates: [number, number];
  initials: string;
  targetKey: string;
};

function AssignedStationMarker({
  marker,
  onPress,
}: {
  marker: AssignedStationMarkerItem;
  onPress: (targetKey: string) => void;
}) {
  return (
    <MarkerView
      key={marker.targetKey}
      coordinate={marker.coordinates}
      anchor={{ x: 0.5, y: 1 }}
      allowOverlap
      allowOverlapWithPuck>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Öppna tilldelning för ${marker.initials}`}
        onPress={() => onPress(marker.targetKey)}
        style={styles.assignedStationPin}>
        <View style={styles.assignedStationPinHeadOutline} />
        <View style={styles.assignedStationPinTailOutline} />
        <View style={styles.assignedStationPinHead} />
        <View style={styles.assignedStationPinTail} />
        <Text style={styles.assignedStationPinText}>
          {marker.initials}
        </Text>
      </Pressable>
    </MarkerView>
  );
}

const styles = StyleSheet.create({
  assignedStationPin: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'flex-start',
    width: 34,
  },
  assignedStationPinHead: {
    backgroundColor: APP_COLORS.primary,
    borderRadius: 13,
    height: 26,
    position: 'absolute',
    top: 2,
    width: 26,
  },
  assignedStationPinHeadOutline: {
    backgroundColor: APP_COLORS.surface,
    borderRadius: 15,
    height: 30,
    position: 'absolute',
    top: 0,
    width: 30,
  },
  assignedStationPinTail: {
    borderLeftColor: 'transparent',
    borderLeftWidth: 8,
    borderRightColor: 'transparent',
    borderRightWidth: 8,
    borderTopColor: APP_COLORS.primary,
    borderTopWidth: 12,
    height: 0,
    position: 'absolute',
    top: 24,
    width: 0,
  },
  assignedStationPinTailOutline: {
    borderLeftColor: 'transparent',
    borderLeftWidth: 10,
    borderRightColor: 'transparent',
    borderRightWidth: 10,
    borderTopColor: APP_COLORS.surface,
    borderTopWidth: 15,
    height: 0,
    position: 'absolute',
    top: 23,
    width: 0,
  },
  assignedStationPinText: {
    color: APP_COLORS.surface,
    fontSize: 10,
    fontWeight: '800',
    lineHeight: 26,
    textAlign: 'center',
    width: 30,
  },
});

export default function EventMapScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<ElementRef<typeof Camera>>(null);
  const watchRef = useRef<Location.LocationSubscription | null>(null);
  const [mapStyleURL, setMapStyleURL] = useState(DEFAULT_MAP_STYLE.styleURL);

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
  const assignments = useQuery(
    api.eventPointAssignments.listByEvent,
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
    if (!event) return;
    if (event.endedAt !== undefined) return;

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
      paddingTop: Math.max(insets.top + 92, 112),
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

  const assignedStationMarkers = useMemo(() => {
    if (!areaFeatures || !assignments) return null;

    const assignmentsByTargetKey = new Map(
      assignments.map((assignment) => [assignment.targetKey, assignment])
    );
    const features = areaFeatures
      .filter((feature) => feature.geometryType === 'point' && feature.point)
      .map((feature) => {
        const assignment = assignmentsByTargetKey.get(getAreaFeatureTargetKey(feature));
        if (!assignment) {
          return null;
        }

        const name = assignment.assignedUser?.name?.trim() || 'Okänd';
        return {
          coordinates: [feature.point!.longitude, feature.point!.latitude] as [number, number],
          initials: getMemberInitials(name),
          targetKey: getAreaFeatureTargetKey(feature),
        } satisfies AssignedStationMarkerItem;
      })
      .filter((feature) => feature !== null);

    return features;
  }, [areaFeatures, assignments]);

  const handlePressStationTarget = useCallback(
    (targetKey: string) => {
      router.push(`/event/${eventId}/station?targetKey=${encodeURIComponent(targetKey)}`);
    },
    [eventId, router]
  );

  const handlePressPointFeature = useCallback(
    (feature: AreaFeatureListItem) => {
      handlePressStationTarget(getAreaFeatureTargetKey(feature));
    },
    [handlePressStationTarget]
  );

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

  if (
    area === undefined ||
    members === undefined ||
    assignments === undefined ||
    cameraBounds === null
  ) {
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
          <AreaFeatureLayers
            features={areaFeatures}
            idPrefix="event-area-features"
            interactive
            onPressPointFeature={handlePressPointFeature}
          />
        )}

        {memberPositionsGeoJSON && memberPositionsGeoJSON.features.length > 0 && (
          <ShapeSource id="event-member-positions" shape={memberPositionsGeoJSON}>
            <CircleLayer
              id="event-member-circle"
              style={{
                circleRadius: 27,
                circleColor: APP_COLORS.primary,
                circleStrokeColor: APP_COLORS.surface,
                circleStrokeWidth: 2.5,
              }}
            />
            <SymbolLayer
              id="event-member-initials"
              style={{
                textField: ['get', 'initials'],
                textSize: 21,
                textAnchor: 'center',
                textColor: APP_COLORS.surface,
                textAllowOverlap: true,
                textIgnorePlacement: true,
                textFont: ['DIN Pro Medium', 'Arial Unicode MS Regular'],
              }}
            />
          </ShapeSource>
        )}

        {assignedStationMarkers?.map((marker) => (
          <AssignedStationMarker
            key={marker.targetKey}
            marker={marker}
            onPress={handlePressStationTarget}
          />
        ))}
      </MapView>

      <View pointerEvents="box-none" className="absolute bottom-0 left-0 right-0 top-0">
        <View
          pointerEvents="box-none"
          className="absolute left-4 right-4"
          style={{ top: Math.max(insets.top, 8) + 8 }}>
          <GlassTopNav
            appearance="floating"
            title={event.title}
            titleBackground
            onBack={() => router.back()}
            onRightPress={() => router.push(`/event/${eventId}/actions`)}
            rightAccessibilityLabel="Jaktåtgärder"
          />
        </View>

        <View
          className="absolute left-6"
          style={{ bottom: Math.max(insets.bottom, 20) + 18 }}>
          <GlassFloatingButton
            icon="locate"
            onPress={handleGoToMyPosition}
            accessibilityLabel="Gå till min position"
            surfaceClassName="h-12 w-12"
            tone="dark"
          />
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
