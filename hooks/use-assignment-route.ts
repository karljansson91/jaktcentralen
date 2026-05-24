import {
  buildAssignmentRouteGeoJSON,
  buildAssignmentTrailKey,
  buildDirectAssignmentRoute,
  fetchWalkingAssignmentRoute,
  type AssignmentRoute,
  type AssignmentTrail,
  type AssignmentTrailMode,
} from '@/lib/hunt-navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

export type AssignmentRouteStatus = 'idle' | 'loading' | 'error';

type WalkingRouteResult = {
  error: string | null;
  key: string;
  route: AssignmentRoute | null;
};

export function useAssignmentRoute(trail: AssignmentTrail | null) {
  const [mode, setMode] = useState<AssignmentTrailMode>('walking');
  const [walkingRouteResult, setWalkingRouteResult] = useState<WalkingRouteResult | null>(null);

  const trailKey = useMemo(() => (trail ? buildAssignmentTrailKey(trail) : null), [trail]);
  const directRoute = useMemo(() => (trail ? buildDirectAssignmentRoute(trail) : null), [trail]);

  useEffect(() => {
    if (!trail || !trailKey || mode !== 'walking') return;
    if (walkingRouteResult?.key === trailKey) return;

    const controller = new AbortController();

    fetchWalkingAssignmentRoute(trail, controller.signal)
      .then((route) => {
        setWalkingRouteResult({ error: null, key: trailKey, route });
      })
      .catch((error) => {
        if (controller.signal.aborted) return;

        setWalkingRouteResult({
          error: error instanceof Error ? error.message : 'Kunde inte beräkna gångväg.',
          key: trailKey,
          route: null,
        });
      });

    return () => {
      controller.abort();
    };
  }, [mode, trail, trailKey, walkingRouteResult?.key]);

  const walkingRoute =
    walkingRouteResult?.key === trailKey ? walkingRouteResult.route : null;
  const walkingRouteError =
    walkingRouteResult?.key === trailKey ? walkingRouteResult.error : null;
  const isWalkingRouteLoading = Boolean(
    mode === 'walking' && trailKey && walkingRouteResult?.key !== trailKey
  );
  const route = mode === 'direct' ? directRoute : walkingRoute;
  const routeStatus: AssignmentRouteStatus = isWalkingRouteLoading
    ? 'loading'
    : walkingRouteError
      ? 'error'
      : 'idle';
  const routeError = mode === 'walking' ? walkingRouteError : null;
  const routeGeoJSON = useMemo(() => buildAssignmentRouteGeoJSON(route), [route]);
  const toggleMode = useCallback(() => {
    setMode((current) => (current === 'walking' ? 'direct' : 'walking'));
  }, []);

  return {
    mode,
    route,
    routeError,
    routeGeoJSON,
    routeStatus,
    setMode,
    toggleMode,
  };
}
