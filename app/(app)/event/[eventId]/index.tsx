import { AreaFeatureLayers } from '@/components/AreaFeatureLayers';
import { AnimalSightingActionSheet } from '@/components/event/animal-sighting-action-sheet';
import { AnimalSightingLayers } from '@/components/event/animal-sighting-layers';
import { AssignedStationMarker, type AssignedStationMarkerItem } from '@/components/event/assigned-station-marker';
import { AssignmentRouteLayer } from '@/components/event/assignment-route-layer';
import { HuntActionsMenu } from '@/components/event/hunt-actions-menu';
import { HuntMapLongPressActionSheet } from '@/components/event/hunt-map-long-press-action-sheet';
import { HuntMapTopNav } from '@/components/event/hunt-map-top-nav';
import { HuntMapToolsMenu } from '@/components/event/hunt-map-tools-menu';
import { GlassIconButton } from '@/components/glass';
import {
  LiveMemberPositionMarker,
  type LiveMemberPositionMarkerItem,
} from '@/components/event/live-member-position-marker';
import { MeasurementPointMarkers } from '@/components/event/measurement-point-markers';
import { ScentPlumeLayer } from '@/components/event/scent-plume-layer';
import { Text } from '@/components/ui';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { formatAllowedGameSummary } from '@/lib/allowed-game';
import { AreaFeatureListItem, getAreaFeatureTargetKey } from '@/lib/area-features';
import { buildAreaPolygonFeature, getAreaCameraBounds } from '@/lib/area-map';
import { isEventActive } from '@/lib/event-lifecycle';
import { getMemberInitials } from '@/lib/event-formatting';
import { distanceMeters, type LatLngPoint } from '@/lib/geo';
import type { AssignmentTrail } from '@/lib/hunt-navigation';
import {
  IN_POSITION_RADIUS_METERS,
  NEAR_ASSIGNED_POSITION_RADIUS_METERS,
  isMemberEffectivelyInPosition,
} from '@/lib/hunt-in-position';
import { getCurrentUserCoordinate } from '@/lib/location';
import {
  getCachedMapStyle,
  getSavedMapStyle,
  subscribeToMapStyleChanges,
} from '@/lib/map-styles';
import { APP_COLORS } from '@/lib/theme';
import {
  formatWindDirectionIndicator,
  oppositeDirectionDegrees,
} from '@/lib/wind-direction';
import { subscribeToWindDirectionSelection } from '@/lib/wind-direction-selection';
import { useAnimalSightingMapVisibility } from '@/hooks/use-animal-sighting-map-visibility';
import { useAssignmentRoute } from '@/hooks/use-assignment-route';
import { useCurrentTime } from '@/hooks/use-current-time';
import { useHuntMapMeasurement } from '@/hooks/use-hunt-map-measurement';
import { useHuntMapUiState } from '@/hooks/use-hunt-map-ui-state';
import { useInPositionPrompts } from '@/hooks/use-in-position-prompts';
import {
  Camera,
  FillLayer,
  LineLayer,
  LocationPuck,
  MapView,
  ShapeSource,
} from '@rnmapbox/maps';
import { useMutation, useQuery } from 'convex/react';
import * as Location from 'expo-location';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import {
  type ElementRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ActivityIndicator, Alert, Vibration, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function pointFromMapLongPress(event: GeoJSON.Feature): LatLngPoint {
  const coordinates = (event.geometry as GeoJSON.Point).coordinates as [number, number];
  return {
    latitude: coordinates[1],
    longitude: coordinates[0],
  };
}

export default function EventMapScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const { back, push } = useRouter();
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<ElementRef<typeof Camera>>(null);
  const currentTime = useCurrentTime();
  const [mapStyleURL, setMapStyleURL] = useState(() => getCachedMapStyle().styleURL);
  const [currentCoordinate, setCurrentCoordinate] = useState<[number, number] | null>(null);
  const [windSourceDirectionDegrees, setWindSourceDirectionDegrees] = useState<number | null>(null);
  const {
    longPressActionPoint,
    setLongPressActionPoint,
    setVisibleAssignmentTrailTargetKey,
    showOtherUserPositions,
    toggleOtherUserPositions,
    visibleAssignmentTrailTargetKey,
  } = useHuntMapUiState();
  const {
    addPoint: addMeasurementPoint,
    clear: clearMeasurement,
    isActive: measurementActive,
    mode: measurementMode,
    points: measurementPoints,
    replaceWithUserMeasurement,
    route: measurementRoute,
    routeError: measurementRouteError,
    routeGeoJSON: measurementRouteGeoJSON,
    routeStatus: measurementRouteStatus,
    toggleMode: toggleMeasurementMode,
    updatePointCoordinate: updateMeasurementPointCoordinate,
  } = useHuntMapMeasurement();

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
  const animalSightings = useQuery(
    api.animalSightings.listVisible,
    event ? { eventId: eventId as Id<'events'> } : 'skip'
  );

  const updatePosition = useMutation(api.eventMembers.updatePosition);
  const markInPosition = useMutation(api.eventMembers.markInPosition);
  const clearInPosition = useMutation(api.eventMembers.clearInPosition);
  const setPositionSharingDisabled = useMutation(
    api.eventMembers.setPositionSharingDisabled
  );
  const isActiveHunt = Boolean(event && isEventActive(event, currentTime));
  const activeWindSourceDirectionDegrees = isActiveHunt ? windSourceDirectionDegrees : null;
  const activeScentPlumeDirectionDegrees =
    activeWindSourceDirectionDegrees == null
      ? null
      : oppositeDirectionDegrees(activeWindSourceDirectionDegrees);
  const windDirectionLabel =
    activeWindSourceDirectionDegrees == null
      ? null
      : formatWindDirectionIndicator(activeWindSourceDirectionDegrees);
  const activeAssignmentTrailTargetKey = isActiveHunt ? visibleAssignmentTrailTargetKey : null;
  const ownPositionSharingEnabledRef = useRef(true);
  const {
    hasLocallyHiddenCurrentSightings,
    handleCloseSightingSheet,
    handleHideSighting,
    handlePressSighting,
    handleToggleVisibility: handleToggleAnimalSightingVisibility,
    selectedSighting,
    visibleSightings: visibleAnimalSightings,
  } = useAnimalSightingMapVisibility(animalSightings);

  useEffect(() => {
    return subscribeToMapStyleChanges((style) => {
      setMapStyleURL(style.styleURL);
    });
  }, []);

  useEffect(() => subscribeToWindDirectionSelection(setWindSourceDirectionDegrees), []);

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
          if (!ownPositionSharingEnabledRef.current) {
            return;
          }

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
    return buildAreaPolygonFeature(area);
  }, [area]);

  const cameraBounds = useMemo(() => {
    if (!area) return null;
    return getAreaCameraBounds(area, {
      top: Math.max(insets.top + 92, 112),
      bottom: Math.max(insets.bottom + 132, 160),
      left: 42,
      right: 42,
    });
  }, [area, insets.bottom, insets.top]);

  const liveMemberMarkers = useMemo(() => {
    if (!members || !currentUser || !showOtherUserPositions) return null;
    const markers: LiveMemberPositionMarkerItem[] = [];

    for (const member of members) {
      if (
        member.userId === currentUser._id ||
        member.lastLatitude == null ||
        member.lastLongitude == null
      ) {
        continue;
      }

      const name = member.user?.name?.trim() || 'Okänd';
      markers.push({
        coordinates: [member.lastLongitude, member.lastLatitude],
        id: member._id,
        imageUrl: member.user?.imageUrl ?? null,
        initials: getMemberInitials(name),
        name,
        offline: Boolean(member.positionSharingDisabled),
      });
    }

    return markers;
  }, [currentUser, members, showOtherUserPositions]);

  const assignmentPointByTargetKey = useMemo(() => {
    const points = new Map<string, { latitude: number; longitude: number }>();

    for (const feature of areaFeatures ?? []) {
      if (feature.geometryType !== 'point' || !feature.point) {
        continue;
      }

      points.set(getAreaFeatureTargetKey(feature), feature.point);
    }

    return points;
  }, [areaFeatures]);

  const memberByUserId = useMemo(
    () => new Map((members ?? []).map((member) => [member.userId, member])),
    [members]
  );

  const readinessSummary = useMemo(() => {
    if (!assignments) return null;

    let confirmed = 0;
    let total = 0;

    for (const assignment of assignments) {
      const point = assignmentPointByTargetKey.get(assignment.targetKey);
      const member = memberByUserId.get(assignment.assignedUserId);
      if (!point || !member) {
        continue;
      }

      total += 1;
      if (isMemberEffectivelyInPosition(member, assignment, point, currentTime)) {
        confirmed += 1;
      }
    }

    return { confirmed, total };
  }, [assignmentPointByTargetKey, assignments, currentTime, memberByUserId]);
  const allowedGameSummary = formatAllowedGameSummary(event?.allowedGame);

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

      const point = assignmentPointByTargetKey.get(assignment.targetKey);
      const member = memberByUserId.get(assignment.assignedUserId);
      const name = assignment.assignedUser?.name?.trim() || 'Okänd';
      return [
        {
          confirmed: point
            ? isMemberEffectivelyInPosition(member, assignment, point, currentTime)
            : false,
          coordinates: [feature.point.longitude, feature.point.latitude] as [number, number],
          initials: getMemberInitials(name),
          targetKey: getAreaFeatureTargetKey(feature),
        } satisfies AssignedStationMarkerItem,
      ];
    });

    return features;
  }, [areaFeatures, assignmentPointByTargetKey, assignments, currentTime, memberByUserId]);

  const currentUserAssignedStation = useMemo(() => {
    if (!currentUser || !assignments) return null;

    const assignment = assignments.find(
      (candidate) => candidate.assignedUserId === currentUser._id
    );
    if (!assignment) return null;

    const point = assignmentPointByTargetKey.get(assignment.targetKey);
    if (!point) return null;

    return {
      assignedUserId: assignment.assignedUserId,
      coordinate: [point.longitude, point.latitude] as [number, number],
      point,
      targetKey: assignment.targetKey,
    };
  }, [assignmentPointByTargetKey, assignments, currentUser]);

  const currentUserMember = useMemo(() => {
    if (!currentUser) return null;
    return memberByUserId.get(currentUser._id) ?? null;
  }, [currentUser, memberByUserId]);

  const currentUserMemberCoordinate = useMemo(() => {
    if (currentUserMember?.lastLatitude == null || currentUserMember.lastLongitude == null) {
      return null;
    }

    return [currentUserMember.lastLongitude, currentUserMember.lastLatitude] as [number, number];
  }, [currentUserMember]);
  const currentMeasurementStartCoordinate = currentCoordinate ?? currentUserMemberCoordinate;

  const currentUserMarkedInPosition = Boolean(
    currentUserAssignedStation &&
      currentUserMember?.inPositionTargetKey === currentUserAssignedStation.targetKey
  );
  const currentUserInPositionEffective = Boolean(
    currentUserAssignedStation &&
      currentUserMember &&
      isMemberEffectivelyInPosition(
        currentUserMember,
        currentUserAssignedStation,
        currentUserAssignedStation.point,
        currentTime
      )
  );
  const currentUserAssignmentDistance = useMemo(() => {
    if (!currentCoordinate || !currentUserAssignedStation) {
      return null;
    }

    return distanceMeters(
      { latitude: currentCoordinate[1], longitude: currentCoordinate[0] },
      currentUserAssignedStation.point
    );
  }, [currentCoordinate, currentUserAssignedStation]);
  const isOwnPositionSharingEnabled = !currentUserMember?.positionSharingDisabled;

  useEffect(() => {
    ownPositionSharingEnabledRef.current = isOwnPositionSharingEnabled;
  }, [isOwnPositionSharingEnabled, ownPositionSharingEnabledRef]);

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

  const visibleMeasurementActive = isActiveHunt && measurementActive;
  const visibleMapRoute = visibleMeasurementActive ? measurementRoute : assignmentRoute;
  const visibleMapRouteGeoJSON = visibleMeasurementActive
    ? measurementRouteGeoJSON
    : assignmentRouteGeoJSON;
  const topNavRouteSummary = visibleMeasurementActive
    ? {
        contextLabel: 'för mätning',
        emptyLabel: measurementPoints.length === 1 ? '1 mätpunkt' : 'Ingen mätning',
        error: measurementRouteError,
        label: 'Mätning',
        mode: measurementMode,
        onToggleMode: toggleMeasurementMode,
        route: measurementRoute,
        status: measurementRouteStatus,
      }
    : assignmentTrail
      ? {
          error: assignmentRouteError,
          mode: assignmentRouteMode,
          onToggleMode: toggleAssignmentRouteMode,
          route: assignmentRoute,
          status: assignmentRouteStatus,
        }
      : null;

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

  const handleMapLongPress = useCallback(
    (mapEvent: GeoJSON.Feature) => {
      if (!isActiveHunt) {
        return;
      }

      const point = pointFromMapLongPress(mapEvent);
      Vibration.vibrate(8);
      setLongPressActionPoint(point);
    },
    [isActiveHunt, setLongPressActionPoint]
  );

  const handleCloseLongPressActionSheet = useCallback(() => {
    setLongPressActionPoint(null);
  }, [setLongPressActionPoint]);

  const handleMeasureToLongPressPoint = useCallback(
    (point: LatLngPoint) => {
      if (!currentMeasurementStartCoordinate) {
        Alert.alert('Plats saknas', 'Ge appen platsbehörighet för att mäta från din position.');
        return;
      }

      replaceWithUserMeasurement(currentMeasurementStartCoordinate, point);
      setLongPressActionPoint(null);
    },
    [currentMeasurementStartCoordinate, replaceWithUserMeasurement, setLongPressActionPoint]
  );

  const handleAddMeasurementPoint = useCallback(
    (point: LatLngPoint) => {
      addMeasurementPoint(point);
      setLongPressActionPoint(null);
    },
    [addMeasurementPoint, setLongPressActionPoint]
  );

  const handleMarkAnimalSighting = useCallback(
    (point: LatLngPoint) => {
      setLongPressActionPoint(null);
      push(
        `/event/${eventId}/animal-sighting?latitude=${point.latitude}&longitude=${point.longitude}`
      );
    },
    [eventId, push, setLongPressActionPoint]
  );

  const handleMarkSelfInPosition = useCallback(async () => {
    try {
      await markInPosition({ eventId: eventId as Id<'events'> });
    } catch (error) {
      console.error('Failed to mark in position:', error);
      Alert.alert('Kunde inte markera på plats', 'Försök igen om en stund.');
    }
  }, [eventId, markInPosition]);

  const handleClearSelfInPosition = useCallback(async () => {
    try {
      await clearInPosition({ eventId: eventId as Id<'events'> });
    } catch (error) {
      console.error('Failed to clear in-position status:', error);
      Alert.alert('Kunde inte ta bort status', 'Försök igen om en stund.');
    }
  }, [clearInPosition, eventId]);

  const handleToggleOwnPositionSharing = useCallback(async () => {
    const nextEnabled = !isOwnPositionSharingEnabled;
    ownPositionSharingEnabledRef.current = nextEnabled;

    try {
      await setPositionSharingDisabled({
        disabled: !nextEnabled,
        eventId: eventId as Id<'events'>,
      });
    } catch (error) {
      ownPositionSharingEnabledRef.current = isOwnPositionSharingEnabled;
      console.error('Failed to update position sharing:', error);
      Alert.alert('Kunde inte ändra positionsdelning', 'Försök igen om en stund.');
    }
  }, [eventId, isOwnPositionSharingEnabled, setPositionSharingDisabled]);

  const handleStartSettingScentDirection = useCallback(() => {
    const initialDegrees =
      windSourceDirectionDegrees == null
        ? ''
        : `?initialDegrees=${encodeURIComponent(String(Math.round(windSourceDirectionDegrees)))}`;
    push(`/event/${eventId}/wind-direction${initialDegrees}`);
  }, [eventId, push, windSourceDirectionDegrees]);

  const isCurrentUserPastInPositionRadius =
    isActiveHunt &&
    currentUserMarkedInPosition &&
    currentUserAssignmentDistance != null &&
    currentUserAssignmentDistance > IN_POSITION_RADIUS_METERS;
  const isCurrentUserNearUnmarkedAssignment =
    isActiveHunt &&
    !currentUserMarkedInPosition &&
    currentUserAssignmentDistance != null &&
    currentUserAssignmentDistance <= NEAR_ASSIGNED_POSITION_RADIUS_METERS;

  useInPositionPrompts({
    isNearUnmarkedAssignment: isCurrentUserNearUnmarkedAssignment,
    isPastInPositionRadius: isCurrentUserPastInPositionRadius,
    onClearInPosition: handleClearSelfInPosition,
    onMarkInPosition: handleMarkSelfInPosition,
  });

  const renderHuntActionsMenu = useCallback(() => {
    if (!event || !currentUser) {
      return undefined;
    }

    return (
      <HuntActionsMenu
        currentUserId={currentUser._id}
        event={event}
        eventId={eventId as Id<'events'>}
      />
    );
  }, [currentUser, event, eventId]);

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
    setVisibleAssignmentTrailTargetKey,
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
    animalSightings === undefined ||
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
        attributionEnabled={false}
        onLongPress={isActiveHunt ? handleMapLongPress : undefined}>
        {cameraBounds && <Camera ref={cameraRef} bounds={cameraBounds} animationDuration={0} />}
        {!currentUserInPositionEffective ? (
          <LocationPuck puckBearingEnabled puckBearing="heading" />
        ) : null}

        {polygonGeoJSON && (
          <ShapeSource id="event-area-polygon" shape={polygonGeoJSON}>
            <FillLayer id="event-area-fill" style={{ fillColor: APP_COLORS.mapAreaFill }} />
            <LineLayer
              id="event-area-line"
              style={{ lineColor: APP_COLORS.mapAreaLine, lineWidth: 2.5 }}
            />
          </ShapeSource>
        )}

        {currentCoordinate && activeScentPlumeDirectionDegrees != null ? (
          <ScentPlumeLayer
            directionDegrees={activeScentPlumeDirectionDegrees}
            originCoordinate={currentCoordinate}
          />
        ) : null}

        {areaFeatures && (
          <AreaFeatureLayers
            features={areaFeatures}
            idPrefix="event-area-features"
            interactive
            onPressPointFeature={handlePressPointFeature}
          />
        )}

        <AssignmentRouteLayer route={visibleMapRoute} shape={visibleMapRouteGeoJSON} />
        {visibleMeasurementActive ? (
          <MeasurementPointMarkers
            points={measurementPoints}
            onDragPoint={updateMeasurementPointCoordinate}
          />
        ) : null}

        {liveMemberMarkers?.map((marker) => (
          <LiveMemberPositionMarker key={marker.id} marker={marker} />
        ))}

        {assignedStationMarkers?.map((marker) => (
          <AssignedStationMarker
            key={marker.targetKey}
            marker={marker}
            onPress={handlePressStationTarget}
          />
        ))}

        <AnimalSightingLayers
          currentTime={currentTime}
          idPrefix="event"
          sightings={visibleAnimalSightings}
          onPressSighting={handlePressSighting}
        />
      </MapView>

      <View pointerEvents="box-none" className="absolute bottom-0 left-0 right-0 top-0">
        <View
          pointerEvents="box-none"
          className="absolute left-4 right-4"
          style={{ top: Math.max(insets.top, 8) + 8 }}>
          <HuntMapTopNav
            allowedGameLabel={allowedGameSummary}
            forceDetailsVisible={visibleMeasurementActive}
            renderActionsMenu={renderHuntActionsMenu}
            title={event.title}
            windDirectionLabel={windDirectionLabel}
            onBack={() => back()}
            positionSharingEnabled={isActiveHunt ? isOwnPositionSharingEnabled : undefined}
            readinessLabel={
              isActiveHunt && readinessSummary?.total
                ? `${readinessSummary.confirmed}/${readinessSummary.total} på plats`
                : null
            }
            routeSummary={topNavRouteSummary}
          />
        </View>

        <View
          className="absolute left-6"
          style={{ bottom: Math.max(insets.bottom, 20) + 18 }}>
          {visibleMeasurementActive ? (
            <GlassIconButton
              accessibilityLabel="Rensa mätning"
              className="size-14"
              color={APP_COLORS.surface}
              icon="close"
              iconSize={24}
              onPress={clearMeasurement}
              overlayColor="rgba(49, 52, 68, 0.18)"
              surfaceClassName="size-14"
              tintColor="rgba(49, 52, 68, 0.82)"
              tone="dark"
            />
          ) : isActiveHunt ? (
            <HuntMapToolsMenu
              animalSightings={{
                available:
                  visibleAnimalSightings.length > 0 || hasLocallyHiddenCurrentSightings,
                onToggle: handleToggleAnimalSightingVisibility,
                showing: !hasLocallyHiddenCurrentSightings,
              }}
              inPosition={{
                available: Boolean(currentUserAssignedStation),
                marked: currentUserMarkedInPosition,
                onClear: () => {
                  void handleClearSelfInPosition();
                },
                onMark: () => {
                  void handleMarkSelfInPosition();
                },
              }}
              onLocate={() => {
                void handleGoToMyPosition();
              }}
              positions={{
                onToggleOthers: toggleOtherUserPositions,
                onToggleOwnSharing: () => {
                  void handleToggleOwnPositionSharing();
                },
                ownSharingEnabled: isOwnPositionSharingEnabled,
                showOthers: showOtherUserPositions,
              }}
              route={{
                available: Boolean(currentUserAssignedStation),
                onToggle: () => {
                  void handleToggleAssignmentTrail();
                },
                visible:
                  Boolean(currentUserAssignedStation) &&
                  activeAssignmentTrailTargetKey === currentUserAssignedStation?.targetKey,
              }}
              scent={{
                hasDirection: activeWindSourceDirectionDegrees != null,
                isSetting: false,
                onSet: handleStartSettingScentDirection,
              }}
            />
          ) : null}
        </View>

        <View
          className="absolute right-6"
          style={{ bottom: Math.max(insets.bottom, 20) + 18 }}>
          <GlassIconButton
            onPress={() => push(`/event/${eventId}/chat?focusComposer=1`)}
            accessibilityLabel={
              unreadMessageCount
                ? `Öppna chat, ${unreadMessageCount} olästa meddelanden`
                : 'Öppna chat'
            }
            className="relative size-16"
            color={APP_COLORS.surface}
            icon="chatbubbles"
            iconSize={29}
            overlayColor="rgba(29, 95, 43, 0.22)"
            surfaceClassName="size-16"
            tintColor={APP_COLORS.primary}
            tone="dark"
            style={{
              borderColor: 'rgba(254, 253, 251, 0.7)',
              borderWidth: 1,
              boxShadow: '0 8px 22px rgba(49, 52, 68, 0.2)',
            }}
          />
          {unreadMessageCount ? (
            <View className="absolute -right-1 -top-1 min-h-6 min-w-6 items-center justify-center rounded-full bg-destructive px-1.5">
              <Text className="text-[11px] font-bold leading-4 text-white">
                {unreadMessageCount > 99 ? '99+' : unreadMessageCount}
              </Text>
            </View>
          ) : null}
        </View>

      </View>

      <HuntMapLongPressActionSheet
        canMeasureFromUser={Boolean(currentMeasurementStartCoordinate)}
        coordinate={isActiveHunt ? longPressActionPoint : null}
        onAddMeasurementPoint={handleAddMeasurementPoint}
        onClose={handleCloseLongPressActionSheet}
        onMarkAnimalSighting={handleMarkAnimalSighting}
        onMeasureToPoint={handleMeasureToLongPressPoint}
      />
      <AnimalSightingActionSheet
        currentTime={currentTime}
        sighting={selectedSighting}
        onClose={handleCloseSightingSheet}
        onHide={handleHideSighting}
      />
    </View>
  );
}
