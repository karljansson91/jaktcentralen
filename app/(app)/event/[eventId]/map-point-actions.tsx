import { HuntMapLongPressActionSheet } from '@/components/event/hunt-map-long-press-action-sheet';
import type { LatLngPoint } from '@/lib/geo';
import { publishHuntMapLongPressAction } from '@/lib/hunt-map-long-press-actions';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';

function parseCoordinate(value: string | string[] | undefined) {
  const rawValue = Array.isArray(value) ? value[0] : value;
  if (!rawValue) {
    return null;
  }

  const coordinate = Number(rawValue);
  return Number.isFinite(coordinate) ? coordinate : null;
}

export default function MapPointActionsScreen() {
  const { eventId, latitude, longitude, canMeasureFromUser, satOptions } = useLocalSearchParams<{
    canMeasureFromUser?: string;
    eventId: string;
    latitude?: string;
    longitude?: string;
    satOptions?: string;
  }>();
  const { back, canGoBack, replace } = useRouter();

  const coordinate = (() => {
    const parsedLatitude = parseCoordinate(latitude);
    const parsedLongitude = parseCoordinate(longitude);
    if (parsedLatitude == null || parsedLongitude == null) {
      return null;
    }

    return {
      latitude: parsedLatitude,
      longitude: parsedLongitude,
    };
  })();
  const parsedSatOptions = (() => {
    if (!satOptions || Array.isArray(satOptions)) {
      return [];
    }

    try {
      const parsed = JSON.parse(satOptions) as { id?: unknown; name?: unknown }[];
      return parsed.flatMap((option) =>
        typeof option.id === 'string' && typeof option.name === 'string'
          ? [{ id: option.id, name: option.name }]
          : []
      );
    } catch {
      return [];
    }
  })();

  const closeSheet = () => {
    if (canGoBack()) {
      back();
      return;
    }

    replace(`/event/${eventId}`);
  };

  useEffect(() => {
    return () => {
      if (coordinate) {
        publishHuntMapLongPressAction({ point: coordinate, type: 'clearPoint' });
      }
    };
  }, [coordinate]);

  const handleMeasureToPoint = (point: LatLngPoint) => {
    publishHuntMapLongPressAction({ point, type: 'measureToPoint' });
    closeSheet();
  };

  const handleAddMeasurementPoint = (point: LatLngPoint) => {
    publishHuntMapLongPressAction({ point, type: 'addMeasurementPoint' });
    closeSheet();
  };

  const handleMarkAnimalSighting = (point: LatLngPoint) => {
    publishHuntMapLongPressAction({ point, type: 'clearPoint' });
    replace(
      `/event/${eventId}/animal-sighting?latitude=${point.latitude}&longitude=${point.longitude}`
    );
  };

  const handleReportShot = (point: LatLngPoint) => {
    publishHuntMapLongPressAction({ point, type: 'clearPoint' });
    replace(
      `/event/${eventId}/shot-report?latitude=${point.latitude}&longitude=${point.longitude}`
    );
  };

  const handleSelectSat = (satId: string) => {
    if (coordinate) {
      publishHuntMapLongPressAction({ point: coordinate, type: 'clearPoint' });
    }
    replace(`/event/${eventId}/sat?satId=${satId}`);
  };

  return (
    <HuntMapLongPressActionSheet
      canMeasureFromUser={canMeasureFromUser === '1'}
      coordinate={coordinate}
      onAddMeasurementPoint={handleAddMeasurementPoint}
      onMarkAnimalSighting={handleMarkAnimalSighting}
      onMeasureToPoint={handleMeasureToPoint}
      onReportShot={handleReportShot}
      onSelectSat={handleSelectSat}
      satOptions={parsedSatOptions}
    />
  );
}
