import { AreaFeatureLayers } from '@/components/AreaFeatureLayers';
import { AreaSatLayers } from '@/components/AreaSatLayers';
import { AreaActionsMenu } from '@/components/area/area-actions-menu';
import { AreaUnavailableState } from '@/components/area/area-unavailable-state';
import { PolygonDrawingControls } from '@/components/area/polygon-drawing-controls';
import { PolygonDrawingLayers } from '@/components/area/polygon-drawing-layers';
import { DraggableAreaPointMarkers } from '@/components/DraggableAreaPointMarkers';
import { GlassFloatingButton, GlassTopNav } from '@/components/glass';
import { MapScaleBar } from '@/components/map/map-scale-bar';
import { NorthCompassButton } from '@/components/map/north-compass-button';
import { Button, Text } from '@/components/ui';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import {
  areaFeaturePointToLngLat,
  getAreaFeatureTargetKey,
  type LatLngPoint,
} from '@/lib/area-features';
import {
  buildAreaPolygonFeature,
  getAreaCameraBounds,
  latLngPointFromMapFeature,
} from '@/lib/area-map';
import { useAreaMarkerGestures } from '@/hooks/use-area-marker-gestures';
import { useMapCameraState } from '@/hooks/use-map-camera-state';
import { usePolygonEditing } from '@/hooks/use-polygon-editing';
import { getDefaultAreaSatColor } from '@/lib/area-sats';
import { saveAreaSatDraft } from '@/lib/area-sat-draft-store';
import { distanceMeters, type LngLat } from '@/lib/geo';
import { getCurrentUserCoordinate } from '@/lib/location';
import {
  getCachedMapStyle,
  getSavedMapStyle,
  subscribeToMapStyleChanges,
} from '@/lib/map-styles';
import { unionLatLngPolygons } from '@/lib/polygon-union';
import { APP_COLORS } from '@/lib/theme';
import {
  Camera,
  FillLayer,
  LineLayer,
  LocationPuck,
  MapView,
  ShapeSource,
} from '@rnmapbox/maps';
import { useMutation, useQuery } from 'convex/react';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { type ElementRef, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, View, type GestureResponderEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type SatDrawingMode = 'freehand' | 'points';

function lngLatToLatLngPoint([longitude, latitude]: LngLat): LatLngPoint {
  return { latitude, longitude };
}

export default function ViewAreaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { back, push } = useRouter();
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<ElementRef<typeof Camera>>(null);
  const mapRef = useRef<MapView | null>(null);
  const {
    handleCameraChanged,
    heading: mapHeading,
    resetHeading: handleResetMapNorth,
    scale: mapScale,
  } = useMapCameraState(cameraRef);
  const satFreehandLastPointRef = useRef<LatLngPoint | null>(null);
  const satFreehandBasePolygonRef = useRef<LatLngPoint[] | null>(null);
  const satFreehandStrokeRef = useRef<LatLngPoint[]>([]);
  const satFreehandHistoryRef = useRef<LatLngPoint[][]>([]);
  const [mapStyleURL, setMapStyleURL] = useState(() => getCachedMapStyle().styleURL);
  const [satDrawingPoints, setSatDrawingPoints] = useState<LatLngPoint[] | null>(null);
  const [satDrawingMode, setSatDrawingMode] = useState<SatDrawingMode>('freehand');
  const [satFreehandPreviewPoints, setSatFreehandPreviewPoints] = useState<LatLngPoint[]>([]);
  const [isEditingAreaPolygon, setIsEditingAreaPolygon] = useState(false);
  const [areaEditingError, setAreaEditingError] = useState<string | null>(null);
  const [isUpdatingAreaPolygon, setIsUpdatingAreaPolygon] = useState(false);
  const updateArea = useMutation(api.areas.update);
  const area = useQuery(api.areas.get, { areaId: id as Id<'areas'> });
  const areaFeatures = useQuery(
    api.areaFeatures.listByArea,
    area ? { areaId: id as Id<'areas'> } : 'skip'
  );
  const areaSats = useQuery(
    api.areaSats.listByArea,
    area ? { areaId: id as Id<'areas'> } : 'skip'
  );
  const {
    draggedPointOverrides,
    handleDropFeature,
    handleMapLongPress,
    handlePressFeature,
    handleStartDraggingFeature,
    resetMarkerGestureLocks,
  } = useAreaMarkerGestures(id as Id<'areas'>);

  useEffect(() => {
    return subscribeToMapStyleChanges((style) => {
      setMapStyleURL(style.styleURL);
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      resetMarkerGestureLocks();

      void getSavedMapStyle().then((style) => {
        if (!cancelled) {
          setMapStyleURL((current) => (current === style.styleURL ? current : style.styleURL));
        }
      });

      return () => {
        cancelled = true;
      };
    }, [resetMarkerGestureLocks])
  );

  const polygonGeoJSON = useMemo(() => {
    if (!area) return null;
    return buildAreaPolygonFeature(area);
  }, [area]);

  const cameraBounds = useMemo(() => {
    if (!area) return null;
    return getAreaCameraBounds(area, {
      top: Math.max(insets.top + 92, 112),
      bottom: Math.max(insets.bottom + 96, 120),
      left: 40,
      right: 40,
    });
  }, [area, insets.bottom, insets.top]);

  const visibleAreaFeatures = useMemo(() => {
    if (!areaFeatures) {
      return areaFeatures;
    }

    return areaFeatures.map((feature) => {
      const override = draggedPointOverrides[getAreaFeatureTargetKey(feature)];
      if (!override || feature.geometryType !== 'point') {
        return feature;
      }

      return {
        ...feature,
        point: override,
      };
    });
  }, [areaFeatures, draggedPointOverrides]);

  const areaEditInitialPoints = useMemo(
    () => area?.polygon.map(areaFeaturePointToLngLat) ?? [],
    [area]
  );

  const handleCompleteAreaEditing = useCallback(
    (points: LngLat[]) => {
      setIsUpdatingAreaPolygon(true);
      setAreaEditingError(null);
      void updateArea({
        areaId: id as Id<'areas'>,
        polygon: points.map(lngLatToLatLngPoint),
      })
        .then(() => {
          setIsEditingAreaPolygon(false);
        })
        .catch((error) => {
          setAreaEditingError(
            error instanceof Error ? error.message : 'Kunde inte spara området.'
          );
        })
        .finally(() => {
          setIsUpdatingAreaPolygon(false);
        });
    },
    [id, updateArea]
  );

  const areaPolygonEditing = usePolygonEditing({
    initialPoints: areaEditInitialPoints,
    mapRef,
    onComplete: handleCompleteAreaEditing,
  });

  const isDrawingSat = satDrawingPoints !== null;
  const isSatFreehandDrawing = isDrawingSat && satDrawingMode === 'freehand';
  const isEditingPolygon = isDrawingSat || isEditingAreaPolygon;
  const satDrawingColor = getDefaultAreaSatColor(areaSats?.length ?? 0);
  const areaDrawingColor = APP_COLORS.primary;

  const resetSatFreehandGesture = useCallback(() => {
    satFreehandLastPointRef.current = null;
    satFreehandBasePolygonRef.current = null;
    satFreehandStrokeRef.current = [];
    setSatFreehandPreviewPoints([]);
  }, []);

  const handleStartSatDrawing = useCallback(() => {
    setIsEditingAreaPolygon(false);
    setAreaEditingError(null);
    setSatDrawingMode('freehand');
    setSatDrawingPoints([]);
    satFreehandHistoryRef.current = [];
    resetSatFreehandGesture();
  }, [resetSatFreehandGesture]);

  const handleCancelSatDrawing = useCallback(() => {
    resetSatFreehandGesture();
    satFreehandHistoryRef.current = [];
    setSatDrawingPoints(null);
  }, [resetSatFreehandGesture]);

  const handleUndoSatPoint = useCallback(() => {
    if (satDrawingMode === 'freehand') {
      const activeBasePolygon = satFreehandBasePolygonRef.current;
      const hasActiveStroke = satFreehandStrokeRef.current.length > 0;
      resetSatFreehandGesture();

      if (hasActiveStroke) {
        setSatDrawingPoints((current) => (current === null ? current : activeBasePolygon ?? current));
        return;
      }

      const previousPolygon = satFreehandHistoryRef.current.pop();
      setSatDrawingPoints((current) => (current === null ? current : previousPolygon ?? []));
      return;
    }

    resetSatFreehandGesture();
    setSatDrawingPoints((current) => (current === null ? current : current.slice(0, -1)));
  }, [resetSatFreehandGesture, satDrawingMode]);

  const handleStartAreaDrawing = useCallback(() => {
    if (!area) {
      return;
    }
    resetSatFreehandGesture();
    satFreehandHistoryRef.current = [];
    setSatDrawingPoints(null);
    setAreaEditingError(null);
    areaPolygonEditing.replacePolygonPoints(area.polygon.map(areaFeaturePointToLngLat));
    setIsEditingAreaPolygon(true);
  }, [area, areaPolygonEditing, resetSatFreehandGesture]);

  const handleCancelAreaDrawing = useCallback(() => {
    setIsEditingAreaPolygon(false);
    setAreaEditingError(null);
    if (area) {
      areaPolygonEditing.replacePolygonPoints(area.polygon.map(areaFeaturePointToLngLat));
    }
  }, [area, areaPolygonEditing]);

  const handleUndoAreaPoint = useCallback(() => {
    setAreaEditingError(null);
    areaPolygonEditing.handleUndo();
  }, [areaPolygonEditing]);

  const handlePressMapWhileDrawing = useCallback(
    (feature: GeoJSON.Feature) => {
      if (isEditingAreaPolygon) {
        setAreaEditingError(null);
        areaPolygonEditing.handleMapPress(feature);
        return;
      }

      if (isDrawingSat && satDrawingMode === 'points') {
        const point = latLngPointFromMapFeature(feature);
        if (!point) {
          return;
        }

        setSatDrawingPoints((current) => (current === null ? current : [...current, point]));
      }
    },
    [areaPolygonEditing, isDrawingSat, isEditingAreaPolygon, satDrawingMode]
  );

  const handleContinueSatDrawing = useCallback(() => {
    if (!satDrawingPoints || satDrawingPoints.length < 3) {
      return;
    }

    const draftId = saveAreaSatDraft({
      areaId: id as Id<'areas'>,
      color: satDrawingColor,
      name: '',
      polygon: satDrawingPoints,
    });
    resetSatFreehandGesture();
    satFreehandHistoryRef.current = [];
    setSatDrawingPoints(null);
    push(`/area/${id}/sat?draftId=${draftId}`);
  }, [id, push, resetSatFreehandGesture, satDrawingColor, satDrawingPoints]);

  const handleSatFreehandTouchStart = useCallback(
    async (event: GestureResponderEvent) => {
      if (!mapRef.current || !isSatFreehandDrawing) {
        return;
      }
      if ((event.nativeEvent.touches?.length ?? 1) > 1) {
        return;
      }

      const { pageX, pageY } = event.nativeEvent;
      try {
        const [longitude, latitude] = (await mapRef.current.getCoordinateFromView([
          pageX,
          pageY,
        ])) as LngLat;
        const point = { latitude, longitude };
        const basePolygon =
          satDrawingPoints && satDrawingPoints.length >= 3 ? satDrawingPoints : null;
        satFreehandLastPointRef.current = point;
        satFreehandBasePolygonRef.current = basePolygon;
        satFreehandStrokeRef.current = [point];
        setSatFreehandPreviewPoints([point]);
      } catch {
        // The map can reject coordinate conversion while it is mounting.
      }
    },
    [isSatFreehandDrawing, satDrawingPoints]
  );

  const handleSatFreehandTouchMove = useCallback(
    async (event: GestureResponderEvent) => {
      if (!mapRef.current || !isSatFreehandDrawing) {
        return;
      }
      if ((event.nativeEvent.touches?.length ?? 1) > 1) {
        resetSatFreehandGesture();
        return;
      }

      const { pageX, pageY } = event.nativeEvent;
      try {
        const [longitude, latitude] = (await mapRef.current.getCoordinateFromView([
          pageX,
          pageY,
        ])) as LngLat;
        const point = { latitude, longitude };
        const lastPoint = satFreehandLastPointRef.current;
        if (lastPoint && distanceMeters(lastPoint, point) < 8) {
          return;
        }

        satFreehandLastPointRef.current = point;
        const nextStroke = [...satFreehandStrokeRef.current, point];
        satFreehandStrokeRef.current = nextStroke;
        setSatFreehandPreviewPoints(nextStroke);
      } catch {
        // The native map can disappear mid-gesture during navigation.
      }
    },
    [isSatFreehandDrawing, resetSatFreehandGesture]
  );

  const handleSatFreehandTouchEnd = useCallback(() => {
    const stroke = satFreehandStrokeRef.current;
    const basePolygon = satFreehandBasePolygonRef.current;
    satFreehandLastPointRef.current = null;
    satFreehandBasePolygonRef.current = null;
    satFreehandStrokeRef.current = [];
    setSatFreehandPreviewPoints([]);

    if (stroke.length === 0 && !basePolygon) {
      return;
    }

    if (stroke.length < 3) {
      setSatDrawingPoints(basePolygon ?? []);
      return;
    }

    satFreehandHistoryRef.current = [
      ...satFreehandHistoryRef.current,
      basePolygon ? [...basePolygon] : [],
    ];
    setSatDrawingPoints(basePolygon ? unionLatLngPolygons(basePolygon, stroke) : stroke);
  }, []);

  const handleSaveAreaDrawing = useCallback(() => {
    if (areaPolygonEditing.polygonPoints.length < 3 || !areaPolygonEditing.hasChanges) {
      return;
    }
    areaPolygonEditing.handleDone();
  }, [areaPolygonEditing]);

  const renderAreaActionsMenu = useCallback(
    () => (
      <AreaActionsMenu
        areaId={id as Id<'areas'>}
        onCreateSat={isEditingPolygon ? undefined : handleStartSatDrawing}
        onRedrawArea={isEditingPolygon ? undefined : handleStartAreaDrawing}
      />
    ),
    [handleStartAreaDrawing, handleStartSatDrawing, id, isEditingPolygon]
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

  if (area === undefined || (area && (areaFeatures === undefined || areaSats === undefined))) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="small" color={APP_COLORS.primary} />
      </View>
    );
  }

  if (area === null) {
    return <AreaUnavailableState message="Området kan ha tagits bort från startsidan." />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: APP_COLORS.background }}>
      <View
        style={{ flex: 1 }}
        onStartShouldSetResponder={(event) =>
          isSatFreehandDrawing && (event.nativeEvent.touches?.length ?? 1) === 1
        }
        onMoveShouldSetResponder={(event) =>
          isSatFreehandDrawing && (event.nativeEvent.touches?.length ?? 1) === 1
        }
        onResponderGrant={isSatFreehandDrawing ? handleSatFreehandTouchStart : undefined}
        onResponderMove={isSatFreehandDrawing ? handleSatFreehandTouchMove : undefined}
        onResponderRelease={isSatFreehandDrawing ? handleSatFreehandTouchEnd : undefined}
        onResponderTerminate={isSatFreehandDrawing ? handleSatFreehandTouchEnd : undefined}
        onTouchStart={isEditingAreaPolygon ? areaPolygonEditing.handleTouchStart : undefined}
        onTouchMove={isEditingAreaPolygon ? areaPolygonEditing.handleTouchMove : undefined}
        onTouchEnd={isEditingAreaPolygon ? areaPolygonEditing.handleTouchEnd : undefined}
        onTouchCancel={isEditingAreaPolygon ? areaPolygonEditing.handleTouchEnd : undefined}
      >
        <MapView
          ref={mapRef}
          style={{ flex: 1 }}
          styleURL={mapStyleURL}
          scrollEnabled={!areaPolygonEditing.isDragging && !isSatFreehandDrawing}
          zoomEnabled={!areaPolygonEditing.isDragging}
          rotateEnabled={!areaPolygonEditing.isDragging}
          pitchEnabled={false}
          attributionEnabled={false}
          onCameraChanged={handleCameraChanged}
          onPress={isEditingPolygon && !isSatFreehandDrawing ? handlePressMapWhileDrawing : undefined}
          onLongPress={isEditingPolygon ? undefined : handleMapLongPress}
          scaleBarEnabled={false}
        >
          {cameraBounds && (
            <Camera ref={cameraRef} bounds={cameraBounds} animationDuration={0} />
          )}
          <LocationPuck puckBearingEnabled puckBearing="heading" />

          {polygonGeoJSON && (
            <ShapeSource id="area-polygon" shape={polygonGeoJSON}>
              <FillLayer
                id="area-fill"
                style={{ fillColor: APP_COLORS.mapAreaFill }}
              />
              <LineLayer
                id="area-line"
                style={{ lineColor: APP_COLORS.mapAreaLine, lineWidth: 2 }}
              />
            </ShapeSource>
          )}

          {areaSats && (
            <AreaSatLayers
              sats={areaSats}
              idPrefix="area-view-sats"
              interactive={!isEditingPolygon}
              onPressSat={(sat) => {
                push(`/area/${id}/sat?satId=${sat.id}`);
              }}
            />
          )}

          {satDrawingPoints ? (
            <PolygonDrawingLayers
              color={satDrawingColor}
              idPrefix="area-view-sat-drawing"
              lineDasharray={null}
              lineWidth={4}
              points={satDrawingPoints}
              showFill={false}
              showLineHalo
              showVertices={false}
            />
          ) : null}

          {satFreehandPreviewPoints.length > 1 ? (
            <PolygonDrawingLayers
              closeLine={false}
              color={satDrawingColor}
              idPrefix="area-view-sat-freehand-preview"
              lineDasharray={[1.4, 1.1]}
              lineWidth={3}
              points={satFreehandPreviewPoints}
              showFill={false}
              showVertices={false}
            />
          ) : null}

          {isEditingAreaPolygon ? (
            <PolygonDrawingLayers
              color={areaDrawingColor}
              draggingIndex={areaPolygonEditing.draggingVertex}
              idPrefix="area-view-area-drawing"
              points={areaPolygonEditing.polygonPoints.map(lngLatToLatLngPoint)}
              showMidpoints
            />
          ) : null}

          {visibleAreaFeatures && (
            <AreaFeatureLayers
              features={visibleAreaFeatures}
              idPrefix="area-view-features"
              interactive={!isEditingPolygon}
              hidePointCircles={!isEditingPolygon}
            />
          )}

          {visibleAreaFeatures && !isEditingPolygon && (
            <DraggableAreaPointMarkers
              features={visibleAreaFeatures}
              idPrefix="area-view-point-markers"
              onPressPointFeature={handlePressFeature}
              onDragStartPointFeature={handleStartDraggingFeature}
              onDragEndPointFeature={(feature, point) => {
                void handleDropFeature(feature, point);
              }}
            />
          )}
        </MapView>
      </View>

      <View pointerEvents="box-none" className="absolute bottom-0 left-0 right-0 top-0">
        <View
          className="absolute left-4 right-4"
          style={{ top: Math.max(insets.top, 8) + 8 }}>
          <GlassTopNav
            appearance="floating"
            title={area.name}
            onBack={() => back()}
            renderRightAccessory={renderAreaActionsMenu}
          />
        </View>

        <View
          className="absolute left-4"
          style={{ top: Math.max(insets.top, 8) + 60 }}>
          <NorthCompassButton heading={mapHeading} onPress={handleResetMapNorth} />
        </View>

        {mapScale ? (
          <MapScaleBar
            latitude={mapScale.latitude}
            zoom={mapScale.zoom}
            style={{ left: 16, top: Math.max(insets.top, 8) + 128 }}
          />
        ) : null}

        {isDrawingSat && satDrawingPoints ? (
          <PolygonDrawingControls
            bottomInset={Math.max(insets.bottom, 16) + 8}
            canContinue={satDrawingPoints.length >= 3}
            canUndo={satDrawingPoints.length > 0 || satFreehandPreviewPoints.length > 0}
            continueLabel="Fortsätt"
            onCancel={handleCancelSatDrawing}
            onContinue={handleContinueSatDrawing}
            onUndo={handleUndoSatPoint}
            pointCount={satDrawingPoints.length}
            statusText={
              satDrawingPoints.length >= 3
                ? `${satDrawingPoints.length} punkter`
                : satDrawingMode === 'freehand'
                  ? 'Rita med fingret.'
                  : 'Markera minst tre punkter.'
            }
            title="Ny såt"
          >
            <View className="flex-row gap-2">
              <Button
                size="sm"
                variant={satDrawingMode === 'freehand' ? 'default' : 'outline'}
                onPress={() => setSatDrawingMode('freehand')}
                className="flex-1 rounded-2xl">
                <Text>Rita</Text>
              </Button>
              <Button
                size="sm"
                variant={satDrawingMode === 'points' ? 'default' : 'outline'}
                onPress={() => setSatDrawingMode('points')}
                className="flex-1 rounded-2xl">
                <Text>Punkter</Text>
              </Button>
            </View>
          </PolygonDrawingControls>
        ) : isEditingAreaPolygon ? (
          <PolygonDrawingControls
            bottomInset={Math.max(insets.bottom, 16) + 8}
            canContinue={areaPolygonEditing.polygonPoints.length >= 3 && areaPolygonEditing.hasChanges}
            continueLabel="Spara"
            errorText={areaEditingError}
            isSubmitting={isUpdatingAreaPolygon}
            onCancel={handleCancelAreaDrawing}
            onContinue={() => {
              handleSaveAreaDrawing();
            }}
            onUndo={handleUndoAreaPoint}
            pointCount={areaPolygonEditing.polygonPoints.length}
            statusText={`${areaPolygonEditing.polygonPoints.length} punkter`}
            title="Rita om area"
          />
        ) : (
          <View
            className="absolute left-4"
            style={{ bottom: Math.max(insets.bottom, 16) + 8 }}>
            <GlassFloatingButton
              icon="locate"
              onPress={handleGoToMyPosition}
              accessibilityLabel="Gå till min position"
              surfaceClassName="size-12"
            />
          </View>
        )}
      </View>
    </View>
  );
}
