import type { AreaFeatureListItem } from "@/lib/area-features";
import { getAreaFeatureTargetKey } from "@/lib/area-features";
import type { AreaSatListItem } from "@/lib/area-sats";
import { getPassMarkersInsideSat } from "@/lib/area-sats";
import { useMemo } from "react";

type SatSetup = {
  activeSat: AreaSatListItem | null;
  selectedTargetKeys: string[];
} | null | undefined;

type ActiveSatMapStateArgs = {
  areaFeatures: AreaFeatureListItem[] | undefined;
  areaSats: AreaSatListItem[] | undefined;
  isEndedHunt: boolean;
  satSetup: SatSetup;
  showOtherPassMarkers: boolean;
};

export function useActiveSatMapState({
  areaFeatures,
  areaSats,
  isEndedHunt,
  satSetup,
  showOtherPassMarkers,
}: ActiveSatMapStateArgs) {
  const activeSat = !isEndedHunt ? satSetup?.activeSat ?? null : null;
  const selectedPassTargetKeys = useMemo(
    () => new Set(!isEndedHunt ? satSetup?.selectedTargetKeys ?? [] : []),
    [isEndedHunt, satSetup?.selectedTargetKeys]
  );
  const activeSatPassTargetKeys = useMemo(() => {
    if (!activeSat || !areaFeatures) {
      return new Set<string>();
    }

    return new Set(
      getPassMarkersInsideSat(activeSat, areaFeatures).map(getAreaFeatureTargetKey)
    );
  }, [activeSat, areaFeatures]);

  const visibleAreaSats = useMemo(() => {
    if (isEndedHunt || !areaSats) {
      return [];
    }
    return activeSat ? [activeSat] : areaSats;
  }, [activeSat, areaSats, isEndedHunt]);

  const visibleAreaFeatures = useMemo(() => {
    if (!areaFeatures) {
      return null;
    }
    if (!activeSat) {
      return areaFeatures;
    }

    return areaFeatures.filter((feature) => {
      if (feature.category !== "pass") {
        return true;
      }

      const targetKey = getAreaFeatureTargetKey(feature);
      return selectedPassTargetKeys.has(targetKey) || showOtherPassMarkers;
    });
  }, [activeSat, areaFeatures, selectedPassTargetKeys, showOtherPassMarkers]);

  const featurePointStates = useMemo(() => {
    const states: Record<string, "active" | "muted"> = {};
    if (!activeSat || !areaFeatures) {
      return states;
    }

    for (const feature of areaFeatures) {
      if (feature.category !== "pass") {
        continue;
      }
      const targetKey = getAreaFeatureTargetKey(feature);
      if (selectedPassTargetKeys.has(targetKey)) {
        states[targetKey] = "active";
      } else if (activeSatPassTargetKeys.has(targetKey)) {
        states[targetKey] = "muted";
      }
    }

    return states;
  }, [activeSat, activeSatPassTargetKeys, areaFeatures, selectedPassTargetKeys]);

  return {
    activeSat,
    activeSatPassTargetKeys,
    featurePointStates,
    selectedPassTargetKeys,
    visibleAreaFeatures,
    visibleAreaSats,
  };
}
