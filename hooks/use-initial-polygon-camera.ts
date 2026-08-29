import type { LngLat } from '@/lib/geo';
import { getCurrentUserCoordinate } from '@/lib/location';
import { useEffect, useState } from 'react';

type PolygonCamera =
  | {
      bounds: {
        ne: LngLat;
        sw: LngLat;
        paddingTop: number;
        paddingBottom: number;
        paddingLeft: number;
        paddingRight: number;
      };
    }
  | {
      zoomLevel: number;
      centerCoordinate: LngLat;
    };

const SWEDEN_CAMERA: PolygonCamera = {
  zoomLevel: 4,
  centerCoordinate: [16, 62],
};

export function useInitialPolygonCamera(initialPoints: LngLat[] | undefined) {
  const polygonCamera = (() => {
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

    return null;
  })();

  const [newPolygonCamera, setNewPolygonCamera] = useState<PolygonCamera | null>(null);

  useEffect(() => {
    if (polygonCamera) {
      return;
    }

    let cancelled = false;

    void getCurrentUserCoordinate()
      .then((coordinate) => {
        if (cancelled) {
          return;
        }

        setNewPolygonCamera(
          coordinate
            ? {
                zoomLevel: 13,
                centerCoordinate: coordinate,
              }
            : SWEDEN_CAMERA
        );
      })
      .catch(() => {
        if (!cancelled) {
          setNewPolygonCamera(SWEDEN_CAMERA);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [polygonCamera]);

  return polygonCamera ?? newPolygonCamera;
}
