import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  AreaFeatureDraft,
  AreaFeatureListItem,
  LatLngPoint,
  getAreaFeatureTargetKey,
  getDefaultColorForCategory,
} from "@/lib/area-features";
import { saveAreaFeatureDraft } from "@/lib/area-feature-draft-store";
import { useMutation } from "convex/react";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Vibration } from "react-native";

const FEATURE_PRESS_LOCK_MS = 1000;
const DRAG_GESTURE_LOCK_MS = 1200;
const DROP_GESTURE_LOCK_MS = 900;
const DROP_OVERRIDE_SETTLE_MS = 800;

function createPointDraft(areaId: Id<"areas">, point: LatLngPoint): AreaFeatureDraft {
  return {
    mode: "create",
    areaId,
    category: "tower",
    geometryType: "point",
    name: "",
    description: "",
    color: getDefaultColorForCategory("tower"),
    point,
    images: [],
  };
}

function createFeatureDraft(
  areaId: Id<"areas">,
  feature: AreaFeatureListItem
): AreaFeatureDraft {
  return {
    mode: feature.source === "feature" ? "edit" : "legacy",
    areaId,
    featureId:
      feature.source === "feature" ? (feature.id as Id<"areaFeatures">) : undefined,
    legacyPointId:
      feature.source === "legacy" ? (feature.id as Id<"areaPoints">) : undefined,
    category: feature.category,
    geometryType: feature.geometryType,
    name: feature.name,
    description: feature.description ?? "",
    color: feature.color,
    point: feature.point,
    polygon: feature.polygon,
    images: feature.images,
  };
}

function pointFromLongPress(event: GeoJSON.Feature): LatLngPoint {
  const coordinates = (event.geometry as GeoJSON.Point).coordinates as [
    number,
    number,
  ];
  return {
    latitude: coordinates[1],
    longitude: coordinates[0],
  };
}

export function useAreaMarkerGestures(areaId: Id<"areas">) {
  const router = useRouter();
  const saveFeature = useMutation(api.areaFeatures.save);
  const blockLongPressUntilRef = useRef(0);
  const blockFeaturePressUntilRef = useRef(0);
  const markerEditNavigationLockedRef = useRef(false);
  const overrideTimeoutsRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const [draggedPointOverrides, setDraggedPointOverrides] = useState<
    Record<string, LatLngPoint>
  >({});

  useEffect(() => {
    return () => {
      overrideTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
      overrideTimeoutsRef.current.clear();
    };
  }, []);

  const resetMarkerGestureLocks = useCallback(() => {
    markerEditNavigationLockedRef.current = false;
    blockFeaturePressUntilRef.current = 0;
  }, []);

  const openMarkerSheet = useCallback(
    (draft: AreaFeatureDraft) => {
      const draftId = saveAreaFeatureDraft(draft);
      router.push(`/area/${areaId}/marker-sheet?mode=create&draftId=${draftId}`);
    },
    [areaId, router]
  );

  const handleMapLongPress = useCallback(
    (event: GeoJSON.Feature) => {
      if (Date.now() < blockLongPressUntilRef.current) {
        return;
      }

      openMarkerSheet(createPointDraft(areaId, pointFromLongPress(event)));
    },
    [areaId, openMarkerSheet]
  );

  const handlePressFeature = useCallback(
    (feature: AreaFeatureListItem) => {
      if (
        markerEditNavigationLockedRef.current ||
        Date.now() < blockFeaturePressUntilRef.current
      ) {
        return;
      }

      markerEditNavigationLockedRef.current = true;
      blockLongPressUntilRef.current = Date.now() + 500;
      blockFeaturePressUntilRef.current = Date.now() + FEATURE_PRESS_LOCK_MS;

      const draftId = saveAreaFeatureDraft(createFeatureDraft(areaId, feature));
      router.push(`/area/${areaId}/marker?draftId=${draftId}`);
    },
    [areaId, router]
  );

  const handleStartDraggingFeature = useCallback(() => {
    blockLongPressUntilRef.current = Date.now() + DRAG_GESTURE_LOCK_MS;
    blockFeaturePressUntilRef.current = Date.now() + DRAG_GESTURE_LOCK_MS;
    Vibration.vibrate(8);
  }, []);

  const clearDraggedPointOverrideLater = useCallback((featureKey: string) => {
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
  }, []);

  const handleDropFeature = useCallback(
    async (feature: AreaFeatureListItem, point: LatLngPoint) => {
      blockLongPressUntilRef.current = Date.now() + DROP_GESTURE_LOCK_MS;
      blockFeaturePressUntilRef.current = Date.now() + DROP_GESTURE_LOCK_MS;

      const featureKey = getAreaFeatureTargetKey(feature);
      setDraggedPointOverrides((current) => ({ ...current, [featureKey]: point }));

      try {
        await saveFeature({
          ...(feature.source === "feature"
            ? { featureId: feature.id as Id<"areaFeatures"> }
            : { legacyPointId: feature.id as Id<"areaPoints"> }),
          name: feature.name,
          description: feature.description,
          category: feature.category,
          color: feature.color,
          geometryType: "point",
          point,
          imageFileIds: feature.images.map((image) => image.fileId),
        });

        clearDraggedPointOverrideLater(featureKey);
      } catch (error) {
        console.error("Failed to move area marker:", error);
        setDraggedPointOverrides((current) => {
          const next = { ...current };
          delete next[featureKey];
          return next;
        });
        Alert.alert("Kunde inte flytta markören", "Försök igen om en stund.");
      }
    },
    [clearDraggedPointOverrideLater, saveFeature]
  );

  return {
    draggedPointOverrides,
    handleDropFeature,
    handleMapLongPress,
    handlePressFeature,
    handleStartDraggingFeature,
    resetMarkerGestureLocks,
  };
}
