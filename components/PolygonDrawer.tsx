import { Button, Text } from '@/components/ui';
import { FastighetsindelningLayer } from '@/components/FastighetsindelningLayer';
import { GlassSurface } from '@/components/glass';
import { LantmaterietTopoLayer } from '@/components/LantmaterietTopoLayer';
import { useInitialPolygonCamera } from '@/hooks/use-initial-polygon-camera';
import { usePolygonEditing } from '@/hooks/use-polygon-editing';
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
import {
  getCachedMapStyle,
  getSavedMapStyle,
  subscribeToMapStyleChanges,
} from '@/lib/map-styles';
import { Ionicons } from '@expo/vector-icons';
import {
  Camera,
  CircleLayer,
  FillLayer,
  LineLayer,
  LocationPuck,
  MapView,
  ShapeSource,
} from '@rnmapbox/maps';
import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type { LngLat } from '@/lib/geo';

type AreaEditMode = 'draw' | 'select-fastighet';

function buildShapeGeoJSON(points: LngLat[]): GeoJSON.Feature {
  if (points.length >= 3) {
    return {
      type: 'Feature',
      properties: {},
      geometry: { type: 'Polygon', coordinates: [[...points, points[0]]] },
    };
  }
  return {
    type: 'Feature',
    properties: {},
    geometry: { type: 'LineString', coordinates: points },
  };
}

function buildVerticesGeoJSON(
  points: LngLat[],
  draggingIndex: number | null
): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: points.map((p, i) => ({
      type: 'Feature',
      properties: { index: i, dragging: i === draggingIndex },
      geometry: { type: 'Point', coordinates: p },
    })),
  };
}

function buildMidpointsGeoJSON(points: LngLat[]): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    features.push({
      type: 'Feature',
      properties: { insertAfter: i },
      geometry: {
        type: 'Point',
        coordinates: [
          (points[i][0] + points[i + 1][0]) / 2,
          (points[i][1] + points[i + 1][1]) / 2,
        ],
      },
    });
  }
  if (points.length >= 3) {
    const last = points[points.length - 1];
    const first = points[0];
    features.push({
      type: 'Feature',
      properties: { insertAfter: points.length - 1 },
      geometry: {
        type: 'Point',
        coordinates: [(last[0] + first[0]) / 2, (last[1] + first[1]) / 2],
      },
    });
  }
  return { type: 'FeatureCollection', features };
}

function SelectedInfoRow({ label, value }: { label: string; value?: string }) {
  if (!value) {
    return null;
  }

  return (
    <View className="flex-row items-center justify-between gap-3">
      <Text className="shrink-0 text-xs font-medium uppercase text-muted-foreground">
        {label}
      </Text>
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
  action: FastighetEditorAction,
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
  const [mapStyleURL, setMapStyleURL] = useState(() => getCachedMapStyle().styleURL);
  const [showTopoOverlay, setShowTopoOverlay] = useState(true);
  const [fastighetState, dispatchFastighet] = useReducer(
    fastighetEditorReducer,
    initialFastighetEditorState,
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
  const {
    draggingVertex,
    handleDone,
    handleMapPress,
    handleTouchEnd,
    handleTouchMove,
    handleTouchStart,
    handleUndo,
    hasChanges,
    isDragging,
    polygonPoints,
    replacePolygonPoints,
  } = usePolygonEditing({ initialPoints, mapRef, onComplete });

  const clearFastighetSelection = useCallback(() => {
    dispatchFastighet({ type: 'clear-selection' });
  }, []);

  const handleEnterDrawMode = useCallback(() => {
    dispatchFastighet({ type: 'enter-draw' });
  }, []);

  const handleEnterSelectMode = useCallback(() => {
    dispatchFastighet({ type: 'enter-select' });
  }, []);

  const handleSetFastighetsgrans = useCallback((nextValue: boolean) => {
    dispatchFastighet({ type: 'set-boundaries-visible', visible: nextValue });
  }, []);

  useEffect(() => {
    let cancelled = false;
    const unsubscribe = subscribeToMapStyleChanges((style) => {
      setMapStyleURL(style.styleURL);
    });

    void getSavedMapStyle().then((style) => {
      if (!cancelled) {
        setMapStyleURL((current) => (current === style.styleURL ? current : style.styleURL));
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  // --- Derived data ---

  const shapeGeoJSON = useMemo(
    () => (polygonPoints.length >= 2 ? buildShapeGeoJSON(polygonPoints) : null),
    [polygonPoints],
  );
  const verticesGeoJSON = useMemo(
    () => buildVerticesGeoJSON(polygonPoints, draggingVertex),
    [polygonPoints, draggingVertex],
  );
  const midpointsGeoJSON = useMemo(
    () => buildMidpointsGeoJSON(polygonPoints),
    [polygonPoints],
  );
  const selectedFastighetGeoJSON = useMemo(
    () => (selectedFastighetGeometry ? buildFastighetGeoJSON(selectedFastighetGeometry) : null),
    [selectedFastighetGeometry],
  );
  const selectedApplyState = useMemo(
    () =>
      selectedFastighetGeometry
        ? getPolygonApplyPoints(selectedFastighetGeometry)
        : { points: null, limitation: null },
    [selectedFastighetGeometry],
  );

  const handleSelectFastighet = useCallback(async (feature: GeoJSON.Feature) => {
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
        [FASTIGHETS_FILL_LAYER_ID],
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
  }, []);

  const handleMapPressForMode = useCallback(
    (feature: GeoJSON.Feature) => {
      if (mode === 'select-fastighet') {
        void handleSelectFastighet(feature);
        return;
      }
      handleMapPress(feature);
    },
    [handleMapPress, handleSelectFastighet, mode],
  );

  const handleApplySelectedFastighet = useCallback(() => {
    if (!selectedApplyState.points) {
      dispatchFastighet({
        type: 'selection-error',
        message: selectedApplyState.limitation ?? 'Fastighetsgränsen kan inte användas.',
      });
      return;
    }

    replacePolygonPoints(selectedApplyState.points);
    dispatchFastighet({ type: 'enter-draw' });
  }, [replacePolygonPoints, selectedApplyState]);

  const isDrawMode = mode === 'draw';
  const isSelectMode = mode === 'select-fastighet';
  const activeIconColor = '#FFFFFF';
  const inactiveIconColor = APP_COLORS.text;
  const overlayStackStyle = { zIndex: 20, elevation: 20 };

  return (
    <View style={{ flex: 1 }}>
      <View
        style={{ flex: 1 }}
        onTouchStart={isDrawMode ? handleTouchStart : undefined}
        onTouchMove={isDrawMode ? handleTouchMove : undefined}
        onTouchEnd={isDrawMode ? handleTouchEnd : undefined}
        onTouchCancel={isDrawMode ? handleTouchEnd : undefined}
      >
        <MapView
          ref={mapRef}
          style={{ flex: 1 }}
          styleURL={mapStyleURL}
          onPress={handleMapPressForMode}
          scrollEnabled={!isDragging}
          zoomEnabled={!isDragging}
          rotateEnabled={!isDragging}
          pitchEnabled={!isDragging}
        >
          {'bounds' in initialCamera ? (
            <Camera bounds={initialCamera.bounds} animationDuration={0} />
          ) : (
            <Camera
              zoomLevel={initialCamera.zoomLevel}
              centerCoordinate={initialCamera.centerCoordinate}
            />
          )}
          <LocationPuck puckBearingEnabled puckBearing="heading" />

          <LantmaterietTopoLayer
            idPrefix="polygon-drawer-lantmateriet-topo"
            visible={showTopoOverlay}
          />

          <FastighetsindelningLayer visible={showFastighetsgrans} />

          {selectedFastighetGeoJSON && (
            <ShapeSource id="selected-fastighet-shape" shape={selectedFastighetGeoJSON}>
              <FillLayer
                id="selected-fastighet-fill"
                style={{ fillColor: 'rgba(245, 158, 11, 0.24)' }}
                filter={['==', '$type', 'Polygon']}
              />
              <LineLayer
                id="selected-fastighet-line"
                style={{ lineColor: 'rgb(217, 119, 6)', lineWidth: 3 }}
              />
            </ShapeSource>
          )}

          {shapeGeoJSON && (
            <ShapeSource id="polygon-shape" shape={shapeGeoJSON}>
              <FillLayer
                id="polygon-fill"
                style={{ fillColor: 'rgba(34, 197, 94, 0.2)' }}
                filter={['==', '$type', 'Polygon']}
              />
              <LineLayer
                id="polygon-line"
                style={{ lineColor: 'rgb(34, 197, 94)', lineWidth: 2 }}
              />
            </ShapeSource>
          )}

          {/* Midpoints */}
          {!isDragging && polygonPoints.length >= 2 && (
            <ShapeSource
              id="midpoints"
              shape={midpointsGeoJSON}
              hitbox={{ width: 30, height: 30 }}
            >
              <CircleLayer
                id="midpoint-circles"
                style={{
                  circleRadius: 6,
                  circleColor: 'rgb(34, 197, 94)',
                  circleOpacity: 0.4,
                }}
              />
            </ShapeSource>
          )}

          {/* Vertices */}
          {polygonPoints.length > 0 && (
            <ShapeSource id="vertices" shape={verticesGeoJSON}>
              <CircleLayer
                id="vertex-dragging"
                filter={['==', ['get', 'dragging'], true]}
                style={{
                  circleRadius: 14,
                  circleColor: 'rgb(220, 252, 231)',
                  circleStrokeColor: 'rgb(22, 163, 74)',
                  circleStrokeWidth: 3,
                }}
              />
              <CircleLayer
                id="vertex-normal"
                filter={['==', ['get', 'dragging'], false]}
                style={{
                  circleRadius: 10,
                  circleColor: 'white',
                  circleStrokeColor: 'rgb(34, 197, 94)',
                  circleStrokeWidth: 2,
                }}
              />
            </ShapeSource>
          )}
        </MapView>
      </View>

      <View
        className="absolute left-4 right-4 z-10 gap-2"
        pointerEvents="box-none"
        style={[{ top: Math.max(insets.top, 12) + 8 }, overlayStackStyle]}
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
              <Button
                size="sm"
                variant={showTopoOverlay ? 'default' : 'outline'}
                className={
                  showTopoOverlay
                    ? 'shrink-0 rounded-full'
                    : 'shrink-0 rounded-full bg-background'
                }
                onPress={() => setShowTopoOverlay((visible) => !visible)}>
                <Ionicons
                  name={showTopoOverlay ? 'layers' : 'layers-outline'}
                  size={15}
                  color={showTopoOverlay ? activeIconColor : inactiveIconColor}
                />
                <Text>Topo</Text>
              </Button>

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

          <View className="flex-row gap-2">
            <Button
              size="sm"
              variant={isDrawMode ? 'default' : 'outline'}
              className={isDrawMode ? 'flex-1' : 'flex-1 bg-background'}
              onPress={handleEnterDrawMode}
            >
              <Ionicons
                name="pencil"
                size={15}
                color={isDrawMode ? activeIconColor : inactiveIconColor}
              />
              <Text>Rita</Text>
            </Button>

            {showFastighetsgrans ? (
              <Button
                size="sm"
                variant={isSelectMode ? 'default' : 'outline'}
                className={isSelectMode ? 'flex-1' : 'flex-1 bg-background'}
                onPress={handleEnterSelectMode}
              >
                <Ionicons
                  name="scan-outline"
                  size={15}
                  color={isSelectMode ? activeIconColor : inactiveIconColor}
                />
                <Text>Välj gräns</Text>
              </Button>
            ) : null}
          </View>
        </GlassSurface>
      </View>

      <View
        className="absolute left-4 right-4 gap-2"
        pointerEvents="box-none"
        style={[{ bottom: Math.max(insets.bottom, 8) + 8 }, overlayStackStyle]}
      >
        <GlassSurface
          className="rounded-xl"
          contentClassName="gap-3 p-3"
          overlayColor="rgba(252, 248, 242, 0.26)"
        >
          {isSelectMode ? (
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
          ) : (
            <View className="flex-row justify-center gap-3">
              <Button
                variant="outline"
                className="flex-1 bg-background"
                onPress={handleUndo}
                disabled={polygonPoints.length === 0}
              >
                <Text>Ångra</Text>
              </Button>
              <Button
                className="flex-1"
                onPress={handleDone}
                disabled={polygonPoints.length < 3 || !hasChanges}
              >
                <Text>spara</Text>
              </Button>
            </View>
          )}
        </GlassSurface>
      </View>

      {/* Drag hint */}
      {isDragging && (
        <View className="absolute left-4 right-4 top-16 items-center pointer-events-none">
          <View className="rounded-full bg-black/70 px-4 py-2">
            <Text className="text-sm text-white">Dra för att flytta punkt</Text>
          </View>
        </View>
      )}
    </View>
  );
}
