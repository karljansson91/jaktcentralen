import {
  buildAssignmentRouteGeoJSON,
  type AssignmentRoute,
  type AssignmentTrailMode,
  type Coordinate,
} from '@/lib/hunt-navigation';
import type { LatLngPoint } from '@/lib/geo';
import {
  buildDirectMeasurementRoute,
  fetchWalkingMeasurementRoute,
  latLngPointToCoordinate,
  toMeasurementRouteKey,
  type HuntMapMeasurementPoint,
} from '@/lib/hunt-measurement';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type HuntMapMeasurementStatus = 'idle' | 'loading' | 'error';

type WalkingRouteResult = {
  error: string | null;
  key: string;
  route: AssignmentRoute | null;
};

export function useHuntMapMeasurement() {
  const nextPointIdRef = useRef(0);
  const [mode, setMode] = useState<AssignmentTrailMode>('direct');
  const [points, setPoints] = useState<HuntMapMeasurementPoint[]>([]);
  const [walkingRouteResult, setWalkingRouteResult] = useState<WalkingRouteResult | null>(null);

  const createPoint = useCallback((coordinate: Coordinate): HuntMapMeasurementPoint => {
    nextPointIdRef.current += 1;
    return { coordinate, id: `measurement-point-${nextPointIdRef.current}` };
  }, []);

  const routeKey = useMemo(() => toMeasurementRouteKey(points), [points]);
  const directRoute = useMemo(() => buildDirectMeasurementRoute(points), [points]);

  useEffect(() => {
    if (!routeKey || mode !== 'walking') return;
    if (walkingRouteResult?.key === routeKey) return;

    const controller = new AbortController();

    fetchWalkingMeasurementRoute(points, controller.signal)
      .then((route) => {
        setWalkingRouteResult({ error: null, key: routeKey, route });
      })
      .catch((error) => {
        if (controller.signal.aborted) return;

        setWalkingRouteResult({
          error: error instanceof Error ? error.message : 'Kunde inte beräkna gångväg.',
          key: routeKey,
          route: null,
        });
      });

    return () => {
      controller.abort();
    };
  }, [mode, points, routeKey, walkingRouteResult?.key]);

  const walkingRoute = walkingRouteResult?.key === routeKey ? walkingRouteResult.route : null;
  const walkingRouteError =
    walkingRouteResult?.key === routeKey ? walkingRouteResult.error : null;
  const isWalkingRouteLoading = Boolean(
    mode === 'walking' && routeKey && walkingRouteResult?.key !== routeKey
  );
  const route = mode === 'direct' ? directRoute : walkingRoute;
  const routeStatus: HuntMapMeasurementStatus = isWalkingRouteLoading
    ? 'loading'
    : walkingRouteError
      ? 'error'
      : 'idle';
  const routeError = mode === 'walking' ? walkingRouteError : null;
  const routeGeoJSON = useMemo(() => buildAssignmentRouteGeoJSON(route), [route]);

  const addPoint = useCallback(
    (point: LatLngPoint) => {
      setPoints((current) => [...current, createPoint(latLngPointToCoordinate(point))]);
    },
    [createPoint]
  );

  const replaceWithUserMeasurement = useCallback(
    (startCoordinate: Coordinate, endPoint: LatLngPoint) => {
      setPoints([
        createPoint(startCoordinate),
        createPoint(latLngPointToCoordinate(endPoint)),
      ]);
    },
    [createPoint]
  );

  const updatePointCoordinate = useCallback((pointId: string, coordinate: Coordinate) => {
    setPoints((current) =>
      current.map((point) => (point.id === pointId ? { ...point, coordinate } : point))
    );
  }, []);

  const clear = useCallback(() => {
    setMode('direct');
    setPoints([]);
    setWalkingRouteResult(null);
  }, []);

  const undoLastPoint = useCallback(() => {
    setPoints((current) => {
      const nextPoints = current.slice(0, -1);

      if (nextPoints.length < 2) {
        setWalkingRouteResult(null);
      }
      if (nextPoints.length === 0) {
        setMode('direct');
      }

      return nextPoints;
    });
  }, []);

  const toggleMode = useCallback(() => {
    setMode((current) => (current === 'walking' ? 'direct' : 'walking'));
  }, []);

  return {
    addPoint,
    clear,
    isActive: points.length > 0,
    mode,
    points,
    replaceWithUserMeasurement,
    route,
    routeError,
    routeGeoJSON,
    routeStatus,
    setMode,
    toggleMode,
    undoLastPoint,
    updatePointCoordinate,
  };
}
