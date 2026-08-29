import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import {
  AreaFeatureDraft,
  AreaFeatureListItem,
  getAreaFeatureTargetKey,
  getDefaultColorForCategory,
} from '@/lib/area-features';
import { saveAreaFeatureDraft } from '@/lib/area-feature-draft-store';
import type { LatLngPoint } from '@/lib/geo';
import { useMutation } from 'convex/react';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { Alert, Vibration } from 'react-native';

const FEATURE_PRESS_LOCK_MS = 1000;
const DRAG_GESTURE_LOCK_MS = 1200;
const DROP_GESTURE_LOCK_MS = 900;
const DROP_OVERRIDE_SETTLE_MS = 800;

type MarkerPlacementCamera = {
  setCamera: (config: {
    animationDuration: number;
    animationMode: 'easeTo';
    centerCoordinate: [number, number];
  }) => void;
};

type MarkerPlacementMap = {
  getCenter: () => Promise<GeoJSON.Position>;
};

type AreaMarkerGestureOptions = {
  cameraRef: RefObject<MarkerPlacementCamera | null>;
  mapRef: RefObject<MarkerPlacementMap | null>;
};

function createPointDraft(areaId: Id<'areas'>, point: LatLngPoint): AreaFeatureDraft {
  return {
    mode: 'create',
    areaId,
    category: 'pass',
    geometryType: 'point',
    name: '',
    description: '',
    color: getDefaultColorForCategory('pass'),
    point,
    images: [],
  };
}

function createFeatureDraft(areaId: Id<'areas'>, feature: AreaFeatureListItem): AreaFeatureDraft {
  return {
    mode: 'edit',
    areaId,
    featureId: feature.id,
    category: feature.category,
    geometryType: feature.geometryType,
    name: feature.name,
    description: feature.description ?? '',
    color: feature.color,
    point: feature.point,
    images: feature.images,
  };
}

function pointFromLongPress(event: GeoJSON.Feature): LatLngPoint {
  const coordinates = (event.geometry as GeoJSON.Point).coordinates as [number, number];
  return {
    latitude: coordinates[1],
    longitude: coordinates[0],
  };
}

export function useAreaMarkerGestures(
  areaId: Id<'areas'>,
  { cameraRef, mapRef }: AreaMarkerGestureOptions
) {
  const router = useRouter();
  const saveFeature = useMutation(api.areaFeatures.save);
  const blockLongPressUntilRef = useRef(0);
  const blockFeaturePressUntilRef = useRef(0);
  const markerEditNavigationLockedRef = useRef(false);
  const markerPlacementConfirmationLockedRef = useRef(false);
  const overrideTimeoutsRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const [isConfirmingMarkerPlacement, setIsConfirmingMarkerPlacement] = useState(false);
  const [isPlacingMarker, setIsPlacingMarker] = useState(false);
  const [draggedPointOverrides, setDraggedPointOverrides] = useState<Record<string, LatLngPoint>>(
    {}
  );

  useEffect(() => {
    const overrideTimeouts = overrideTimeoutsRef.current;
    return () => {
      overrideTimeouts.forEach((timeout) => clearTimeout(timeout));
      overrideTimeouts.clear();
    };
  }, []);

  const resetMarkerGestureLocks = () => {
    markerEditNavigationLockedRef.current = false;
    blockFeaturePressUntilRef.current = 0;
  };

  const openMarkerSheet = (draft: AreaFeatureDraft) => {
    const draftId = saveAreaFeatureDraft(draft);
    router.push(`/area/${areaId}/marker-sheet?mode=create&draftId=${draftId}`);
  };

  const startMarkerPlacement = () => {
    setIsPlacingMarker(true);
  };

  const cancelMarkerPlacement = () => {
    if (markerPlacementConfirmationLockedRef.current) {
      return;
    }
    setIsPlacingMarker(false);
  };

  const confirmMarkerPlacement = async () => {
    const map = mapRef.current;
    if (!map || markerPlacementConfirmationLockedRef.current) {
      return;
    }

    markerPlacementConfirmationLockedRef.current = true;
    setIsConfirmingMarkerPlacement(true);
    try {
      const [longitude, latitude] = await map.getCenter();
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        throw new Error('Map center is unavailable');
      }

      setIsPlacingMarker(false);
      openMarkerSheet(createPointDraft(areaId, { latitude, longitude }));
    } catch (error) {
      console.error('Failed to confirm marker position:', error);
      Alert.alert('Kunde inte välja plats', 'Försök igen om en stund.');
    } finally {
      markerPlacementConfirmationLockedRef.current = false;
      setIsConfirmingMarkerPlacement(false);
    }
  };

  const handleMapLongPress = (event: GeoJSON.Feature) => {
    if (isPlacingMarker || Date.now() < blockLongPressUntilRef.current) {
      return;
    }

    const point = pointFromLongPress(event);
    cameraRef.current?.setCamera({
      animationDuration: 250,
      animationMode: 'easeTo',
      centerCoordinate: [point.longitude, point.latitude],
    });
    setIsPlacingMarker(true);
    Vibration.vibrate(8);
  };

  const handlePressFeature = (feature: AreaFeatureListItem) => {
    if (markerEditNavigationLockedRef.current || Date.now() < blockFeaturePressUntilRef.current) {
      return;
    }

    markerEditNavigationLockedRef.current = true;
    blockLongPressUntilRef.current = Date.now() + 500;
    blockFeaturePressUntilRef.current = Date.now() + FEATURE_PRESS_LOCK_MS;

    const draftId = saveAreaFeatureDraft(createFeatureDraft(areaId, feature));
    router.push(`/area/${areaId}/marker?draftId=${draftId}`);
  };

  const handleStartDraggingFeature = () => {
    blockLongPressUntilRef.current = Date.now() + DRAG_GESTURE_LOCK_MS;
    blockFeaturePressUntilRef.current = Date.now() + DRAG_GESTURE_LOCK_MS;
    Vibration.vibrate(8);
  };

  const clearDraggedPointOverrideLater = (featureKey: string) => {
    const existingTimeout = overrideTimeoutsRef.current.get(featureKey);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    const timeout = setTimeout(() => {
      setDraggedPointOverrides((current) => {
        const next = { ...current };
        delete next[featureKey];
        return next;
      });
      overrideTimeoutsRef.current.delete(featureKey);
    }, DROP_OVERRIDE_SETTLE_MS);

    overrideTimeoutsRef.current.set(featureKey, timeout);
  };

  const handleDropFeature = async (feature: AreaFeatureListItem, point: LatLngPoint) => {
    blockLongPressUntilRef.current = Date.now() + DROP_GESTURE_LOCK_MS;
    blockFeaturePressUntilRef.current = Date.now() + DROP_GESTURE_LOCK_MS;

    const featureKey = getAreaFeatureTargetKey(feature);
    setDraggedPointOverrides((current) => ({ ...current, [featureKey]: point }));

    try {
      await saveFeature({
        featureId: feature.id,
        name: feature.name,
        description: feature.description,
        category: feature.category,
        color: feature.color,
        point,
        imageFileIds: feature.images.map((image) => image.fileId),
      });

      clearDraggedPointOverrideLater(featureKey);
    } catch (error) {
      console.error('Failed to move area marker:', error);
      setDraggedPointOverrides((current) => {
        const next = { ...current };
        delete next[featureKey];
        return next;
      });
      Alert.alert('Kunde inte flytta markören', 'Försök igen om en stund.');
    }
  };

  return {
    cancelMarkerPlacement,
    confirmMarkerPlacement,
    draggedPointOverrides,
    handleDropFeature,
    handleMapLongPress,
    handlePressFeature,
    handleStartDraggingFeature,
    isConfirmingMarkerPlacement,
    isPlacingMarker,
    resetMarkerGestureLocks,
    startMarkerPlacement,
  };
}
