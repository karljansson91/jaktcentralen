import { Id } from "@/convex/_generated/dataModel";

export const AREA_FEATURE_CATEGORY_LABELS = {
  tower: "Jaktorn",
  parking: "Parkering",
  meeting: "Samlingsplats",
  custom: "Anpassad",
} as const;

export const AREA_FEATURE_CATEGORY_COLORS = {
  tower: "#8b5cf6",
  parking: "#6b7280",
  meeting: "#3b82f6",
  custom: "#f59e0b",
} as const;

export const AREA_FEATURE_COLOR_PALETTE = [
  "#8b5cf6",
  "#6b7280",
  "#3b82f6",
  "#f59e0b",
  "#ef4444",
  "#10b981",
  "#14b8a6",
  "#ec4899",
] as const;

export type AreaFeatureCategory = keyof typeof AREA_FEATURE_CATEGORY_LABELS;
export type AreaFeatureGeometryType = "point" | "polygon";

export type LatLngPoint = {
  latitude: number;
  longitude: number;
};

export type AreaFeatureImage = {
  fileId: Id<"_storage">;
  url: string;
};

export type AreaFeatureListItem = {
  id: Id<"areaFeatures"> | Id<"areaPoints">;
  source: "feature" | "legacy";
  name: string;
  description?: string;
  category: AreaFeatureCategory;
  color: string;
  geometryType: AreaFeatureGeometryType;
  point?: LatLngPoint;
  polygon?: LatLngPoint[];
  images: AreaFeatureImage[];
  imageUrls: string[];
};

export type AreaFeatureDraft = {
  mode: "create" | "edit" | "legacy";
  areaId: Id<"areas">;
  featureId?: Id<"areaFeatures">;
  legacyPointId?: Id<"areaPoints">;
  category: AreaFeatureCategory;
  geometryType: AreaFeatureGeometryType;
  name: string;
  description: string;
  color: string;
  point?: LatLngPoint;
  polygon?: LatLngPoint[];
  images: AreaFeatureImage[];
};

export function getDefaultColorForCategory(category: AreaFeatureCategory) {
  return AREA_FEATURE_CATEGORY_COLORS[category];
}

export function areaFeaturePointToLngLat(point: LatLngPoint): [number, number] {
  return [point.longitude, point.latitude];
}

export function areaPolygonToBounds(points: LatLngPoint[]) {
  if (points.length < 2) {
    return null;
  }

  const lngs = points.map((point) => point.longitude);
  const lats = points.map((point) => point.latitude);

  return {
    ne: [Math.max(...lngs), Math.max(...lats)] as [number, number],
    sw: [Math.min(...lngs), Math.min(...lats)] as [number, number],
  };
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
