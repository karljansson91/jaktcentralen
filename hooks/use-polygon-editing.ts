import type { LngLat } from '@/lib/geo';
import type { MapView } from '@rnmapbox/maps';
import { useCallback, useRef, useState, type RefObject } from 'react';
import type { GestureResponderEvent } from 'react-native';

type UsePolygonEditingOptions = {
  initialPoints?: LngLat[];
  mapRef: RefObject<MapView | null>;
  onComplete: (points: LngLat[]) => void;
};

function hasPointChanges(current: LngLat[], initial: LngLat[] = []) {
  return JSON.stringify(current) !== JSON.stringify(initial);
}

export function usePolygonEditing({
  initialPoints,
  mapRef,
  onComplete,
}: UsePolygonEditingOptions) {
  const [polygonPoints, setPolygonPoints] = useState<LngLat[]>(initialPoints ?? []);
  const [draggingVertex, setDraggingVertex] = useState<number | null>(null);
  const draggingRef = useRef<number | null>(null);
  const suppressMapPress = useRef(false);

  const handleTouchStart = useCallback(
    async (event: GestureResponderEvent) => {
      if (!mapRef.current || polygonPoints.length === 0) return;
      const { pageX, pageY } = event.nativeEvent;

      try {
        const hitRadius = 40 * 40;
        const map = mapRef.current;
        if (!map) return;

        const vertexScreenPoints = await Promise.all(
          polygonPoints.map(async (point, index) => ({
            index,
            screenPt: await map.getPointInView(point),
          }))
        );

        for (const { index, screenPt } of vertexScreenPoints) {
          const dx = pageX - screenPt[0];
          const dy = pageY - screenPt[1];
          if (dx * dx + dy * dy < hitRadius) {
            draggingRef.current = index;
            suppressMapPress.current = true;
            setDraggingVertex(index);
            return;
          }
        }

        const segmentCount =
          polygonPoints.length >= 3 ? polygonPoints.length : Math.max(polygonPoints.length - 1, 0);
        const segmentScreenPoints = await Promise.all(
          Array.from({ length: segmentCount }, async (_, index) => {
            const start = polygonPoints[index];
            const end = polygonPoints[(index + 1) % polygonPoints.length];
            const midpoint: LngLat = [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2];
            return {
              index,
              screenPt: await map.getPointInView(midpoint),
            };
          })
        );

        let hitSegmentIndex: number | null = null;
        for (const { index, screenPt } of segmentScreenPoints) {
          const dx = pageX - screenPt[0];
          const dy = pageY - screenPt[1];

          if (dx * dx + dy * dy < hitRadius) {
            hitSegmentIndex = index;
            break;
          }
        }

        if (hitSegmentIndex !== null) {
          const droppedAt = (await map.getCoordinateFromView([pageX, pageY])) as LngLat;
          const insertIndex = hitSegmentIndex + 1;

          draggingRef.current = insertIndex;
          suppressMapPress.current = true;
          setDraggingVertex(insertIndex);
          setPolygonPoints((previous) => {
            const updated = [...previous];
            updated.splice(insertIndex, 0, droppedAt);
            return updated;
          });
        }
      } catch {
        // Mapbox can reject if the drawer unmounts while a toolbar tap is bubbling.
      }
    },
    [mapRef, polygonPoints]
  );

  const handleTouchMove = useCallback(
    async (event: GestureResponderEvent) => {
      if (draggingRef.current === null || !mapRef.current) return;
      const { pageX, pageY } = event.nativeEvent;

      try {
        const coords = await mapRef.current.getCoordinateFromView([pageX, pageY]);
        const index = draggingRef.current;
        setPolygonPoints((previous) => {
          const updated = [...previous];
          updated[index] = coords as LngLat;
          return updated;
        });
      } catch {
        // The native map view can disappear mid-gesture when the drawer is dismissed.
      }
    },
    [mapRef]
  );

  const handleTouchEnd = useCallback(() => {
    if (draggingRef.current !== null) {
      draggingRef.current = null;
      setDraggingVertex(null);
      setTimeout(() => {
        suppressMapPress.current = false;
      }, 50);
    }
  }, []);

  const handleMapPress = useCallback((feature: GeoJSON.Feature) => {
    if (suppressMapPress.current) {
      suppressMapPress.current = false;
      return;
    }
    const coords = (feature.geometry as GeoJSON.Point).coordinates as LngLat;
    setPolygonPoints((previous) => [...previous, coords]);
  }, []);

  const handleUndo = useCallback(() => {
    setDraggingVertex(null);
    draggingRef.current = null;
    setPolygonPoints((previous) => previous.slice(0, -1));
  }, []);

  const handleDone = useCallback(() => {
    if (polygonPoints.length < 3) return;
    setDraggingVertex(null);
    draggingRef.current = null;
    onComplete(polygonPoints);
  }, [onComplete, polygonPoints]);

  return {
    draggingVertex,
    handleDone,
    handleMapPress,
    handleTouchEnd,
    handleTouchMove,
    handleTouchStart,
    handleUndo,
    hasChanges: hasPointChanges(polygonPoints, initialPoints),
    isDragging: draggingVertex !== null,
    polygonPoints,
  };
}
