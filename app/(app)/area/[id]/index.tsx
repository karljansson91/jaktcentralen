import { AreaFeatureLayers } from '@/components/AreaFeatureLayers';
import { AreaSatLayers } from '@/components/AreaSatLayers';
import { AreaActionsMenu } from '@/components/area/area-actions-menu';
import { AreaUnavailableState } from '@/components/area/area-unavailable-state';
import { MarkerPlacementOverlay } from '@/components/area/marker-placement-overlay';
import {
  PolygonDrawingControls,
  PolygonModeControls,
} from '@/components/area/polygon-drawing-controls';
import { PolygonDrawingLayers } from '@/components/area/polygon-drawing-layers';
import { PolygonEditorSurface } from '@/components/area/polygon-editor-surface';
import { DraggableAreaPointMarkers } from '@/components/DraggableAreaPointMarkers';
import { GlassFloatingButton, GlassTopNav } from '@/components/glass';
import { LantmaterietHillshadeLayer } from '@/components/LantmaterietHillshadeLayer';
import { LantmaterietTopoLayer } from '@/components/LantmaterietTopoLayer';
import { MapScaleBar } from '@/components/map/map-scale-bar';
import { NorthCompassButton } from '@/components/map/north-compass-button';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { areaFeaturePointToLngLat, getAreaFeatureTargetKey } from '@/lib/area-features';
import { buildAreaPolygonFeature, getAreaCameraBounds } from '@/lib/area-map';
import { useAreaMarkerGestures } from '@/hooks/use-area-marker-gestures';
import { useMapCameraState } from '@/hooks/use-map-camera-state';
import { useMapStyleState } from '@/hooks/use-map-style-url';
import { usePolygonEditor } from '@/hooks/use-polygon-editor';
import { getDefaultAreaSatColor } from '@/lib/area-sats';
import { saveAreaSatDraft } from '@/lib/area-sat-draft-store';
import { isPointInPolygon, type LatLngPoint, type LngLat } from '@/lib/geo';
import { getCurrentUserCoordinate } from '@/lib/location';
import { APP_COLORS } from '@/lib/theme';
import { Camera, FillLayer, LineLayer, LocationPuck, MapView, ShapeSource } from '@rnmapbox/maps';
import { useMutation, useQuery } from 'convex/react';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { type ElementRef, useRef, useState } from 'react';
import { ActivityIndicator, Alert, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  const { hillshadeVisible, mapStyleKey, mapStyleURL, topoSurfaceMode } = useMapStyleState();
  const [isDrawingSat, setIsDrawingSat] = useState(false);
  const [isEditingAreaPolygon, setIsEditingAreaPolygon] = useState(false);
  const [areaEditingError, setAreaEditingError] = useState<string | null>(null);
  const [isUpdatingAreaPolygon, setIsUpdatingAreaPolygon] = useState(false);
  const updateArea = useMutation(api.areas.update);
  const area = useQuery(api.areas.get, { areaId: id as Id<'areas'> });
  const areaFeatures = useQuery(
    api.areaFeatures.listByArea,
    area ? { areaId: id as Id<'areas'> } : 'skip'
  );
  const areaSats = useQuery(api.areaSats.listByArea, area ? { areaId: id as Id<'areas'> } : 'skip');
  const {
    cancelMarkerPlacement,
    confirmMarkerPlacement,
    draggedPointOverrides,
    handleDropFeature,
    handleMapLongPress,
    handlePressFeature,
    handleStartDraggingFeature,
    isConfirmingMarkerPlacement,
    isPlacingMarker,
    resetMarkerGestureLocks,
    startMarkerPlacement,
  } = useAreaMarkerGestures(id as Id<'areas'>, { cameraRef, mapRef });

  useFocusEffect(() => {
    resetMarkerGestureLocks();
  });

  const polygonGeoJSON = (() => {
    if (!area) return null;
    return buildAreaPolygonFeature(area);
  })();

  const cameraBounds = (() => {
    if (!area) return null;
    return getAreaCameraBounds(area, {
      top: Math.max(insets.top + 92, 112),
      bottom: Math.max(insets.bottom + 96, 120),
      left: 40,
      right: 40,
    });
  })();

  const visibleAreaFeatures = (() => {
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
  })();

  const areaEditInitialPoints = area?.polygon.map(areaFeaturePointToLngLat) ?? [];

  const handleCompleteAreaEditing = (points: LngLat[]) => {
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
        setAreaEditingError(error instanceof Error ? error.message : 'Kunde inte spara området.');
      })
      .finally(() => {
        setIsUpdatingAreaPolygon(false);
      });
  };

  const areaPolygonEditor = usePolygonEditor({
    initialMode: 'points',
    initialPoints: areaEditInitialPoints,
    mapRef,
    onComplete: handleCompleteAreaEditing,
  });

  const satDrawingColor = getDefaultAreaSatColor(areaSats?.length ?? 0);
  const areaDrawingColor = APP_COLORS.primary;

  const handleCompleteSatDrawing = (points: LngLat[]) => {
    if (!area || !points.every((point) => isPointInPolygon(lngLatToLatLngPoint(point), area.polygon))) {
      return;
    }

    const draftId = saveAreaSatDraft({
      areaId: id as Id<'areas'>,
      color: satDrawingColor,
      name: '',
      polygon: points.map(lngLatToLatLngPoint),
    });
    setIsDrawingSat(false);
    push(`/area/${id}/sat?draftId=${draftId}`);
  };

  const satPolygonEditor = usePolygonEditor({
    initialMode: 'freehand',
    mapRef,
    onComplete: handleCompleteSatDrawing,
  });

  const isEditingPolygon = isDrawingSat || isEditingAreaPolygon;
  const activePolygonEditor = isDrawingSat
    ? satPolygonEditor
    : isEditingAreaPolygon
      ? areaPolygonEditor
      : null;
  const isSatPolygonInsideArea = Boolean(
    area &&
      satPolygonEditor.isReady &&
      satPolygonEditor.polygonPoints.every((point) =>
        isPointInPolygon(lngLatToLatLngPoint(point), area.polygon)
      )
  );

  const handleStartSatDrawing = () => {
    setIsEditingAreaPolygon(false);
    setAreaEditingError(null);
    areaPolygonEditor.resetPolygonPoints(areaEditInitialPoints);
    satPolygonEditor.setMode('freehand');
    satPolygonEditor.resetPolygonPoints([]);
    setIsDrawingSat(true);
  };

  const handleCancelSatDrawing = () => {
    satPolygonEditor.resetPolygonPoints([]);
    setIsDrawingSat(false);
  };

  const handleStartAreaDrawing = () => {
    if (!area) {
      return;
    }
    satPolygonEditor.resetPolygonPoints([]);
    setIsDrawingSat(false);
    setAreaEditingError(null);
    areaPolygonEditor.setMode('points');
    areaPolygonEditor.resetPolygonPoints(area.polygon.map(areaFeaturePointToLngLat));
    setIsEditingAreaPolygon(true);
  };

  const handleCancelAreaDrawing = () => {
    setIsEditingAreaPolygon(false);
    setAreaEditingError(null);
    if (area) {
      areaPolygonEditor.resetPolygonPoints(area.polygon.map(areaFeaturePointToLngLat));
    }
  };

  const handleUndoAreaPoint = () => {
    setAreaEditingError(null);
    areaPolygonEditor.handleUndo();
  };

  const handlePressMapWhileDrawing = (feature: GeoJSON.Feature) => {
    if (isEditingAreaPolygon) {
      setAreaEditingError(null);
      areaPolygonEditor.handleMapPress(feature);
      return;
    }

    if (isDrawingSat) {
      satPolygonEditor.handleMapPress(feature);
    }
  };

  const handleSaveAreaDrawing = () => {
    if (!areaPolygonEditor.isReady || !areaPolygonEditor.hasChanges) {
      return;
    }
    areaPolygonEditor.handleDone();
  };

  const renderAreaActionsMenu = () => {
    if (isPlacingMarker) {
      return null;
    }

    return (
      <AreaActionsMenu
        areaId={id as Id<'areas'>}
        onCreateMarker={isEditingPolygon ? undefined : startMarkerPlacement}
        onCreateSat={isEditingPolygon ? undefined : handleStartSatDrawing}
        onRedrawArea={isEditingPolygon ? undefined : handleStartAreaDrawing}
      />
    );
  };

  const handleGoToMyPosition = async () => {
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
  };

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
      <PolygonEditorSurface editor={activePolygonEditor}>
        <MapView
          key={mapStyleKey}
          ref={mapRef}
          style={{ flex: 1 }}
          styleURL={mapStyleURL}
          scrollEnabled={activePolygonEditor?.mapGestures.scrollEnabled ?? true}
          zoomEnabled={activePolygonEditor?.mapGestures.zoomEnabled ?? true}
          rotateEnabled={activePolygonEditor?.mapGestures.rotateEnabled ?? true}
          pitchEnabled={false}
          attributionEnabled={false}
          onCameraChanged={handleCameraChanged}
          onPress={isEditingPolygon ? handlePressMapWhileDrawing : undefined}
          onLongPress={isEditingPolygon || isPlacingMarker ? undefined : handleMapLongPress}
          scaleBarEnabled={false}
        >
          {cameraBounds && <Camera ref={cameraRef} bounds={cameraBounds} animationDuration={0} />}
          <LocationPuck puckBearingEnabled puckBearing="heading" />

          <LantmaterietTopoLayer
            idPrefix="area-view-lantmateriet-topo"
            surfaceMode={topoSurfaceMode}
          />
          <LantmaterietHillshadeLayer
            belowLayerID="area-view-lantmateriet-topo-wetland-outline"
            visible={hillshadeVisible}
          />

          {polygonGeoJSON && (
            <ShapeSource id="area-polygon" shape={polygonGeoJSON}>
              <FillLayer id="area-fill" style={{ fillColor: APP_COLORS.mapAreaFill }} />
              <LineLayer
                id="area-line-halo"
                style={{ lineColor: APP_COLORS.mapAreaHalo, lineWidth: 1.8 }}
              />
              <LineLayer
                id="area-line"
                style={{ lineColor: APP_COLORS.mapAreaLine, lineWidth: 0.95 }}
              />
            </ShapeSource>
          )}

          {areaSats && (
            <AreaSatLayers
              sats={areaSats}
              idPrefix="area-view-sats"
              interactive={!isEditingPolygon && !isPlacingMarker}
              onPressSat={(sat) => {
                push(`/area/${id}/sat?satId=${sat.id}`);
              }}
            />
          )}

          {isDrawingSat ? (
            <PolygonDrawingLayers
              color={satDrawingColor}
              draggingIndex={satPolygonEditor.draggingVertex}
              idPrefix="area-view-sat-drawing"
              points={satPolygonEditor.polygonPoints}
              previewPoints={satPolygonEditor.freehandPreviewPoints}
              showEditingHandles={satPolygonEditor.mode === 'points'}
            />
          ) : null}

          {isEditingAreaPolygon ? (
            <PolygonDrawingLayers
              color={areaDrawingColor}
              draggingIndex={areaPolygonEditor.draggingVertex}
              idPrefix="area-view-area-drawing"
              points={areaPolygonEditor.polygonPoints}
              previewPoints={areaPolygonEditor.freehandPreviewPoints}
              showEditingHandles={areaPolygonEditor.mode === 'points'}
            />
          ) : null}

          {visibleAreaFeatures && (
            <AreaFeatureLayers
              features={visibleAreaFeatures}
              idPrefix="area-view-features"
              interactive={!isEditingPolygon && !isPlacingMarker}
              hidePointCircles={!isEditingPolygon && !isPlacingMarker}
            />
          )}

          {visibleAreaFeatures && !isEditingPolygon && !isPlacingMarker && (
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
      </PolygonEditorSurface>

      <View pointerEvents="box-none" className="absolute bottom-0 left-0 right-0 top-0">
        <View className="absolute left-4 right-4" style={{ top: Math.max(insets.top, 8) + 8 }}>
          <GlassTopNav
            appearance="floating"
            title={area.name}
            onBack={isPlacingMarker ? cancelMarkerPlacement : () => back()}
            renderRightAccessory={renderAreaActionsMenu}
          />
        </View>

        <View className="absolute left-4" style={{ top: Math.max(insets.top, 8) + 60 }}>
          <NorthCompassButton heading={mapHeading} onPress={handleResetMapNorth} />
        </View>

        {mapScale ? (
          <MapScaleBar
            latitude={mapScale.latitude}
            zoom={mapScale.zoom}
            style={{ left: 16, top: Math.max(insets.top, 8) + 128 }}
          />
        ) : null}

        {isDrawingSat ? (
          <PolygonDrawingControls
            bottomInset={Math.max(insets.bottom, 16) + 8}
            canContinue={satPolygonEditor.isReady && isSatPolygonInsideArea}
            canUndo={satPolygonEditor.canUndo}
            continueLabel="Fortsätt"
            errorText={
              satPolygonEditor.isReady && !isSatPolygonInsideArea
                ? 'Såten måste ligga inom jaktmarken.'
                : null
            }
            onCancel={handleCancelSatDrawing}
            onContinue={satPolygonEditor.handleDone}
            onUndo={satPolygonEditor.handleUndo}
            pointCount={satPolygonEditor.pointCount}
            statusText={satPolygonEditor.statusText}
            title="Ny såt"
          >
            <PolygonModeControls
              mode={satPolygonEditor.mode}
              onModeChange={satPolygonEditor.setMode}
            />
          </PolygonDrawingControls>
        ) : isEditingAreaPolygon ? (
          <PolygonDrawingControls
            bottomInset={Math.max(insets.bottom, 16) + 8}
            canContinue={areaPolygonEditor.isReady && areaPolygonEditor.hasChanges}
            canUndo={areaPolygonEditor.canUndo}
            continueLabel="Spara"
            errorText={areaEditingError}
            isSubmitting={isUpdatingAreaPolygon}
            onCancel={handleCancelAreaDrawing}
            onContinue={() => {
              handleSaveAreaDrawing();
            }}
            onUndo={handleUndoAreaPoint}
            pointCount={areaPolygonEditor.pointCount}
            statusText={areaPolygonEditor.statusText}
            title="Rita om area"
          />
        ) : isPlacingMarker ? (
          <MarkerPlacementOverlay
            bottomInset={Math.max(insets.bottom, 16) + 8}
            isConfirming={isConfirmingMarkerPlacement}
            onCancel={cancelMarkerPlacement}
            onConfirm={() => {
              void confirmMarkerPlacement();
            }}
          />
        ) : (
          <View className="absolute left-4" style={{ bottom: Math.max(insets.bottom, 16) + 8 }}>
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
