import { Text } from '@/components/ui';
import {
  FastighetsindelningLayer,
  SelectedFastighetLayer,
} from '@/components/FastighetsindelningLayer';
import { FastighetSelectionDetails } from '@/components/area/fastighet-selection-details';
import {
  AreaPolygonMethodControls,
  PolygonDrawingControls,
} from '@/components/area/polygon-drawing-controls';
import { PolygonDrawingLayers } from '@/components/area/polygon-drawing-layers';
import { PolygonEditorSurface } from '@/components/area/polygon-editor-surface';
import { GlassIconButton } from '@/components/glass';
import { LantmaterietHillshadeLayer } from '@/components/LantmaterietHillshadeLayer';
import { LantmaterietTopoLayer } from '@/components/LantmaterietTopoLayer';
import { useAreaPolygonEditor } from '@/hooks/use-area-polygon-editor';
import { useMapStylePicker } from '@/hooks/use-map-style-picker';
import { useMapStyleState } from '@/hooks/use-map-style-url';
import type { LngLat } from '@/lib/geo';
import { getInitialPolygonCamera } from '@/lib/initial-polygon-camera';
import { APP_COLORS } from '@/lib/theme';
import { Camera, LocationPuck, MapView } from '@rnmapbox/maps';
import React, { useRef } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type { LngLat } from '@/lib/geo';

const OVERLAY_STACK_STYLE = { zIndex: 20, elevation: 20 };

interface PolygonDrawerProps {
  initialPoints?: LngLat[];
  onComplete: (points: LngLat[]) => void;
  onCancel: () => void;
}

export function PolygonDrawer({ initialPoints, onComplete, onCancel }: PolygonDrawerProps) {
  const mapRef = useRef<MapView | null>(null);
  const insets = useSafeAreaInsets();
  const { hillshadeVisible, mapStyleKey, mapStyleURL, topoSurfaceMode } = useMapStyleState();
  const handleSelectMapStyle = useMapStylePicker();
  const initialCamera = getInitialPolygonCamera(initialPoints);
  const areaEditor = useAreaPolygonEditor({
    initialMode: 'freehand',
    initialPoints,
    mapRef,
    onComplete,
  });

  return (
    <View style={{ flex: 1 }}>
      <PolygonEditorSurface editor={areaEditor.surfaceEditor}>
        <MapView
          key={mapStyleKey}
          ref={mapRef}
          style={{ flex: 1 }}
          styleURL={mapStyleURL}
          onPress={areaEditor.handleMapPress}
          gestureSettings={areaEditor.mapGestures.gestureSettings}
          scrollEnabled={areaEditor.mapGestures.scrollEnabled}
          zoomEnabled={areaEditor.mapGestures.zoomEnabled}
          rotateEnabled={areaEditor.mapGestures.rotateEnabled}
          pitchEnabled={areaEditor.mapGestures.pitchEnabled}
        >
          {'bounds' in initialCamera ? (
            <Camera
              bounds={initialCamera.bounds}
              animationDuration={0}
              defaultSettings={{
                bounds: initialCamera.bounds,
                animationDuration: 0,
              }}
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

          <FastighetsindelningLayer visible={areaEditor.isSelectingBoundary} />
          <SelectedFastighetLayer
            geometry={areaEditor.boundaryGeometry}
            idPrefix="area-create-fastighet-selection"
          />

          <PolygonDrawingLayers
            color={APP_COLORS.primary}
            draggingIndex={areaEditor.draggingVertex}
            idPrefix="area-create-polygon"
            points={areaEditor.polygonPoints}
            previewPoints={areaEditor.freehandPreviewPoints}
            showEditingHandles={areaEditor.showEditingHandles}
          />
        </MapView>
      </PolygonEditorSurface>

      <View
        className="absolute right-4 z-10 gap-2"
        style={[{ top: Math.max(insets.top, 12) + 8 }, OVERLAY_STACK_STYLE]}
      >
        <GlassIconButton
          icon="close"
          iconSize={23}
          accessibilityLabel="Stäng"
          onPress={onCancel}
          surfaceClassName="size-11"
        />
        <GlassIconButton
          icon="map-outline"
          iconSize={21}
          accessibilityLabel="Ändra kartvy"
          onPress={handleSelectMapStyle}
          surfaceClassName="size-11"
        />
      </View>

      <PolygonDrawingControls
        bottomInset={Math.max(insets.bottom, 8) + 8}
        canContinue={
          areaEditor.isSelectingBoundary ? areaEditor.canContinue : areaEditor.pointCount >= 3
        }
        canUndo={areaEditor.canUndo}
        continueLabel={areaEditor.isSelectingBoundary ? 'Använd gräns' : 'Spara'}
        errorText={areaEditor.errorText}
        onContinue={areaEditor.handleContinue}
        onUndo={areaEditor.handleUndo}
        pointCount={areaEditor.pointCount}
        statusText={areaEditor.statusText}
      >
        <AreaPolygonMethodControls method={areaEditor.method} onMethodChange={areaEditor.setMethod} />

        {areaEditor.boundarySelection ? (
          <FastighetSelectionDetails selection={areaEditor.boundarySelection} />
        ) : null}
      </PolygonDrawingControls>

      {/* Drag hint */}
      {areaEditor.isDragging && (
        <View className="absolute left-4 right-4 top-16 items-center pointer-events-none">
          <View className="rounded-full bg-black/70 px-4 py-2">
            <Text className="text-sm text-white">Dra för att flytta punkt</Text>
          </View>
        </View>
      )}
    </View>
  );
}
