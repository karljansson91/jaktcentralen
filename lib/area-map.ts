import type { LatLngPoint, LngLat } from '@/lib/geo';

export type AreaMapCameraBounds = {
  ne: LngLat;
  paddingBottom: number;
  paddingLeft: number;
  paddingRight: number;
  paddingTop: number;
  sw: LngLat;
};

type AreaMapInput = {
  polygon: LatLngPoint[];
};

type AreaMapCameraPadding = {
  bottom: number;
  left: number;
  right: number;
  top: number;
};

export function buildAreaPolygonFeature(area: AreaMapInput): GeoJSON.Feature<GeoJSON.Polygon> | null {
  if (area.polygon.length < 3) {
    return null;
  }

  const coords = area.polygon.map((point) => [point.longitude, point.latitude] as LngLat);

  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: [[...coords, coords[0]]],
    },
  };
}

export function getAreaCameraBounds(
  area: AreaMapInput,
  padding: AreaMapCameraPadding
): AreaMapCameraBounds | null {
  if (area.polygon.length < 2) {
    return null;
  }

  const lngs = area.polygon.map((point) => point.longitude);
  const lats = area.polygon.map((point) => point.latitude);

  return {
    ne: [Math.max(...lngs), Math.max(...lats)],
    sw: [Math.min(...lngs), Math.min(...lats)],
    paddingTop: padding.top,
    paddingBottom: padding.bottom,
    paddingLeft: padding.left,
    paddingRight: padding.right,
  };
}
