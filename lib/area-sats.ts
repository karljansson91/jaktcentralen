import { Id } from "@/convex/_generated/dataModel";
import type { AreaFeatureListItem } from "@/lib/area-features";
import type { LatLngPoint } from "@/lib/geo";
import { isPointInPolygon } from "@/lib/geo";

export const AREA_SAT_COLOR_PALETTE = [
  "#2f7d46",
  "#3b82f6",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#14b8a6",
] as const;

export type AreaSatListItem = {
  id: Id<"areaSats">;
  areaId: Id<"areas">;
  color: string;
  name: string;
  polygon: LatLngPoint[];
};

export type AreaSatDraft = {
  areaId: Id<"areas">;
  color: string;
  hasUnsavedChanges?: boolean;
  name: string;
  polygon?: LatLngPoint[];
  satId?: Id<"areaSats">;
};

export function getDefaultAreaSatColor(index = 0) {
  return AREA_SAT_COLOR_PALETTE[index % AREA_SAT_COLOR_PALETTE.length];
}

export function getPassMarkersInsideSat(
  sat: Pick<AreaSatListItem, "polygon">,
  features: AreaFeatureListItem[]
) {
  return features.filter(
    (feature) =>
      feature.category === "pass" && isPointInPolygon(feature.point, sat.polygon)
  );
}
