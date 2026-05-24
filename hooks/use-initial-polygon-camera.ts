import type { LngLat } from '@/lib/geo';
import * as Location from 'expo-location';
import { useEffect, useMemo, useState } from 'react';

export function useInitialPolygonCamera(initialPoints: LngLat[] | undefined) {
  const [userCoordinate, setUserCoordinate] = useState<LngLat | null>(null);

  useEffect(() => {
    if (initialPoints?.length) return;

    let cancelled = false;

    async function centerOnUserLocation() {
      try {
        const currentPermission = await Location.getForegroundPermissionsAsync();
        const permission =
          currentPermission.status === 'granted'
            ? currentPermission
            : await Location.requestForegroundPermissionsAsync();

        if (permission.status !== 'granted') return;

        const lastKnownPosition = await Location.getLastKnownPositionAsync();
        if (lastKnownPosition && !cancelled) {
          setUserCoordinate([
            lastKnownPosition.coords.longitude,
            lastKnownPosition.coords.latitude,
          ]);
        }

        const currentPosition = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (!cancelled) {
          setUserCoordinate([
            currentPosition.coords.longitude,
            currentPosition.coords.latitude,
          ]);
        }
      } catch {
        // Keep the Sweden-wide fallback if the simulator has no usable location.
      }
    }

    void centerOnUserLocation();

    return () => {
      cancelled = true;
    };
  }, [initialPoints?.length]);

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

    if (userCoordinate) {
      return {
        zoomLevel: 14,
        centerCoordinate: userCoordinate,
      };
    }

    return {
      zoomLevel: 4,
      centerCoordinate: [16, 62] as LngLat,
    };
  }, [initialPoints, userCoordinate]);
}
