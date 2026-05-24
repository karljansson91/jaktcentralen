import { AreaFeatureLayers } from '@/components/AreaFeatureLayers';
import { AssignedStationMarker, type AssignedStationMarkerItem } from '@/components/event/assigned-station-marker';
import { AssignmentRouteLayer } from '@/components/event/assignment-route-layer';
import { HuntMapTopNav } from '@/components/event/hunt-map-top-nav';
import { GlassFloatingButton } from '@/components/glass';
import { IconButton, Text } from '@/components/ui';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { AreaFeatureListItem, getAreaFeatureTargetKey } from '@/lib/area-features';
import { isEventActive } from '@/lib/event-lifecycle';
import { getMemberInitials } from '@/lib/event-formatting';
import type { AssignmentTrail } from '@/lib/hunt-navigation';
import { getCurrentUserCoordinate } from '@/lib/location';
import {
  getCachedMapStyle,
  getSavedMapStyle,
  subscribeToMapStyleChanges,
} from '@/lib/map-styles';
import { APP_COLORS } from '@/lib/theme';
import { useAssignmentRoute } from '@/hooks/use-assignment-route';
import { useCurrentTime } from '@/hooks/use-current-time';
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
  const { back, push } = useRouter();
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<ElementRef<typeof Camera>>(null);
  const currentTime = useCurrentTime();
  const [mapStyleURL, setMapStyleURL] = useState(() => getCachedMapStyle().styleURL);
  const [currentCoordinate, setCurrentCoordinate] = useState<[number, number] | null>(null);
  const [visibleAssignmentTrailTargetKey, setVisibleAssignmentTrailTargetKey] = useState<
    string | null
  >(null);

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
  const unreadMessageCount = useQuery(
    api.messages.getUnreadCount,
    event ? { eventId: eventId as Id<'events'> } : 'skip'
  );

  const updatePosition = useMutation(api.eventMembers.updatePosition);
  const isActiveHunt = Boolean(event && isEventActive(event, currentTime));
  const activeAssignmentTrailTargetKey = isActiveHunt ? visibleAssignmentTrailTargetKey : null;

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
    if (!members || !currentUser) return null;
    const features = [];

    for (const member of members) {
      if (
        member.userId === currentUser._id ||
        member.lastLatitude == null ||
        member.lastLongitude == null
      ) {
        continue;
      }

      const name = member.user?.name?.trim() || 'Okänd';
      features.push({
        type: 'Feature' as const,
        properties: {
          id: member._id,
          name,
          initials: getMemberInitials(name),
        },
        geometry: {
          type: 'Point' as const,
          coordinates: [member.lastLongitude, member.lastLatitude],
        },
      });
    }

    return {
      type: 'FeatureCollection' as const,
      features,
    };
  }, [currentUser, members]);

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

  const {
    mode: assignmentRouteMode,
    route: assignmentRoute,
    routeError: assignmentRouteError,
    routeGeoJSON: assignmentRouteGeoJSON,
    routeStatus: assignmentRouteStatus,
    setMode: setAssignmentRouteMode,
    toggleMode: toggleAssignmentRouteMode,
  } = useAssignmentRoute(assignmentTrail);

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

    setAssignmentRouteMode('walking');

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
    setAssignmentRouteMode,
    visibleAssignmentTrailTargetKey,
  ]);

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

        <AssignmentRouteLayer route={assignmentRoute} shape={assignmentRouteGeoJSON} />

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
          <HuntMapTopNav
            title={event.title}
            onBack={() => back()}
            onMore={() => push(`/event/${eventId}/actions`)}
            routeSummary={
              assignmentTrail
                ? {
                    error: assignmentRouteError,
                    mode: assignmentRouteMode,
                    onToggleMode: toggleAssignmentRouteMode,
                    route: assignmentRoute,
                    status: assignmentRouteStatus,
                  }
                : null
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
            accessibilityLabel={
              unreadMessageCount
                ? `Öppna chat, ${unreadMessageCount} olästa meddelanden`
                : 'Öppna chat'
            }
            className="relative size-16 bg-primary"
            style={{
              backgroundColor: APP_COLORS.primary,
              borderColor: 'rgba(254, 253, 251, 0.7)',
              borderWidth: 1,
              boxShadow: '0 8px 22px rgba(49, 52, 68, 0.2)',
            }}>
            <Ionicons name="chatbubbles" size={29} color={APP_COLORS.surface} />
            {unreadMessageCount ? (
              <View className="absolute -right-1 -top-1 min-h-6 min-w-6 items-center justify-center rounded-full bg-destructive px-1.5">
                <Text className="text-[11px] font-bold leading-4 text-white">
                  {unreadMessageCount > 99 ? '99+' : unreadMessageCount}
                </Text>
              </View>
            ) : null}
          </IconButton>
        </View>
      </View>
    </View>
  );
}
