import { AreaFeatureLayers } from '@/components/AreaFeatureLayers';
import { AreaSatLayers } from '@/components/AreaSatLayers';
import { showAnimalSightingActionMenu } from '@/components/event/animal-sighting-action-menu';
import { AnimalSightingLayers } from '@/components/event/animal-sighting-layers';
import { AssignedStationMarker } from '@/components/event/assigned-station-marker';
import { AssignmentRouteLayer } from '@/components/event/assignment-route-layer';
import { HuntActionsMenu } from '@/components/event/hunt-actions-menu';
import { HuntMapMeasurementControls } from '@/components/event/hunt-map-measurement-controls';
import { HuntMapTopNav } from '@/components/event/hunt-map-top-nav';
import { HuntMapToolsMenu } from '@/components/event/hunt-map-tools-menu';
import { GlassIconButton } from '@/components/glass';
import { LiveMemberPositionMarker } from '@/components/event/live-member-position-marker';
import { MapScaleBar } from '@/components/map/map-scale-bar';
import { MeasurementPointMarkers } from '@/components/event/measurement-point-markers';
import { ScentPlumeLayer } from '@/components/event/scent-plume-layer';
import { Text } from '@/components/ui';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { formatAllowedGameSummary } from '@/lib/allowed-game';
import type { AnimalSightingMapItem } from '@/lib/animal-sightings';
import { AreaFeatureListItem, getAreaFeatureTargetKey } from '@/lib/area-features';
import { buildAreaPolygonFeature, getAreaCameraBounds } from '@/lib/area-map';
import { getEventLifecycle, isEventActive } from '@/lib/event-lifecycle';
import { isPointInPolygon, type LatLngPoint } from '@/lib/geo';
import type { AssignmentTrail } from '@/lib/hunt-navigation';
import { subscribeToHuntMapLongPressActions } from '@/lib/hunt-map-long-press-actions';
import {
  IN_POSITION_RADIUS_METERS,
  NEAR_ASSIGNED_POSITION_RADIUS_METERS,
} from '@/lib/hunt-in-position';
import { clearInPositionPromptIgnored } from '@/lib/in-position-prompt-ignore';
import { getCurrentUserCoordinate } from '@/lib/location';
import {
  getCachedMapStyle,
  getSavedMapStyle,
  subscribeToMapStyleChanges,
} from '@/lib/map-styles';
import { APP_COLORS } from '@/lib/theme';
import { oppositeDirectionDegrees } from '@/lib/wind-direction';
import { subscribeToWindDirectionSelection } from '@/lib/wind-direction-selection';
import { useActiveSatMapState } from '@/hooks/use-active-sat-map-state';
import { useAnimalSightingMapVisibility } from '@/hooks/use-animal-sighting-map-visibility';
import { useAssignedStationMapState } from '@/hooks/use-assigned-station-map-state';
import { useAssignmentRoute } from '@/hooks/use-assignment-route';
import { useCurrentTime } from '@/hooks/use-current-time';
import { useHuntMapMeasurement } from '@/hooks/use-hunt-map-measurement';
import { useHuntMapUiState } from '@/hooks/use-hunt-map-ui-state';
import { useInPositionPrompts } from '@/hooks/use-in-position-prompts';
import { useLiveMemberPositionMarkers } from '@/hooks/use-live-member-position-markers';
import { useMapCameraState } from '@/hooks/use-map-camera-state';
import {
  Camera,
  CircleLayer,
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

function getWindEditorCameraPadding(insets: { bottom: number; top: number }) {
  return {
    paddingBottom: Math.max(insets.bottom + 360, 380),
    paddingLeft: 36,
    paddingRight: 36,
    paddingTop: Math.max(insets.top + 96, 124),
  };
}

export default function EventMapScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const { back, push } = useRouter();
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<ElementRef<typeof Camera>>(null);
  const currentTime = useCurrentTime();
  const [mapStyleURL, setMapStyleURL] = useState(() => getCachedMapStyle().styleURL);
  const {
    handleCameraChanged,
    heading: mapHeading,
    resetHeading: handleResetMapNorth,
    scale: mapScale,
  } = useMapCameraState(cameraRef);
  const [currentCoordinate, setCurrentCoordinate] = useState<[number, number] | null>(null);
  const [windSourceDirectionDegrees, setWindSourceDirectionDegrees] = useState<number | null>(null);
  const [showOtherPassMarkers, setShowOtherPassMarkers] = useState(false);
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
    undoLastPoint: undoMeasurementPoint,
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
  const areaSats = useQuery(
    api.areaSats.listForEvent,
    event ? { eventId: eventId as Id<'events'> } : 'skip'
  );
  const satSetup = useQuery(
    api.eventSats.getSetup,
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
  const isEndedHunt = Boolean(event && getEventLifecycle(event, currentTime) === 'ended');
  const activeWindSourceDirectionDegrees = isActiveHunt ? windSourceDirectionDegrees : null;
  const activeScentPlumeDirectionDegrees =
    activeWindSourceDirectionDegrees == null
      ? null
      : oppositeDirectionDegrees(activeWindSourceDirectionDegrees);
  const activeAssignmentTrailTargetKey = isActiveHunt ? visibleAssignmentTrailTargetKey : null;
  const ownPositionSharingEnabledRef = useRef(true);
  const {
    hasLocallyHiddenCurrentSightings,
    handleHideSighting,
    handleToggleVisibility: handleToggleAnimalSightingVisibility,
    visibleSightings: visibleAnimalSightings,
  } = useAnimalSightingMapVisibility(animalSightings);

  const handlePressSighting = useCallback(
    (sighting: AnimalSightingMapItem) => {
      showAnimalSightingActionMenu({
        currentTime,
        sighting,
        onHide: () => {
          void handleHideSighting(sighting);
        },
      });
    },
    [currentTime, handleHideSighting]
  );

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

  const {
    activeSat,
    featurePointStates,
    selectedPassTargetKeys,
    visibleAreaFeatures,
    visibleAreaSats,
  } = useActiveSatMapState({
    areaFeatures,
    areaSats,
    isEndedHunt,
    satSetup,
    showOtherPassMarkers,
  });
  const liveMemberMarkers = useLiveMemberPositionMarkers({
    currentUserId: currentUser?._id,
    members,
    showOtherUserPositions,
  });
  const allowedGameSummary = formatAllowedGameSummary(event?.allowedGame);

  const {
    assignedStationMarkers,
    currentMeasurementStartCoordinate,
    currentUserAssignedStation,
    currentUserAssignmentDistance,
    currentUserAssignmentPromptIgnoreKey,
    currentUserInPositionEffective,
    currentUserMarkedInPosition,
    currentUserMemberCoordinate,
    isOwnPositionSharingEnabled,
    readinessSummary,
  } = useAssignedStationMapState({
    activeSat,
    areaFeatures,
    assignments,
    currentCoordinate,
    currentTime,
    currentUser,
    eventId,
    members,
  });

  const longPressPointGeoJSON = useMemo<GeoJSON.Feature<GeoJSON.Point> | null>(() => {
    if (!longPressActionPoint) {
      return null;
    }

    return {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Point',
        coordinates: [longPressActionPoint.longitude, longPressActionPoint.latitude],
      },
    };
  }, [longPressActionPoint]);

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
    () => {
      push(`/event/${eventId}/sat`);
    },
    [eventId, push]
  );

  const handlePressPointFeature = useCallback(
    (feature: AreaFeatureListItem) => {
      const targetKey = getAreaFeatureTargetKey(feature);
      if (feature.category !== 'pass' || !selectedPassTargetKeys.has(targetKey)) {
        return;
      }
      handlePressStationTarget();
    },
    [handlePressStationTarget, selectedPassTargetKeys]
  );

  const handleMapLongPress = useCallback(
    (mapEvent: GeoJSON.Feature) => {
      if (!isActiveHunt) {
        return;
      }

      const point = pointFromMapLongPress(mapEvent);
      Vibration.vibrate(8);

      if (measurementActive) {
        addMeasurementPoint(point);
        setLongPressActionPoint(null);
        return;
      }

      setLongPressActionPoint(point);
      const satOptions =
        event && currentUser && event.creatorId === currentUser._id && areaSats
          ? areaSats
              .filter((sat) => isPointInPolygon(point, sat.polygon))
              .map((sat) => ({ id: String(sat.id), name: sat.name }))
          : [];
      const satOptionsParam =
        satOptions.length > 0
          ? `&satOptions=${encodeURIComponent(JSON.stringify(satOptions))}`
          : '';
      push(
        `/event/${eventId}/map-point-actions?latitude=${point.latitude}&longitude=${point.longitude}&canMeasureFromUser=${
          currentMeasurementStartCoordinate ? '1' : '0'
        }${satOptionsParam}`
      );
    },
    [
      addMeasurementPoint,
      areaSats,
      currentMeasurementStartCoordinate,
      currentUser,
      event,
      eventId,
      isActiveHunt,
      measurementActive,
      push,
      setLongPressActionPoint,
    ]
  );

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

  useEffect(() => {
    return subscribeToHuntMapLongPressActions((action) => {
      switch (action.type) {
        case 'addMeasurementPoint':
          handleAddMeasurementPoint(action.point);
          break;
        case 'clearPoint':
          setLongPressActionPoint(null);
          break;
        case 'measureToPoint':
          handleMeasureToLongPressPoint(action.point);
          break;
      }
    });
  }, [
    handleAddMeasurementPoint,
    handleMeasureToLongPressPoint,
    setLongPressActionPoint,
  ]);

  const handleMarkSelfInPosition = useCallback(async () => {
    try {
      await markInPosition({ eventId: eventId as Id<'events'> });
      await clearInPositionPromptIgnored(currentUserAssignmentPromptIgnoreKey);
    } catch (error) {
      console.error('Failed to mark in position:', error);
      Alert.alert('Kunde inte markera på plats', 'Försök igen om en stund.');
    }
  }, [currentUserAssignmentPromptIgnoreKey, eventId, markInPosition]);

  const handleClearSelfInPosition = useCallback(async () => {
    try {
      await clearInPosition({ eventId: eventId as Id<'events'> });
      await clearInPositionPromptIgnored(currentUserAssignmentPromptIgnoreKey);
    } catch (error) {
      console.error('Failed to clear in-position status:', error);
      Alert.alert('Kunde inte ta bort status', 'Försök igen om en stund.');
    }
  }, [clearInPosition, currentUserAssignmentPromptIgnoreKey, eventId]);

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

  const focusMapForWindEditor = useCallback(
    (coordinate: [number, number]) => {
      setCurrentCoordinate(coordinate);
      cameraRef.current?.setCamera({
        animationDuration: 650,
        animationMode: 'easeTo',
        centerCoordinate: coordinate,
        padding: getWindEditorCameraPadding(insets),
        pitch: 0,
        zoomLevel: 16.5,
      });
    },
    [insets]
  );

  const handleStartSettingScentDirection = useCallback(() => {
    const existingCoordinate = currentCoordinate ?? currentUserMemberCoordinate;
    if (existingCoordinate) {
      focusMapForWindEditor(existingCoordinate);
    } else {
      void getCurrentUserCoordinate()
        .then((coordinate) => {
          if (coordinate) {
            focusMapForWindEditor(coordinate);
          }
        })
        .catch((error) => {
          console.error('Failed to focus map for wind direction editing:', error);
        });
    }

    const initialDegrees =
      windSourceDirectionDegrees == null
        ? ''
        : `?initialDegrees=${encodeURIComponent(String(Math.round(windSourceDirectionDegrees)))}`;
    push(`/event/${eventId}/wind-direction${initialDegrees}`);
  }, [
    currentCoordinate,
    currentUserMemberCoordinate,
    eventId,
    focusMapForWindEditor,
    push,
    windSourceDirectionDegrees,
  ]);

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
    promptIgnoreKey: currentUserAssignmentPromptIgnoreKey,
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
    areaFeatures === undefined ||
    areaSats === undefined ||
    satSetup === undefined ||
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
        rotateEnabled
        pitchEnabled={false}
        attributionEnabled={false}
        onCameraChanged={handleCameraChanged}
        onLongPress={isActiveHunt ? handleMapLongPress : undefined}
        scaleBarEnabled={false}>
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

        {visibleAreaSats.length > 0 ? (
          <AreaSatLayers
            sats={visibleAreaSats}
            idPrefix="event-area-sats"
            activeSatId={activeSat ? String(activeSat.id) : null}
          />
        ) : null}

        {currentCoordinate && activeScentPlumeDirectionDegrees != null ? (
          <ScentPlumeLayer
            directionDegrees={activeScentPlumeDirectionDegrees}
            originCoordinate={currentCoordinate}
          />
        ) : null}

        {visibleAreaFeatures && (
          <AreaFeatureLayers
            features={visibleAreaFeatures}
            idPrefix="event-area-features"
            interactive
            onPressPointFeature={handlePressPointFeature}
            pointStates={featurePointStates}
          />
        )}

        <AssignmentRouteLayer route={visibleMapRoute} shape={visibleMapRouteGeoJSON} />
        {visibleMeasurementActive ? (
          <MeasurementPointMarkers
            points={measurementPoints}
            onDragPoint={updateMeasurementPointCoordinate}
          />
        ) : null}

        {longPressPointGeoJSON ? (
          <ShapeSource id="event-long-press-point" shape={longPressPointGeoJSON}>
            <CircleLayer
              id="event-long-press-point-ring"
              style={{
                circleColor: '#ffffff',
                circleOpacity: 0.86,
                circleRadius: 14,
                circleStrokeColor: APP_COLORS.primary,
                circleStrokeWidth: 3,
              }}
            />
            <CircleLayer
              id="event-long-press-point-dot"
              style={{
                circleColor: APP_COLORS.primary,
                circleRadius: 5,
              }}
            />
          </ShapeSource>
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
            compassHeading={mapHeading}
            forceDetailsVisible={visibleMeasurementActive}
            measurementOnly={visibleMeasurementActive}
            renderActionsMenu={visibleMeasurementActive ? undefined : renderHuntActionsMenu}
            title={event.title}
            windDirectionDegrees={activeWindSourceDirectionDegrees}
            onBack={() => back()}
            onCompassPress={handleResetMapNorth}
            positionSharingEnabled={isActiveHunt ? isOwnPositionSharingEnabled : undefined}
            readinessLabel={
              isActiveHunt && readinessSummary?.total
                ? `${readinessSummary.confirmed}/${readinessSummary.total} på plats`
                : null
            }
            routeSummary={topNavRouteSummary}
            satLabel={activeSat ? `Såt: ${activeSat.name}` : null}
          />
        </View>

        {mapScale ? (
          <MapScaleBar
            latitude={mapScale.latitude}
            zoom={mapScale.zoom}
            style={{ left: 16, top: Math.max(insets.top, 8) + 128 }}
          />
        ) : null}

        <View
          className="absolute left-6"
          style={{ bottom: Math.max(insets.bottom, 20) + 18 }}>
          {visibleMeasurementActive ? (
            <HuntMapMeasurementControls
              onClear={clearMeasurement}
              onUndo={undoMeasurementPoint}
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
              otherMarkers={{
                available: Boolean(activeSat),
                onToggle: () => setShowOtherPassMarkers((showing) => !showing),
                showing: showOtherPassMarkers,
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
                onSet: handleStartSettingScentDirection,
              }}
            />
          ) : null}
        </View>

        {!visibleMeasurementActive ? (
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
        ) : null}
      </View>
    </View>
  );
}
