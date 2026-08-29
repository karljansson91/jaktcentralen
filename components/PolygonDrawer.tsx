import { Button, Text } from '@/components/ui';
import { FastighetsindelningLayer } from '@/components/FastighetsindelningLayer';
import {
  PolygonDrawingControls,
  PolygonModeControls,
} from '@/components/area/polygon-drawing-controls';
import { PolygonDrawingLayers } from '@/components/area/polygon-drawing-layers';
import { PolygonEditorSurface } from '@/components/area/polygon-editor-surface';
import { GlassSurface } from '@/components/glass';
import { LantmaterietHillshadeLayer } from '@/components/LantmaterietHillshadeLayer';
import { LantmaterietTopoLayer } from '@/components/LantmaterietTopoLayer';
import { useInitialPolygonCamera } from '@/hooks/use-initial-polygon-camera';
import { useMapStyleState } from '@/hooks/use-map-style-url';
import { usePolygonEditor, type PolygonEditorMode } from '@/hooks/use-polygon-editor';
import type { LngLat } from '@/lib/geo';
import { APP_COLORS } from '@/lib/theme';
import {
  FASTIGHETS_FILL_LAYER_ID,
  buildFastighetGeoJSON,
  findFastighetFeature,
  getFastighetGeometry,
  getMapPressLngLat,
  getPolygonApplyPoints,
  readSelectedFastighet,
  type FastighetGeometry,
  type SelectedFastighet,
} from '@/lib/fastighetsindelning';
import { Ionicons } from '@expo/vector-icons';
import {
  Camera,
  FillLayer,
  LineLayer,
  LocationPuck,
  MapView,
  ShapeSource,
} from '@rnmapbox/maps';
import React, { useReducer, useRef } from 'react';
import { ActivityIndicator, Pressable, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type { LngLat } from '@/lib/geo';

type AreaEditMode = 'draw' | 'select-fastighet';

function SelectedInfoRow({ label, value }: { label: string; value?: string }) {
  if (!value) {
    return null;
  }

  return (
    <View className="flex-row items-center justify-between gap-3">
      <Text className="shrink-0 text-xs font-medium uppercase text-muted-foreground">{label}</Text>
      <Text selectable className="min-w-0 flex-1 text-right text-sm font-medium">
        {value}
      </Text>
    </View>
  );
}

type FastighetEditorState = {
  mode: AreaEditMode;
  showFastighetsgrans: boolean;
  selectedFastighet: SelectedFastighet | null;
  selectedFastighetGeometry: FastighetGeometry | null;
  selectionLoading: boolean;
  selectionError: string | null;
};

type FastighetEditorAction =
  | { type: 'enter-draw' }
  | { type: 'enter-select' }
  | { type: 'set-boundaries-visible'; visible: boolean }
  | { type: 'clear-selection' }
  | { type: 'selection-start' }
  | { type: 'selection-success'; fastighet: SelectedFastighet; geometry: FastighetGeometry }
  | { type: 'selection-error'; message: string };

const OVERLAY_STACK_STYLE = { zIndex: 20, elevation: 20 };

const initialFastighetEditorState: FastighetEditorState = {
  mode: 'draw',
  showFastighetsgrans: false,
  selectedFastighet: null,
  selectedFastighetGeometry: null,
  selectionLoading: false,
  selectionError: null,
};

function clearSelectionState(state: FastighetEditorState): FastighetEditorState {
  return {
    ...state,
    selectedFastighet: null,
    selectedFastighetGeometry: null,
    selectionLoading: false,
    selectionError: null,
  };
}

function fastighetEditorReducer(
  state: FastighetEditorState,
  action: FastighetEditorAction
): FastighetEditorState {
  switch (action.type) {
    case 'enter-draw':
      return { ...clearSelectionState(state), mode: 'draw' };
    case 'enter-select':
      return {
        ...state,
        mode: 'select-fastighet',
        showFastighetsgrans: true,
        selectionError: null,
      };
    case 'set-boundaries-visible':
      if (!action.visible && state.mode === 'select-fastighet') {
        return {
          ...clearSelectionState(state),
          mode: 'draw',
          showFastighetsgrans: false,
        };
      }
      return { ...state, showFastighetsgrans: action.visible };
    case 'clear-selection':
      return clearSelectionState(state);
    case 'selection-start':
      return { ...state, selectionLoading: true, selectionError: null };
    case 'selection-success':
      return {
        ...state,
        selectedFastighet: action.fastighet,
        selectedFastighetGeometry: action.geometry,
        selectionLoading: false,
        selectionError: null,
      };
    case 'selection-error':
      return {
        ...state,
        selectedFastighet: null,
        selectedFastighetGeometry: null,
        selectionLoading: false,
        selectionError: action.message,
      };
  }
}

interface PolygonDrawerProps {
  initialPoints?: LngLat[];
  onComplete: (points: LngLat[]) => void;
  onCancel: () => void;
}

export function PolygonDrawer({ initialPoints, onComplete, onCancel }: PolygonDrawerProps) {
  const mapRef = useRef<MapView | null>(null);
  const insets = useSafeAreaInsets();
  const { hillshadeVisible, mapStyleKey, mapStyleURL, topoSurfaceMode } = useMapStyleState();
  const [fastighetState, dispatchFastighet] = useReducer(
    fastighetEditorReducer,
    initialFastighetEditorState
  );
  const {
    mode,
    selectedFastighet,
    selectedFastighetGeometry,
    selectionError,
    selectionLoading,
    showFastighetsgrans,
  } = fastighetState;
  const initialCamera = useInitialPolygonCamera(initialPoints);
  const polygonEditor = usePolygonEditor({
    initialMode: 'freehand',
    initialPoints,
    mapRef,
    onComplete,
  });

  const clearFastighetSelection = () => {
    dispatchFastighet({ type: 'clear-selection' });
  };

  const handleEnterDrawMode = () => {
    dispatchFastighet({ type: 'enter-draw' });
  };

  const handlePolygonModeChange = (nextMode: PolygonEditorMode) => {
    polygonEditor.setMode(nextMode);
    handleEnterDrawMode();
  };

  const handleEnterSelectMode = () => {
    dispatchFastighet({ type: 'enter-select' });
  };

  const handleSetFastighetsgrans = (nextValue: boolean) => {
    dispatchFastighet({ type: 'set-boundaries-visible', visible: nextValue });
  };

  // --- Derived data ---

  const selectedFastighetGeoJSON = selectedFastighetGeometry
    ? buildFastighetGeoJSON(selectedFastighetGeometry)
    : null;
  const selectedApplyState = selectedFastighetGeometry
    ? getPolygonApplyPoints(selectedFastighetGeometry)
    : { points: null, limitation: null };

  const handleSelectFastighet = async (feature: GeoJSON.Feature) => {
    const map = mapRef.current;
    const coordinate = getMapPressLngLat(feature);
    if (!map || !coordinate) {
      dispatchFastighet({
        type: 'selection-error',
        message: 'Kunde inte läsa kartpositionen.',
      });
      return;
    }

    dispatchFastighet({ type: 'selection-start' });

    try {
      const screenPoint = await map.getPointInView(coordinate);
      const result = await map.queryRenderedFeaturesAtPoint(
        screenPoint,
        [],
        [FASTIGHETS_FILL_LAYER_ID]
      );
      const fastighetFeature = findFastighetFeature(result?.features ?? []);
      if (!fastighetFeature) {
        dispatchFastighet({
          type: 'selection-error',
          message: 'Ingen fastighetsgräns hittades här.',
        });
        return;
      }

      const geometry = getFastighetGeometry(fastighetFeature);
      if (!geometry) {
        dispatchFastighet({
          type: 'selection-error',
          message: 'Den valda kartträffen saknar polygongeometri.',
        });
        return;
      }

      dispatchFastighet({
        type: 'selection-success',
        fastighet: readSelectedFastighet(fastighetFeature),
        geometry,
      });
    } catch {
      dispatchFastighet({
        type: 'selection-error',
        message: 'Kunde inte läsa fastighetsgränsen från kartan.',
      });
    }
  };

  const handleMapPressForMode = (feature: GeoJSON.Feature) => {
    if (mode === 'select-fastighet') {
      void handleSelectFastighet(feature);
      return;
    }
    polygonEditor.handleMapPress(feature);
  };

  const handleApplySelectedFastighet = () => {
    if (!selectedApplyState.points) {
      dispatchFastighet({
        type: 'selection-error',
        message: selectedApplyState.limitation ?? 'Fastighetsgränsen kan inte användas.',
      });
      return;
    }

    polygonEditor.replacePolygonPoints(selectedApplyState.points);
    dispatchFastighet({ type: 'enter-draw' });
  };

  const isDrawMode = mode === 'draw';
  const isSelectMode = mode === 'select-fastighet';

  if (!initialCamera) {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-background">
        <ActivityIndicator color={APP_COLORS.primary} />
        <Text className="text-sm text-muted-foreground">Hämtar position…</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Stäng"
          hitSlop={10}
          onPress={onCancel}
          className="absolute right-4 size-10 items-center justify-center rounded-full"
          style={{ top: Math.max(insets.top, 12) + 8 }}
        >
          <Ionicons name="close" size={23} color={APP_COLORS.text} />
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <PolygonEditorSurface editor={isDrawMode ? polygonEditor : null}>
        <MapView
          key={mapStyleKey}
          ref={mapRef}
          style={{ flex: 1 }}
          styleURL={mapStyleURL}
          onPress={handleMapPressForMode}
          scrollEnabled={isSelectMode || polygonEditor.mapGestures.scrollEnabled}
          zoomEnabled={isSelectMode || polygonEditor.mapGestures.zoomEnabled}
          rotateEnabled={isSelectMode || polygonEditor.mapGestures.rotateEnabled}
          pitchEnabled={isSelectMode || polygonEditor.mapGestures.pitchEnabled}
        >
          {'bounds' in initialCamera ? (
            <Camera
              bounds={initialCamera.bounds}
              animationDuration={0}
              defaultSettings={{ bounds: initialCamera.bounds, animationDuration: 0 }}
            />
          ) : (
            <Camera
              zoomLevel={initialCamera.zoomLevel}
              centerCoordinate={initialCamera.centerCoordinate}
              animationDuration={0}
              defaultSettings={{
                zoomLevel: initialCamera.zoomLevel,
                centerCoordinate: initialCamera.centerCoordinate,
                animationDuration: 0,
              }}
            />
          )}
          <LocationPuck puckBearingEnabled puckBearing="heading" />

          <LantmaterietTopoLayer
            idPrefix="polygon-drawer-lantmateriet-topo"
            surfaceMode={topoSurfaceMode}
          />
          <LantmaterietHillshadeLayer
            belowLayerID="polygon-drawer-lantmateriet-topo-wetland-outline"
            visible={hillshadeVisible}
          />

          <FastighetsindelningLayer visible={showFastighetsgrans} />

          {selectedFastighetGeoJSON && (
            <ShapeSource id="selected-fastighet-shape" shape={selectedFastighetGeoJSON}>
              <FillLayer
                id="selected-fastighet-fill"
                style={{ fillColor: 'rgba(245, 158, 11, 0.18)' }}
                filter={['==', '$type', 'Polygon']}
              />
              <LineLayer
                id="selected-fastighet-line"
                style={{ lineColor: 'rgba(217, 119, 6, 0.72)', lineWidth: 1.6 }}
              />
            </ShapeSource>
          )}

          <PolygonDrawingLayers
            color={APP_COLORS.primary}
            draggingIndex={polygonEditor.draggingVertex}
            idPrefix="area-create-polygon"
            points={polygonEditor.polygonPoints}
            previewPoints={polygonEditor.freehandPreviewPoints}
            showEditingHandles={isDrawMode && polygonEditor.mode === 'points'}
          />
        </MapView>
      </PolygonEditorSurface>

      <View
        className="absolute left-4 right-4 z-10 gap-2"
        pointerEvents="box-none"
        style={[{ top: Math.max(insets.top, 12) + 8 }, OVERLAY_STACK_STYLE]}
      >
        <GlassSurface
          className="rounded-xl"
          contentClassName="gap-3 p-3"
          overlayColor="rgba(252, 248, 242, 0.28)"
        >
          <View className="gap-1">
            <View className="flex-row items-center justify-between gap-3">
              <Text
                className="min-w-0 flex-1 text-base font-semibold"
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.72}
              >
                {isSelectMode ? 'Välj gräns' : 'Rita område'}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Stäng"
                hitSlop={10}
                onPress={onCancel}
                className="size-10 items-center justify-center rounded-full"
              >
                <Ionicons name="close" size={23} color={APP_COLORS.text} />
              </Pressable>
            </View>

            <View className="flex-row items-center justify-between gap-3">
              <View className="min-w-0 flex-1 flex-row items-center gap-2">
                <Ionicons
                  name="map-outline"
                  size={18}
                  color={showFastighetsgrans ? APP_COLORS.primary : APP_COLORS.textMuted}
                />
                <Text className="font-medium">Gränser</Text>
              </View>
              <Switch
                value={showFastighetsgrans}
                onValueChange={handleSetFastighetsgrans}
                trackColor={{
                  false: 'rgba(99, 102, 121, 0.26)',
                  true: APP_COLORS.primary,
                }}
                thumbColor="#FFFFFF"
                ios_backgroundColor="rgba(99, 102, 121, 0.26)"
              />
            </View>
          </View>

          {showFastighetsgrans ? (
            <Button
              size="sm"
              variant={isSelectMode ? 'default' : 'outline'}
              className={isSelectMode ? '' : 'bg-background'}
              onPress={isSelectMode ? handleEnterDrawMode : handleEnterSelectMode}
            >
              <Ionicons
                name={isSelectMode ? 'pencil-outline' : 'scan-outline'}
                size={15}
                color={isSelectMode ? APP_COLORS.surface : APP_COLORS.text}
              />
              <Text>{isSelectMode ? 'Till ritning' : 'Välj gräns'}</Text>
            </Button>
          ) : null}
        </GlassSurface>
      </View>

      {isSelectMode ? (
        <View
          className="absolute left-4 right-4 gap-2"
          pointerEvents="box-none"
          style={[{ bottom: Math.max(insets.bottom, 8) + 8 }, OVERLAY_STACK_STYLE]}
        >
          <GlassSurface
            className="rounded-xl"
            contentClassName="gap-3 p-3"
            overlayColor="rgba(252, 248, 242, 0.26)"
          >
            <>
              <View className="gap-2">
                <View className="flex-row items-center gap-2">
                  {selectionLoading ? (
                    <ActivityIndicator size="small" color={APP_COLORS.primary} />
                  ) : (
                    <Ionicons name="scan-outline" size={18} color={APP_COLORS.primary} />
                  )}
                  <Text className="font-semibold">
                    {selectedFastighet ? 'Fastighetsgräns vald' : 'Ingen gräns vald'}
                  </Text>
                </View>

                {selectedFastighet ? (
                  <View className="gap-1">
                    <SelectedInfoRow label="Beteckning" value={selectedFastighet.etikett} />
                    <SelectedInfoRow label="Kommun" value={selectedFastighet.kommunnamn} />
                    <SelectedInfoRow label="Trakt" value={selectedFastighet.trakt} />
                  </View>
                ) : null}

                {selectionError ? (
                  <Text selectable className="text-sm text-destructive">
                    {selectionError}
                  </Text>
                ) : null}

                {!selectionError && selectedApplyState.limitation ? (
                  <Text selectable className="text-sm text-muted-foreground">
                    {selectedApplyState.limitation}
                  </Text>
                ) : null}
              </View>

              {selectedFastighet ? (
                <View className="flex-row gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 bg-background"
                    onPress={clearFastighetSelection}
                  >
                    <Text>Avbryt val</Text>
                  </Button>
                  <Button
                    className="flex-1"
                    onPress={handleApplySelectedFastighet}
                    disabled={!selectedApplyState.points}
                  >
                    <Text>Använd gräns</Text>
                  </Button>
                </View>
              ) : null}
            </>
          </GlassSurface>
        </View>
      ) : (
        <PolygonDrawingControls
          bottomInset={Math.max(insets.bottom, 8) + 8}
          canContinue={polygonEditor.isReady && polygonEditor.hasChanges}
          canUndo={polygonEditor.canUndo}
          onCancel={onCancel}
          onContinue={polygonEditor.handleDone}
          onUndo={polygonEditor.handleUndo}
          pointCount={polygonEditor.pointCount}
          statusText={polygonEditor.statusText}
          title="Rita område"
        >
          <PolygonModeControls
            mode={polygonEditor.mode}
            onModeChange={handlePolygonModeChange}
          />
        </PolygonDrawingControls>
      )}

      {/* Drag hint */}
      {polygonEditor.isDragging && (
        <View className="absolute left-4 right-4 top-16 items-center pointer-events-none">
          <View className="rounded-full bg-black/70 px-4 py-2">
            <Text className="text-sm text-white">Dra för att flytta punkt</Text>
          </View>
        </View>
      )}
    </View>
  );
}
