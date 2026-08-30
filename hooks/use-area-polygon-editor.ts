import { useFastighetBoundaryPicker } from '@/hooks/use-fastighet-boundary-picker';
import {
  usePolygonEditor,
  type PolygonEditorMode,
} from '@/hooks/use-polygon-editor';
import type { LngLat } from '@/lib/geo';
import type { MapView } from '@rnmapbox/maps';
import type { RefObject } from 'react';

export type AreaPolygonMethod = PolygonEditorMode | 'boundary';

type UseAreaPolygonEditorOptions = {
  initialMode?: PolygonEditorMode;
  initialPoints?: LngLat[];
  mapRef: RefObject<MapView | null>;
  onComplete: (points: LngLat[]) => void;
};

export function useAreaPolygonEditor(options: UseAreaPolygonEditorOptions) {
  const polygonEditor = usePolygonEditor(options);
  const boundaryPicker = useFastighetBoundaryPicker({
    mapRef: options.mapRef,
    onApply: polygonEditor.replacePolygonPoints,
  });
  const isSelectingBoundary = boundaryPicker.isActive;
  const method: AreaPolygonMethod = isSelectingBoundary ? 'boundary' : polygonEditor.mode;

  const setMethod = (method: AreaPolygonMethod) => {
    if (method === 'boundary') {
      boundaryPicker.activate();
      return;
    }

    polygonEditor.setMode(method);
    boundaryPicker.deactivate();
  };

  const handleMapPress = (feature: GeoJSON.Feature) => {
    if (isSelectingBoundary) {
      void boundaryPicker.handleMapPress(feature);
      return;
    }

    polygonEditor.handleMapPress(feature);
  };

  const resetPolygonPoints = (points: LngLat[], mode?: PolygonEditorMode) => {
    boundaryPicker.deactivate();
    if (mode) {
      polygonEditor.setMode(mode);
    }
    polygonEditor.resetPolygonPoints(points);
  };

  return {
    boundaryGeometry: isSelectingBoundary ? boundaryPicker.geometry : null,
    boundarySelection: isSelectingBoundary ? boundaryPicker.selection : null,
    canContinue: isSelectingBoundary
      ? boundaryPicker.canApply
      : polygonEditor.isReady && polygonEditor.hasChanges,
    canUndo: !isSelectingBoundary && polygonEditor.canUndo,
    draggingVertex: polygonEditor.draggingVertex,
    errorText: isSelectingBoundary ? boundaryPicker.errorText : null,
    freehandPreviewPoints: polygonEditor.freehandPreviewPoints,
    handleContinue: isSelectingBoundary ? boundaryPicker.apply : polygonEditor.handleDone,
    handleMapPress,
    handleUndo: polygonEditor.handleUndo,
    isDragging: polygonEditor.isDragging,
    isSelectingBoundary,
    mapGestures: isSelectingBoundary
      ? {
          gestureSettings: {
            panEnabled: true,
            pinchPanEnabled: true,
            pinchZoomEnabled: true,
          },
          pitchEnabled: true,
          rotateEnabled: true,
          scrollEnabled: true,
          zoomEnabled: true,
        }
      : polygonEditor.mapGestures,
    method,
    pointCount: polygonEditor.pointCount,
    polygonPoints: polygonEditor.polygonPoints,
    resetPolygonPoints,
    setMethod,
    showEditingHandles: !isSelectingBoundary && polygonEditor.mode === 'points',
    statusText: isSelectingBoundary ? boundaryPicker.statusText : polygonEditor.statusText,
    surfaceEditor: isSelectingBoundary ? null : polygonEditor,
  };
}
