import { AreaFeatureLayers } from '@/components/AreaFeatureLayers';
import { AnimalSightingLayers } from '@/components/event/animal-sighting-layers';
import { AnimalSightingPicker } from '@/components/event/animal-sighting-picker';
import { AssignedStationMarker, type AssignedStationMarkerItem } from '@/components/event/assigned-station-marker';
import { AssignmentRouteLayer } from '@/components/event/assignment-route-layer';
import { HuntActionsMenu } from '@/components/event/hunt-actions-menu';
import { HuntMapTopNav } from '@/components/event/hunt-map-top-nav';
import { HuntMapToolsMenu } from '@/components/event/hunt-map-tools-menu';
import {
  LiveMemberPositionMarker,
  type LiveMemberPositionMarkerItem,
} from '@/components/event/live-member-position-marker';
import { ScentDirectionOverlay } from '@/components/event/scent-direction-overlay';
import { ScentPlumeLayer } from '@/components/event/scent-plume-layer';
import { IconButton, Text } from '@/components/ui';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import {
  AnimalSightingMapItem,
  AnimalSightingType,
  getAnimalSightingLabel,
} from '@/lib/animal-sightings';
import { formatAllowedGameDetails, formatAllowedGameSummary } from '@/lib/allowed-game';
import { AreaFeatureListItem, getAreaFeatureTargetKey } from '@/lib/area-features';
import { isEventActive } from '@/lib/event-lifecycle';
import { getMemberInitials } from '@/lib/event-formatting';
import { distanceMeters } from '@/lib/geo';
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
import { useAssignmentRoute } from '@/hooks/use-assignment-route';
import { useCurrentTime } from '@/hooks/use-current-time';
import { useHuntMapUiState } from '@/hooks/use-hunt-map-ui-state';
import { useInPositionPrompts } from '@/hooks/use-in-position-prompts';
import { Ionicons } from '@expo/vector-icons';
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

function pointFromMapLongPress(event: GeoJSON.Feature) {
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
  const [scentDirectionDegrees, setScentDirectionDegrees] = useState<number | null>(null);
  const [isSettingScentDirection, setIsSettingScentDirection] = useState(false);
  const {
    pendingAnimalSighting,
    setPendingAnimalSighting,
    setVisibleAssignmentTrailTargetKey,
    showOtherUserPositions,
    toggleOtherUserPositions,
    visibleAssignmentTrailTargetKey,
  } = useHuntMapUiState();

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
  const reportAnimalSighting = useMutation(api.animalSightings.report);
  const acknowledgeAnimalSighting = useMutation(api.animalSightings.acknowledge);
  const isActiveHunt = Boolean(event && isEventActive(event, currentTime));
  const activeScentDirectionDegrees = isActiveHunt ? scentDirectionDegrees : null;
  const activeAssignmentTrailTargetKey = isActiveHunt ? visibleAssignmentTrailTargetKey : null;
  const ownPositionSharingEnabledRef = useRef(true);

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

      setPendingAnimalSighting({ ...pointFromMapLongPress(mapEvent), isReporting: false });
      Vibration.vibrate(8);
    },
    [isActiveHunt, setPendingAnimalSighting]
  );

  const handleSelectAnimalSighting = useCallback(
    async (animal: AnimalSightingType) => {
      if (!pendingAnimalSighting || pendingAnimalSighting.isReporting) {
        return;
      }

      setPendingAnimalSighting((current) =>
        current ? { ...current, isReporting: true } : current
      );
      try {
        await reportAnimalSighting({
          eventId: eventId as Id<'events'>,
          animal,
          latitude: pendingAnimalSighting.latitude,
          longitude: pendingAnimalSighting.longitude,
        });
        setPendingAnimalSighting(null);
      } catch (error) {
        console.error('Failed to report animal sighting:', error);
        Alert.alert('Kunde inte skicka observation', 'Försök igen om en stund.');
        setPendingAnimalSighting((current) =>
          current ? { ...current, isReporting: false } : current
        );
      }
    },
    [eventId, pendingAnimalSighting, reportAnimalSighting, setPendingAnimalSighting]
  );

  const handlePressAnimalSighting = useCallback(
    (sighting: AnimalSightingMapItem) => {
      const label = sighting.label ?? getAnimalSightingLabel(sighting.animal);
      const reporter = sighting.user?.name?.trim() || 'Okänd jägare';

      Alert.alert(label, `${reporter} markerade observationen på kartan.`, [
        { text: 'Stäng', style: 'cancel' },
        {
          text: 'Kvittera',
          onPress: () => {
            void acknowledgeAnimalSighting({ sightingId: sighting._id }).catch((error) => {
              console.error('Failed to acknowledge animal sighting:', error);
              Alert.alert('Kunde inte kvittera', 'Försök igen om en stund.');
            });
          },
        },
      ]);
    },
    [acknowledgeAnimalSighting]
  );

  function handleShowAllowedGame() {
    if (!event?.allowedGame?.length) {
      return;
    }

    Alert.alert('Tillåtet vilt', formatAllowedGameDetails(event.allowedGame));
  }

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

  const handleSetScentDirection = useCallback((directionDegrees: number) => {
    setScentDirectionDegrees(directionDegrees);
    setIsSettingScentDirection(false);
  }, []);

  const handleClearScentDirection = useCallback(() => {
    setScentDirectionDegrees(null);
    setIsSettingScentDirection(false);
  }, []);

  const handleStartSettingScentDirection = useCallback(() => {
    setIsSettingScentDirection(true);
  }, []);

  const handleCancelSettingScentDirection = useCallback(() => {
    setIsSettingScentDirection(false);
  }, []);

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

        {currentCoordinate && activeScentDirectionDegrees != null ? (
          <ScentPlumeLayer
            directionDegrees={activeScentDirectionDegrees}
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

        <AssignmentRouteLayer route={assignmentRoute} shape={assignmentRouteGeoJSON} />

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
          idPrefix="event"
          sightings={animalSightings}
          onPressSighting={handlePressAnimalSighting}
        />
      </MapView>

      <View pointerEvents="box-none" className="absolute bottom-0 left-0 right-0 top-0">
        <View
          pointerEvents="box-none"
          className="absolute left-4 right-4"
          style={{ top: Math.max(insets.top, 8) + 8 }}>
          <HuntMapTopNav
            allowedGameLabel={allowedGameSummary}
            onAllowedGamePress={handleShowAllowedGame}
            renderActionsMenu={renderHuntActionsMenu}
            title={event.title}
            onBack={() => back()}
            positionSharingEnabled={isActiveHunt ? isOwnPositionSharingEnabled : undefined}
            readinessLabel={
              isActiveHunt && readinessSummary?.total
                ? `${readinessSummary.confirmed}/${readinessSummary.total} på plats`
                : null
            }
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
          {isActiveHunt ? (
            <HuntMapToolsMenu
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
                hasDirection: activeScentDirectionDegrees != null,
                isSetting: isActiveHunt && isSettingScentDirection,
                onClear: handleClearScentDirection,
                onSet: handleStartSettingScentDirection,
              }}
            />
          ) : null}
        </View>

        <View
          className="absolute right-6"
          style={{ bottom: Math.max(insets.bottom, 20) + 18 }}>
          <IconButton
            size="lg"
            onPress={() => push(`/event/${eventId}/chat?focusComposer=1`)}
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

        {pendingAnimalSighting ? (
          <View
            className="absolute left-4 right-4"
            style={{ bottom: Math.max(insets.bottom, 20) + 96 }}>
            <AnimalSightingPicker
              disabled={pendingAnimalSighting.isReporting}
              onCancel={() => setPendingAnimalSighting(null)}
              onSelect={(animal) => {
                void handleSelectAnimalSighting(animal);
              }}
            />
          </View>
        ) : null}

        <ScentDirectionOverlay
          active={isActiveHunt && isSettingScentDirection}
          bottomInset={Math.max(insets.bottom, 20)}
          onCancel={handleCancelSettingScentDirection}
          onDirectionSet={handleSetScentDirection}
        />
      </View>
    </View>
  );
}
