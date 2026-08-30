import type { LatLngPoint, LngLat } from '@/lib/geo';
import { distanceMeters } from '@/lib/geo';
import { unionLatLngPolygons } from '@/lib/polygon-union';
import type { MapView } from '@rnmapbox/maps';
import { useRef, useState, type RefObject } from 'react';
import type { GestureResponderEvent } from 'react-native';

export type PolygonEditorMode = 'freehand' | 'points';

type UsePolygonEditorOptions = {
  initialMode?: PolygonEditorMode;
  initialPoints?: LngLat[];
  mapRef: RefObject<MapView | null>;
  onComplete: (points: LngLat[]) => void;
};

type ReplacePolygonOptions = {
  recordHistory?: boolean;
};

const FREEHAND_POINT_SPACING_METERS = 8;
const EDITING_HIT_RADIUS_SQUARED = 40 * 40;

function hasPointChanges(current: LngLat[], initial: LngLat[] = []) {
  return JSON.stringify(current) !== JSON.stringify(initial);
}

function toLatLngPoint([longitude, latitude]: LngLat): LatLngPoint {
  return { latitude, longitude };
}

function toLngLat({ latitude, longitude }: LatLngPoint): LngLat {
  return [longitude, latitude];
}

function mergeFreehandStroke(base: LngLat[], stroke: LngLat[]) {
  if (base.length === 0) {
    return stroke;
  }
  if (base.length < 3) {
    return [...base, ...stroke];
  }

  return unionLatLngPolygons(base.map(toLatLngPoint), stroke.map(toLatLngPoint)).map(toLngLat);
}

export function usePolygonEditor({
  initialMode = 'points',
  initialPoints,
  mapRef,
  onComplete,
}: UsePolygonEditorOptions) {
  const [mode, setModeState] = useState<PolygonEditorMode>(initialMode);
  const [polygonPoints, setPolygonPoints] = useState<LngLat[]>(initialPoints ?? []);
  const [draggingVertex, setDraggingVertex] = useState<number | null>(null);
  const [freehandPreviewPoints, setFreehandPreviewPoints] = useState<LngLat[]>([]);
  const [historyDepth, setHistoryDepth] = useState(0);

  const polygonPointsRef = useRef<LngLat[]>(initialPoints ?? []);
  const draggingRef = useRef<number | null>(null);
  const dragBasePointsRef = useRef<LngLat[] | null>(null);
  const suppressMapPressRef = useRef(false);
  const historyRef = useRef<LngLat[][]>([]);
  const freehandLastPointRef = useRef<LngLat | null>(null);
  const freehandBasePointsRef = useRef<LngLat[]>([]);
  const freehandStrokeRef = useRef<LngLat[]>([]);

  const pushHistory = (points: LngLat[]) => {
    historyRef.current = [...historyRef.current, points.map((point) => [...point] as LngLat)];
    setHistoryDepth(historyRef.current.length);
  };

  const clearHistory = () => {
    historyRef.current = [];
    setHistoryDepth(0);
  };

  const setPoints = (points: LngLat[]) => {
    const nextPoints = points.map((point) => [...point] as LngLat);
    polygonPointsRef.current = nextPoints;
    setPolygonPoints(nextPoints);
  };

  const resetFreehandGesture = () => {
    freehandLastPointRef.current = null;
    freehandBasePointsRef.current = [];
    freehandStrokeRef.current = [];
    setFreehandPreviewPoints([]);
  };

  const resetPointGesture = () => {
    draggingRef.current = null;
    dragBasePointsRef.current = null;
    suppressMapPressRef.current = false;
    setDraggingVertex(null);
  };

  const setMode = (nextMode: PolygonEditorMode) => {
    if (nextMode === mode) {
      return;
    }
    resetFreehandGesture();
    resetPointGesture();
    setModeState(nextMode);
  };

  const replacePolygonPoints = (points: LngLat[], options?: ReplacePolygonOptions) => {
    resetFreehandGesture();
    resetPointGesture();
    const current = polygonPointsRef.current;
    if (options?.recordHistory !== false && hasPointChanges(points, current)) {
      pushHistory(current);
    }
    setPoints(points);
  };

  const resetPolygonPoints = (points: LngLat[]) => {
    clearHistory();
    replacePolygonPoints(points, { recordHistory: false });
  };

  const handleMapPress = (feature: GeoJSON.Feature) => {
    if (mode !== 'points') {
      return;
    }
    if (suppressMapPressRef.current) {
      suppressMapPressRef.current = false;
      return;
    }
    if (feature.geometry?.type !== 'Point') {
      return;
    }

    const coordinates = feature.geometry.coordinates as LngLat;
    const current = polygonPointsRef.current;
    pushHistory(current);
    setPoints([...current, coordinates]);
  };

  const startFreehandGesture = async (event: GestureResponderEvent) => {
    const map = mapRef.current;
    if (!map || (event.nativeEvent.touches?.length ?? 1) > 1) {
      return;
    }

    const { pageX, pageY } = event.nativeEvent;
    try {
      const point = (await map.getCoordinateFromView([pageX, pageY])) as LngLat;
      freehandLastPointRef.current = point;
      freehandBasePointsRef.current = polygonPointsRef.current;
      freehandStrokeRef.current = [point];
      setFreehandPreviewPoints([point]);
    } catch {
      // The native map can reject coordinate conversion while mounting or unmounting.
    }
  };

  const moveFreehandGesture = async (event: GestureResponderEvent) => {
    const map = mapRef.current;
    if (!map) {
      return;
    }
    if ((event.nativeEvent.touches?.length ?? 1) > 1) {
      resetFreehandGesture();
      return;
    }

    const { pageX, pageY } = event.nativeEvent;
    try {
      const point = (await map.getCoordinateFromView([pageX, pageY])) as LngLat;
      const lastPoint = freehandLastPointRef.current;
      if (
        lastPoint &&
        distanceMeters(toLatLngPoint(lastPoint), toLatLngPoint(point)) <
          FREEHAND_POINT_SPACING_METERS
      ) {
        return;
      }

      freehandLastPointRef.current = point;
      freehandStrokeRef.current = [...freehandStrokeRef.current, point];
      setFreehandPreviewPoints(freehandStrokeRef.current);
    } catch {
      // The native map can disappear mid-gesture during navigation.
    }
  };

  const endFreehandGesture = () => {
    const base = freehandBasePointsRef.current;
    const stroke = freehandStrokeRef.current;
    resetFreehandGesture();

    if (stroke.length < 3) {
      return;
    }

    const nextPoints = mergeFreehandStroke(base, stroke);
    pushHistory(base);
    setPoints(nextPoints);
  };

  const startPointGesture = async (event: GestureResponderEvent) => {
    const map = mapRef.current;
    const currentPoints = polygonPointsRef.current;
    if (!map || currentPoints.length === 0) {
      return;
    }
    const { pageX, pageY } = event.nativeEvent;

    try {
      const vertexScreenPoints = await Promise.all(
        currentPoints.map(async (point, index) => ({
          index,
          screenPoint: await map.getPointInView(point),
        }))
      );

      for (const { index, screenPoint } of vertexScreenPoints) {
        const deltaX = pageX - screenPoint[0];
        const deltaY = pageY - screenPoint[1];
        if (deltaX * deltaX + deltaY * deltaY < EDITING_HIT_RADIUS_SQUARED) {
          draggingRef.current = index;
          dragBasePointsRef.current = currentPoints;
          suppressMapPressRef.current = true;
          setDraggingVertex(index);
          return;
        }
      }

      const segmentCount =
        currentPoints.length >= 3 ? currentPoints.length : Math.max(currentPoints.length - 1, 0);
      const segmentScreenPoints = await Promise.all(
        Array.from({ length: segmentCount }, async (_, index) => {
          const start = currentPoints[index];
          const end = currentPoints[(index + 1) % currentPoints.length];
          const midpoint: LngLat = [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2];
          return { index, screenPoint: await map.getPointInView(midpoint) };
        })
      );

      const hitSegment = segmentScreenPoints.find(({ screenPoint }) => {
        const deltaX = pageX - screenPoint[0];
        const deltaY = pageY - screenPoint[1];
        return deltaX * deltaX + deltaY * deltaY < EDITING_HIT_RADIUS_SQUARED;
      });

      if (hitSegment) {
        const droppedAt = (await map.getCoordinateFromView([pageX, pageY])) as LngLat;
        const insertIndex = hitSegment.index + 1;
        draggingRef.current = insertIndex;
        dragBasePointsRef.current = currentPoints;
        suppressMapPressRef.current = true;
        setDraggingVertex(insertIndex);
        const nextPoints = [...currentPoints];
        nextPoints.splice(insertIndex, 0, droppedAt);
        setPoints(nextPoints);
      }
    } catch {
      // Mapbox can reject if the editor unmounts while a control tap bubbles.
    }
  };

  const movePointGesture = async (event: GestureResponderEvent) => {
    const map = mapRef.current;
    const draggingIndex = draggingRef.current;
    if (!map || draggingIndex === null) {
      return;
    }

    const { pageX, pageY } = event.nativeEvent;
    try {
      const coordinates = (await map.getCoordinateFromView([pageX, pageY])) as LngLat;
      const nextPoints = [...polygonPointsRef.current];
      nextPoints[draggingIndex] = coordinates;
      setPoints(nextPoints);
    } catch {
      // The native map view can disappear mid-gesture during navigation.
    }
  };

  const endPointGesture = () => {
    if (draggingRef.current === null) {
      return;
    }

    const basePoints = dragBasePointsRef.current;
    if (basePoints && hasPointChanges(polygonPointsRef.current, basePoints)) {
      pushHistory(basePoints);
    }

    draggingRef.current = null;
    dragBasePointsRef.current = null;
    setDraggingVertex(null);
    setTimeout(() => {
      suppressMapPressRef.current = false;
    }, 50);
  };

  const handleTouchStart = (event: GestureResponderEvent) => {
    if (mode === 'freehand') {
      void startFreehandGesture(event);
      return;
    }
    void startPointGesture(event);
  };

  const handleTouchMove = (event: GestureResponderEvent) => {
    if (mode === 'freehand') {
      void moveFreehandGesture(event);
      return;
    }
    void movePointGesture(event);
  };

  const handleTouchEnd = () => {
    if (mode === 'freehand') {
      endFreehandGesture();
      return;
    }
    endPointGesture();
  };

  const handleUndo = () => {
    if (freehandStrokeRef.current.length > 0) {
      resetFreehandGesture();
      return;
    }

    resetPointGesture();
    const previousPoints = historyRef.current.pop();
    setHistoryDepth(historyRef.current.length);
    setPoints(previousPoints ?? polygonPointsRef.current.slice(0, -1));
  };

  const handleDone = () => {
    if (polygonPointsRef.current.length < 3) {
      return;
    }
    resetFreehandGesture();
    resetPointGesture();
    onComplete(polygonPointsRef.current);
  };

  const isDragging = draggingVertex !== null;
  const isFreehandMode = mode === 'freehand';
  const isReady = polygonPoints.length >= 3;

  return {
    canUndo: freehandPreviewPoints.length > 0 || historyDepth > 0 || polygonPoints.length > 0,
    draggingVertex,
    freehandPreviewPoints,
    handleDone,
    handleMapPress,
    handleShouldSetResponder: (event: GestureResponderEvent) =>
      isFreehandMode && (event.nativeEvent.touches?.length ?? 1) === 1,
    handleTouchEnd,
    handleTouchMove,
    handleTouchStart,
    handleUndo,
    hasChanges: hasPointChanges(polygonPoints, initialPoints),
    isDragging,
    isFreehandMode,
    isReady,
    mapGestures: {
      gestureSettings: {
        panEnabled: !isDragging && !isFreehandMode,
        pinchPanEnabled: !isDragging,
        pinchZoomEnabled: !isDragging,
      },
      pitchEnabled: !isDragging,
      rotateEnabled: !isDragging,
      scrollEnabled: !isDragging,
      zoomEnabled: !isDragging,
    },
    mode,
    pointCount: polygonPoints.length,
    polygonPoints,
    replacePolygonPoints,
    resetPolygonPoints,
    setMode,
    statusText: isReady
      ? `${polygonPoints.length} punkter`
      : `${polygonPoints.length} av 3 punkter`,
  };
}

export type PolygonEditorController = ReturnType<typeof usePolygonEditor>;
