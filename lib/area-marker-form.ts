import {
  AreaFeatureCategory,
  AreaFeatureDraft,
  AreaFeatureGeometryType,
  AreaFeatureImage,
  LatLngPoint,
  getDefaultColorForCategory,
} from "@/lib/area-features";

export type MarkerFormValues = {
  name: string;
  description: string;
  category: AreaFeatureCategory;
  geometryType: AreaFeatureGeometryType;
  color: string;
  point?: LatLngPoint;
  polygon?: LatLngPoint[];
  images: AreaFeatureImage[];
};

export function getPlacementSummary(
  geometryType: AreaFeatureGeometryType,
  point?: LatLngPoint,
  polygon?: LatLngPoint[]
) {
  if (geometryType === "point") {
    if (!point) {
      return "Ingen punkt vald";
    }
    return `${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)}`;
  }

  return polygon ? `${polygon.length} polygonpunkter` : "Ingen polygon vald";
}

export function getPointFallback(point?: LatLngPoint, polygon?: LatLngPoint[]) {
  return point ?? polygon?.[0];
}

export function getPolygonFallback(polygon?: LatLngPoint[], point?: LatLngPoint) {
  return polygon ?? (point ? [point] : undefined);
}

export function buildMarkerFormValues(draft?: AreaFeatureDraft): MarkerFormValues {
  return {
    name: draft?.name ?? "",
    description: draft?.description ?? "",
    category: draft?.category ?? "tower",
    geometryType: draft?.geometryType ?? "point",
    color: draft?.color ?? getDefaultColorForCategory(draft?.category ?? "tower"),
    point: draft?.point,
    polygon: draft?.polygon,
    images: draft?.images ?? [],
  };
}

function normalizeMarkerFormValues(values: MarkerFormValues) {
  return {
    ...values,
    point: values.point ?? null,
    polygon: values.polygon ?? null,
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
