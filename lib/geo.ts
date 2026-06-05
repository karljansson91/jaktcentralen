export type LngLat = [number, number];

export type LatLngPoint = {
  latitude: number;
  longitude: number;
};

const EARTH_RADIUS_METERS = 6_371_000;

function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

export function distanceMeters(a: LatLngPoint, b: LatLngPoint) {
  const deltaLatitude = toRadians(b.latitude - a.latitude);
  const deltaLongitude = toRadians(b.longitude - a.longitude);
  const latitudeA = toRadians(a.latitude);
  const latitudeB = toRadians(b.latitude);

  const haversine =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(latitudeA) *
      Math.cos(latitudeB) *
      Math.sin(deltaLongitude / 2) ** 2;

  return (
    2 *
    EARTH_RADIUS_METERS *
    Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
  );
}

const POINT_ON_SEGMENT_EPSILON = 1e-10;

function isPointOnSegment(point: LatLngPoint, a: LatLngPoint, b: LatLngPoint) {
  const cross =
    (point.longitude - a.longitude) * (b.latitude - a.latitude) -
    (point.latitude - a.latitude) * (b.longitude - a.longitude);

  if (Math.abs(cross) > POINT_ON_SEGMENT_EPSILON) {
    return false;
  }

  return (
    point.longitude >= Math.min(a.longitude, b.longitude) - POINT_ON_SEGMENT_EPSILON &&
    point.longitude <= Math.max(a.longitude, b.longitude) + POINT_ON_SEGMENT_EPSILON &&
    point.latitude >= Math.min(a.latitude, b.latitude) - POINT_ON_SEGMENT_EPSILON &&
    point.latitude <= Math.max(a.latitude, b.latitude) + POINT_ON_SEGMENT_EPSILON
  );
}

export function isPointInPolygon(point: LatLngPoint, polygon: LatLngPoint[]) {
  if (polygon.length < 3) {
    return false;
  }

  let inside = false;

  for (let index = 0, previousIndex = polygon.length - 1; index < polygon.length; previousIndex = index++) {
    const current = polygon[index];
    const previous = polygon[previousIndex];

    if (isPointOnSegment(point, previous, current)) {
      return true;
    }

    const intersects =
      current.latitude > point.latitude !== previous.latitude > point.latitude &&
      point.longitude <
        ((previous.longitude - current.longitude) * (point.latitude - current.latitude)) /
          (previous.latitude - current.latitude) +
          current.longitude;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}
