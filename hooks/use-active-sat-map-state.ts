import type { AreaFeatureListItem } from '@/lib/area-features';
import { getAreaFeatureTargetKey } from '@/lib/area-features';
import type { AreaSatListItem } from '@/lib/area-sats';
import { getPassMarkersInsideSat } from '@/lib/area-sats';
import { useMemo } from 'react';

type SatSetup =
  | {
      activeSat: AreaSatListItem | null;
      selectedTargetKeys: string[];
    }
  | null
  | undefined;

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
  const activeSat = !isEndedHunt ? (satSetup?.activeSat ?? null) : null;
  const selectedPassTargetKeys = new Set(!isEndedHunt ? (satSetup?.selectedTargetKeys ?? []) : []);
  const activeSatPassTargetKeys = (() => {
    if (!activeSat || !areaFeatures) {
      return new Set<string>();
    }

    return new Set(getPassMarkersInsideSat(activeSat, areaFeatures).map(getAreaFeatureTargetKey));
  })();

  const visibleAreaSats = (() => {
    if (isEndedHunt || !areaSats) {
      return [];
    }
    return activeSat ? [activeSat] : areaSats;
  })();

  const visibleAreaFeatures = (() => {
    if (!areaFeatures) {
      return null;
    }
    if (!activeSat) {
      return areaFeatures;
    }

    return areaFeatures.filter((feature) => {
      if (feature.category !== 'pass') {
        return true;
      }

      const targetKey = getAreaFeatureTargetKey(feature);
      return selectedPassTargetKeys.has(targetKey) || showOtherPassMarkers;
    });
  })();

  const featurePointStates = (() => {
    const states: Record<string, 'active' | 'muted'> = {};
    if (!activeSat || !areaFeatures) {
      return states;
    }

    for (const feature of areaFeatures) {
      if (feature.category !== 'pass') {
        continue;
      }
      const targetKey = getAreaFeatureTargetKey(feature);
      if (selectedPassTargetKeys.has(targetKey)) {
        states[targetKey] = 'active';
      } else if (activeSatPassTargetKeys.has(targetKey)) {
        states[targetKey] = 'muted';
      }
    }

    return states;
  })();

  return {
    activeSat,
    activeSatPassTargetKeys,
    featurePointStates,
    selectedPassTargetKeys,
    visibleAreaFeatures,
    visibleAreaSats,
  };
}
