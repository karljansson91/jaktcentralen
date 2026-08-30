import type { LngLat } from '@/lib/geo';

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
      centerCoordinate: LngLat;
      zoomLevel: number;
    };

const SWEDEN_CAMERA: PolygonCamera = {
  zoomLevel: 5,
  centerCoordinate: [16, 62],
};

export function getInitialPolygonCamera(initialPoints: LngLat[] | undefined): PolygonCamera {
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

  if (initialPoints?.length === 1) {
    return {
      zoomLevel: 15,
      centerCoordinate: initialPoints[0],
    };
  }

  return SWEDEN_CAMERA;
}
