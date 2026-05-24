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

type AssignmentTrail = {
  endCoordinate: [number, number];
  startCoordinate: [number, number];
  targetKey: string;
};

type AssignmentTrailMode = 'walking' | 'direct';

type AssignmentRoute = {
  coordinates: [number, number][];
  distanceMeters: number;
  durationSeconds: number;
  mode: AssignmentTrailMode;
};

type MapboxDirectionsResponse = {
  code?: string;
  message?: string;
  routes?: {
    distance?: number;
    duration?: number;
    geometry?: {
      coordinates?: [number, number][];
      type?: string;
    };
  }[];
};

const HUNT_WALKING_SPEED_MPS = 1.1;

function toCoordinateKey(coordinate: [number, number]) {
  return `${coordinate[0].toFixed(5)},${coordinate[1].toFixed(5)}`;
}

function toDirectionsCoordinate(coordinate: [number, number]) {
  return `${coordinate[0]},${coordinate[1]}`;
}

function getDistanceMeters(from: [number, number], to: [number, number]) {
  const earthRadiusMeters = 6_371_000;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const deltaLatitude = toRadians(to[1] - from[1]);
  const deltaLongitude = toRadians(to[0] - from[0]);
  const fromLatitude = toRadians(from[1]);
  const toLatitude = toRadians(to[1]);
  const haversine =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(fromLatitude) * Math.cos(toLatitude) * Math.sin(deltaLongitude / 2) ** 2;

  return 2 * earthRadiusMeters * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function buildDirectAssignmentRoute(trail: AssignmentTrail): AssignmentRoute {
  const distanceMeters = getDistanceMeters(trail.startCoordinate, trail.endCoordinate);

  return {
    coordinates: [trail.startCoordinate, trail.endCoordinate],
    distanceMeters,
    durationSeconds: distanceMeters / HUNT_WALKING_SPEED_MPS,
    mode: 'direct',
  };
}

async function fetchWalkingAssignmentRoute(
  trail: AssignmentTrail,
  signal: AbortSignal
): Promise<AssignmentRoute> {
  const accessToken = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error('Mapbox token saknas.');
  }

  const coordinates = `${toDirectionsCoordinate(trail.startCoordinate)};${toDirectionsCoordinate(
    trail.endCoordinate
  )}`;
  const params = new URLSearchParams({
    access_token: accessToken,
    geometries: 'geojson',
    overview: 'full',
    steps: 'false',
    walking_speed: String(HUNT_WALKING_SPEED_MPS),
  });
  const response = await fetch(
    `https://api.mapbox.com/directions/v5/mapbox/walking/${coordinates}?${params.toString()}`,
    { signal }
  );
  const body = (await response.json()) as MapboxDirectionsResponse;

  if (!response.ok || body.code !== 'Ok') {
    throw new Error(body.message || 'Kunde inte beräkna gångväg.');
  }

  const route = body.routes?.[0];
  const routeCoordinates = route?.geometry?.coordinates;

  if (
    !route ||
    route.geometry?.type !== 'LineString' ||
    !Array.isArray(routeCoordinates) ||
    routeCoordinates.length < 2 ||
    typeof route.distance !== 'number' ||
    typeof route.duration !== 'number'
  ) {
    throw new Error('Mapbox gav ingen användbar gångväg.');
  }

  return {
    coordinates: routeCoordinates,
    distanceMeters: route.distance,
    durationSeconds: route.duration,
    mode: 'walking',
  };
}

function formatTrailDistance(distanceMeters: number) {
  if (distanceMeters < 950) {
    return `${Math.max(10, Math.round(distanceMeters / 10) * 10)} m`;
  }

  const kilometers = distanceMeters / 1000;
  const decimals = kilometers < 10 ? 1 : 0;
  return `${kilometers.toFixed(decimals).replace('.', ',')} km`;
}

function formatTrailDuration(durationSeconds: number) {
  const minutes = Math.max(1, Math.round(durationSeconds / 60));

  if (minutes < 60) {
    return `ca ${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `ca ${hours} h ${remainingMinutes} min` : `ca ${hours} h`;
}

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
  routeTitleSurface: {
    minHeight: 68,
    width: 278,
  },
  trailSummaryRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 28,
    paddingHorizontal: 6,
  },
});

export default function EventMapScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const { back, push } = useRouter();
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<ElementRef<typeof Camera>>(null);
  const [mapStyleURL, setMapStyleURL] = useState(DEFAULT_MAP_STYLE.styleURL);
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [currentCoordinate, setCurrentCoordinate] = useState<[number, number] | null>(null);
  const [visibleAssignmentTrailTargetKey, setVisibleAssignmentTrailTargetKey] = useState<
    string | null
  >(null);
  const [assignmentTrailMode, setAssignmentTrailMode] = useState<AssignmentTrailMode>('walking');
  const [walkingRouteResult, setWalkingRouteResult] = useState<{
    error: string | null;
    key: string;
    route: AssignmentRoute | null;
  } | null>(null);

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
  const currentUser = useQuery(api.users.getCurrentUserProfile);
  const areaFeatures = useQuery(
    api.areaFeatures.listForEvent,
    event ? { eventId: eventId as Id<'events'> } : 'skip'
  );
  const assignments = useQuery(
    api.eventPointAssignments.listByEvent,
    event ? { eventId: eventId as Id<'events'> } : 'skip'
  );

  const updatePosition = useMutation(api.eventMembers.updatePosition);
  const isActiveHunt = Boolean(
    event &&
      event.endedAt === undefined &&
      event.startDate <= currentTime &&
      event.endDate >= currentTime
  );
  const activeAssignmentTrailTargetKey = isActiveHunt ? visibleAssignmentTrailTargetKey : null;

  useEffect(() => {
    return subscribeToMapStyleChanges((style) => {
      setMapStyleURL(style.styleURL);
    });
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 30_000);

    return () => {
      clearInterval(interval);
    };
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
    if (!event || !isActiveHunt) return;

    let cancelled = false;
    let subscription: Location.LocationSubscription | null = null;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted' || cancelled) return;

      const nextSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 10,
          timeInterval: 10_000,
        },
        (loc) => {
          setCurrentCoordinate([loc.coords.longitude, loc.coords.latitude]);
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

      if (cancelled) {
        nextSubscription.remove();
        return;
      }

      subscription = nextSubscription;
    })().catch((error) => {
      if (!cancelled) {
        console.error('Failed to start location tracking:', error);
      }
    });

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [event, eventId, isActiveHunt, updatePosition]);

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
    const features = areaFeatures.flatMap((feature) => {
        if (feature.geometryType !== 'point' || !feature.point) {
          return [];
        }

        const assignment = assignmentsByTargetKey.get(getAreaFeatureTargetKey(feature));
        if (!assignment) {
          return [];
        }

        const name = assignment.assignedUser?.name?.trim() || 'Okänd';
        return [{
          coordinates: [feature.point.longitude, feature.point.latitude] as [number, number],
          initials: getMemberInitials(name),
          targetKey: getAreaFeatureTargetKey(feature),
        } satisfies AssignedStationMarkerItem];
      });

    return features;
  }, [areaFeatures, assignments]);

  const currentUserAssignedStation = useMemo(() => {
    if (!currentUser || !assignments || !areaFeatures) return null;

    const assignment = assignments.find(
      (candidate) => candidate.assignedUserId === currentUser._id
    );
    if (!assignment) return null;

    const feature = areaFeatures.find(
      (candidate) =>
        candidate.geometryType === 'point' &&
        candidate.point &&
        getAreaFeatureTargetKey(candidate) === assignment.targetKey
    );
    if (!feature?.point) return null;

    return {
      coordinate: [feature.point.longitude, feature.point.latitude] as [number, number],
      targetKey: assignment.targetKey,
    };
  }, [areaFeatures, assignments, currentUser]);

  const currentUserMemberCoordinate = useMemo(() => {
    if (!currentUser || !members) return null;

    const member = members.find((candidate) => candidate.userId === currentUser._id);
    if (member?.lastLatitude == null || member.lastLongitude == null) {
      return null;
    }

    return [member.lastLongitude, member.lastLatitude] as [number, number];
  }, [currentUser, members]);

  const assignmentTrail = useMemo<AssignmentTrail | null>(() => {
    if (
      !isActiveHunt ||
      !currentUserAssignedStation ||
      activeAssignmentTrailTargetKey !== currentUserAssignedStation.targetKey
    ) {
      return null;
    }

    const startCoordinate = currentCoordinate ?? currentUserMemberCoordinate;
    if (!startCoordinate) return null;

    return {
      startCoordinate,
      endCoordinate: currentUserAssignedStation.coordinate,
      targetKey: currentUserAssignedStation.targetKey,
    };
  }, [
    activeAssignmentTrailTargetKey,
    currentCoordinate,
    currentUserAssignedStation,
    currentUserMemberCoordinate,
    isActiveHunt,
  ]);

  const assignmentTrailKey = useMemo(() => {
    if (!assignmentTrail) return null;

    return [
      assignmentTrail.targetKey,
      toCoordinateKey(assignmentTrail.startCoordinate),
      toCoordinateKey(assignmentTrail.endCoordinate),
    ].join(':');
  }, [assignmentTrail]);

  const directAssignmentRoute = useMemo(() => {
    return assignmentTrail ? buildDirectAssignmentRoute(assignmentTrail) : null;
  }, [assignmentTrail]);

  useEffect(() => {
    if (!assignmentTrail || !assignmentTrailKey || assignmentTrailMode !== 'walking') return;
    if (walkingRouteResult?.key === assignmentTrailKey) return;

    const controller = new AbortController();

    fetchWalkingAssignmentRoute(assignmentTrail, controller.signal)
      .then((route) => {
        setWalkingRouteResult({ error: null, key: assignmentTrailKey, route });
      })
      .catch((error) => {
        if (controller.signal.aborted) return;

        setWalkingRouteResult({
          error: error instanceof Error ? error.message : 'Kunde inte beräkna gångväg.',
          key: assignmentTrailKey,
          route: null,
        });
      });

    return () => {
      controller.abort();
    };
  }, [assignmentTrail, assignmentTrailKey, assignmentTrailMode, walkingRouteResult?.key]);

  const walkingRoute =
    walkingRouteResult?.key === assignmentTrailKey ? walkingRouteResult.route : null;
  const walkingRouteError =
    walkingRouteResult?.key === assignmentTrailKey ? walkingRouteResult.error : null;
  const isWalkingRouteLoading = Boolean(
    assignmentTrailMode === 'walking' &&
      assignmentTrailKey &&
      walkingRouteResult?.key !== assignmentTrailKey
  );
  const assignmentRoute = assignmentTrailMode === 'direct' ? directAssignmentRoute : walkingRoute;
  const assignmentRouteStatus = isWalkingRouteLoading
    ? 'loading'
    : walkingRouteError
      ? 'error'
      : 'idle';
  const assignmentRouteError = assignmentTrailMode === 'walking' ? walkingRouteError : null;

  const assignmentTrailGeoJSON = useMemo(() => {
    if (!assignmentRoute) return null;

    return {
      type: 'Feature' as const,
      properties: {},
      geometry: {
        type: 'LineString' as const,
        coordinates: assignmentRoute.coordinates,
      },
    };
  }, [assignmentRoute]);

  const handlePressStationTarget = useCallback(
    (targetKey: string) => {
      push(`/event/${eventId}/station?targetKey=${encodeURIComponent(targetKey)}`);
    },
    [eventId, push]
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

      setCurrentCoordinate(coordinate);
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

  const handleToggleAssignmentTrail = useCallback(async () => {
    if (!isActiveHunt) return;
    if (!currentUserAssignedStation) return;

    if (visibleAssignmentTrailTargetKey === currentUserAssignedStation.targetKey) {
      setVisibleAssignmentTrailTargetKey(null);
      return;
    }

    setAssignmentTrailMode('walking');

    if (currentCoordinate ?? currentUserMemberCoordinate) {
      setVisibleAssignmentTrailTargetKey(currentUserAssignedStation.targetKey);
      return;
    }

    const coordinate = await getCurrentUserCoordinate();
    if (!coordinate) {
      Alert.alert('Plats saknas', 'Ge appen platsbehörighet för att visa vägen till ditt pass.');
      return;
    }

    setCurrentCoordinate(coordinate);
    setVisibleAssignmentTrailTargetKey(currentUserAssignedStation.targetKey);
  }, [
    currentCoordinate,
    currentUserAssignedStation,
    currentUserMemberCoordinate,
    isActiveHunt,
    visibleAssignmentTrailTargetKey,
  ]);

  const handleToggleAssignmentTrailMode = useCallback(() => {
    setAssignmentTrailMode((current) => (current === 'walking' ? 'direct' : 'walking'));
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
    currentUser === undefined ||
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

        {assignmentTrailGeoJSON && (
          <ShapeSource id="event-assignment-trail" shape={assignmentTrailGeoJSON}>
            <LineLayer
              id="event-assignment-trail-outline"
              style={{
                lineColor: APP_COLORS.surface,
                lineWidth: 8,
                lineOpacity: 0.86,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
            <LineLayer
              id="event-assignment-trail-line"
              style={{
                lineColor: APP_COLORS.primary,
                lineWidth: 4,
                lineOpacity: 0.92,
                lineDasharray: assignmentRoute?.mode === 'direct' ? [0.2, 2.2] : undefined,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          </ShapeSource>
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
            titleSurfaceStyle={assignmentTrail ? styles.routeTitleSurface : undefined}
            onBack={() => back()}
            onRightPress={() => push(`/event/${eventId}/actions`)}
            rightAccessibilityLabel="Jaktåtgärder"
            titleAccessory={
              assignmentTrail ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    assignmentTrailMode === 'walking'
                      ? 'Byt till riktning till pass'
                      : 'Byt till gångväg till pass'
                  }
                  onPress={handleToggleAssignmentTrailMode}
                  style={styles.trailSummaryRow}>
                  <Ionicons
                    name={assignmentTrailMode === 'walking' ? 'walk' : 'navigate'}
                    size={16}
                    color={APP_COLORS.surface}
                  />
                  {assignmentRouteStatus === 'loading' ? (
                    <>
                      <ActivityIndicator size="small" color={APP_COLORS.surface} />
                      <Text className="text-xs font-semibold text-white">Beräknar...</Text>
                    </>
                  ) : assignmentRoute ? (
                    <Text className="text-xs font-semibold text-white" numberOfLines={1}>
                      {assignmentTrailMode === 'walking' ? 'Gångväg' : 'Riktning'} ·{' '}
                      {formatTrailDistance(assignmentRoute.distanceMeters)} ·{' '}
                      {formatTrailDuration(assignmentRoute.durationSeconds)}
                    </Text>
                  ) : (
                    <Text className="text-xs font-semibold text-white" numberOfLines={1}>
                      {assignmentRouteError ?? 'Ingen väg'}
                    </Text>
                  )}
                  <Ionicons
                    name="swap-horizontal"
                    size={14}
                    color="rgba(255, 255, 255, 0.78)"
                  />
                </Pressable>
              ) : null
            }
          />
        </View>

        <View
          className="absolute left-6"
          style={{ bottom: Math.max(insets.bottom, 20) + 18 }}>
          <View className="gap-3">
            {isActiveHunt && currentUserAssignedStation ? (
              <GlassFloatingButton
                icon="navigate"
                onPress={handleToggleAssignmentTrail}
                accessibilityLabel={
                  activeAssignmentTrailTargetKey === currentUserAssignedStation.targetKey
                    ? 'Dölj väg till tilldelat pass'
                    : 'Visa väg till tilldelat pass'
                }
                color={APP_COLORS.surface}
                surfaceClassName="size-12"
                tone="dark"
                tintColor={
                  activeAssignmentTrailTargetKey === currentUserAssignedStation.targetKey
                    ? 'rgba(57, 128, 72, 0.92)'
                    : 'rgba(49, 52, 68, 0.82)'
                }
              />
            ) : null}
            <GlassFloatingButton
              icon="locate"
              onPress={handleGoToMyPosition}
              accessibilityLabel="Gå till min position"
              surfaceClassName="size-12"
              tone="dark"
            />
          </View>
        </View>

        <View
          className="absolute right-6"
          style={{ bottom: Math.max(insets.bottom, 20) + 18 }}>
          <IconButton
            size="lg"
            onPress={() => push(`/event/${eventId}/chat`)}
            accessibilityLabel="Öppna chat"
            className="size-16 bg-primary"
            style={{
              backgroundColor: APP_COLORS.primary,
              borderColor: 'rgba(254, 253, 251, 0.7)',
              borderWidth: 1,
              boxShadow: '0 8px 22px rgba(49, 52, 68, 0.2)',
            }}>
            <Ionicons name="chatbubbles" size={29} color={APP_COLORS.surface} />
          </IconButton>
        </View>
      </View>
    </View>
  );
}
