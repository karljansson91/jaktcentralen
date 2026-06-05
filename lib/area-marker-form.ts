import {
  AreaFeatureCategory,
  AreaFeatureDraft,
  AreaFeatureGeometryType,
  AreaFeatureImage,
  getDefaultColorForCategory,
} from "@/lib/area-features";
import type { LatLngPoint } from "@/lib/geo";

export type MarkerFormValues = {
  name: string;
  description: string;
  category: AreaFeatureCategory;
  geometryType: AreaFeatureGeometryType;
  color: string;
  point?: LatLngPoint;
  images: AreaFeatureImage[];
};

export function getPlacementSummary(
  geometryType: AreaFeatureGeometryType,
  point?: LatLngPoint
) {
  if (!point) {
    return "Ingen punkt vald";
  }
  return `${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)}`;
}

export function getPointFallback(point?: LatLngPoint) {
  return point;
}

export function buildMarkerFormValues(draft?: AreaFeatureDraft): MarkerFormValues {
  return {
    name: draft?.name ?? "",
    description: draft?.description ?? "",
    category: draft?.category ?? "pass",
    geometryType: draft?.geometryType ?? "point",
    color: draft?.color ?? getDefaultColorForCategory(draft?.category ?? "pass"),
    point: draft?.point,
    images: draft?.images ?? [],
  };
}

function normalizeMarkerFormValues(values: MarkerFormValues) {
  return {
    ...values,
    point: values.point ?? null,
    images: values.images.map((image) => ({
      fileId: String(image.fileId),
      url: image.url,
    })),
  };
}

export function hasMarkerFormChanges(
  current: MarkerFormValues,
  initial: MarkerFormValues
) {
  return (
    JSON.stringify(normalizeMarkerFormValues(current)) !==
    JSON.stringify(normalizeMarkerFormValues(initial))
  );
}
