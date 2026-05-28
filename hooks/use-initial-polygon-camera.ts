import type { LngLat } from '@/lib/geo';
import { useMemo } from 'react';

export function useInitialPolygonCamera(initialPoints: LngLat[] | undefined) {
  return useMemo(() => {
    if (initialPoints && initialPoints.length >= 2) {
      const lngs = initialPoints.map((point) => point[0]);
      const lats = initialPoints.map((point) => point[1]);
      return {
        bounds: {
          ne: [Math.max(...lngs), Math.max(...lats)] as LngLat,
          sw: [Math.min(...lngs), Math.min(...lats)] as LngLat,
          paddingTop: 80,
          paddingBottom: 120,
          paddingLeft: 40,
          paddingRight: 40,
        },
      };
    }

    if (initialPoints && initialPoints.length === 1) {
      return {
        zoomLevel: 15,
        centerCoordinate: initialPoints[0],
      };
    }

    return {
      zoomLevel: 4,
      centerCoordinate: [16, 62] as LngLat,
    };
  }, [initialPoints]);
}
