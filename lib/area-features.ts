import { Id } from "@/convex/_generated/dataModel";

export const AREA_FEATURE_CATEGORY_LABELS = {
  pass: "Pass",
  parking: "Parkering",
  meeting: "Samlingsplats",
} as const;

const AREA_FEATURE_CATEGORY_COLORS = {
  pass: "#2f7d46",
  parking: "#6b7280",
  meeting: "#3b82f6",
} as const;

export const AREA_FEATURE_COLOR_PALETTE = [
  "#2f7d46",
  "#6b7280",
  "#3b82f6",
  "#f59e0b",
  "#ef4444",
  "#10b981",
  "#14b8a6",
  "#ec4899",
] as const;

export type AreaFeatureCategory = keyof typeof AREA_FEATURE_CATEGORY_LABELS;
export type AreaFeatureGeometryType = "point";

export type LatLngPoint = {
  latitude: number;
  longitude: number;
};

export type AreaFeatureImage = {
  fileId: Id<"_storage">;
  url: string;
};

export type AreaFeatureListItem = {
  id: Id<"areaFeatures">;
  name: string;
  description?: string;
  category: AreaFeatureCategory;
  color: string;
  geometryType: AreaFeatureGeometryType;
  point: LatLngPoint;
  images: AreaFeatureImage[];
  imageUrls: string[];
};

export type AreaFeatureDraft = {
  mode: "create" | "edit";
  areaId: Id<"areas">;
  featureId?: Id<"areaFeatures">;
  hasUnsavedChanges?: boolean;
  category: AreaFeatureCategory;
  geometryType: AreaFeatureGeometryType;
  name: string;
  description: string;
  color: string;
  point?: LatLngPoint;
  images: AreaFeatureImage[];
};

export function getDefaultColorForCategory(category: AreaFeatureCategory) {
  return AREA_FEATURE_CATEGORY_COLORS[category];
}

export function areaFeaturePointToLngLat(point: LatLngPoint): [number, number] {
  return [point.longitude, point.latitude];
}

export function polygonCentroid(points: LatLngPoint[]): [number, number] {
  if (points.length === 0) {
    return [0, 0];
  }

  const total = points.reduce(
    (acc, point) => {
      acc.longitude += point.longitude;
      acc.latitude += point.latitude;
      return acc;
    },
    { longitude: 0, latitude: 0 }
  );

  return [total.longitude / points.length, total.latitude / points.length];
}

export function getAreaFeatureTargetKey(feature: Pick<AreaFeatureListItem, "id">) {
  return String(feature.id);
}
