import { HuntMapLongPressActionSheet } from '@/components/event/hunt-map-long-press-action-sheet';
import type { LatLngPoint } from '@/lib/geo';
import { publishHuntMapLongPressAction } from '@/lib/hunt-map-long-press-actions';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo } from 'react';

function parseCoordinate(value: string | string[] | undefined) {
  const rawValue = Array.isArray(value) ? value[0] : value;
  if (!rawValue) {
    return null;
  }

  const coordinate = Number(rawValue);
  return Number.isFinite(coordinate) ? coordinate : null;
}

export default function MapPointActionsScreen() {
  const { eventId, latitude, longitude, canMeasureFromUser } = useLocalSearchParams<{
    canMeasureFromUser?: string;
    eventId: string;
    latitude?: string;
    longitude?: string;
  }>();
  const { back, canGoBack, replace } = useRouter();

  const coordinate = useMemo<LatLngPoint | null>(() => {
    const parsedLatitude = parseCoordinate(latitude);
    const parsedLongitude = parseCoordinate(longitude);
    if (parsedLatitude == null || parsedLongitude == null) {
      return null;
    }

    return {
      latitude: parsedLatitude,
      longitude: parsedLongitude,
    };
  }, [latitude, longitude]);

  const closeSheet = useCallback(() => {
    if (canGoBack()) {
      back();
      return;
    }

    replace(`/event/${eventId}`);
  }, [back, canGoBack, eventId, replace]);

  useEffect(() => {
    return () => {
      if (coordinate) {
        publishHuntMapLongPressAction({ point: coordinate, type: 'clearPoint' });
      }
    };
  }, [coordinate]);

  const handleMeasureToPoint = useCallback(
    (point: LatLngPoint) => {
      publishHuntMapLongPressAction({ point, type: 'measureToPoint' });
      closeSheet();
    },
    [closeSheet]
  );

  const handleAddMeasurementPoint = useCallback(
    (point: LatLngPoint) => {
      publishHuntMapLongPressAction({ point, type: 'addMeasurementPoint' });
      closeSheet();
    },
    [closeSheet]
  );

  const handleMarkAnimalSighting = useCallback(
    (point: LatLngPoint) => {
      publishHuntMapLongPressAction({ point, type: 'clearPoint' });
      replace(
        `/event/${eventId}/animal-sighting?latitude=${point.latitude}&longitude=${point.longitude}`
      );
    },
    [eventId, replace]
  );

  return (
    <HuntMapLongPressActionSheet
      canMeasureFromUser={canMeasureFromUser === '1'}
      coordinate={coordinate}
      onAddMeasurementPoint={handleAddMeasurementPoint}
      onMarkAnimalSighting={handleMarkAnimalSighting}
      onMeasureToPoint={handleMeasureToPoint}
    />
  );
}
