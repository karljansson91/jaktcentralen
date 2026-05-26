import type { LngLat } from '@/lib/geo';
import { normalizeDegrees } from '@/lib/wind-direction';

const EARTH_RADIUS_METERS = 6_371_000;
const DEFAULT_SEGMENTS = 10;

function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

function toDegrees(radians: number) {
  return (radians * 180) / Math.PI;
}

function coordinateAtBearing(origin: LngLat, bearingDegrees: number, distanceMeters: number): LngLat {
  const [longitude, latitude] = origin;
  const angularDistance = distanceMeters / EARTH_RADIUS_METERS;
  const bearing = toRadians(bearingDegrees);
  const latitudeRadians = toRadians(latitude);
  const longitudeRadians = toRadians(longitude);

  const nextLatitude = Math.asin(
    Math.sin(latitudeRadians) * Math.cos(angularDistance) +
      Math.cos(latitudeRadians) * Math.sin(angularDistance) * Math.cos(bearing)
  );
  const nextLongitude =
    longitudeRadians +
    Math.atan2(
      Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(latitudeRadians),
      Math.cos(angularDistance) - Math.sin(latitudeRadians) * Math.sin(nextLatitude)
    );

  return [toDegrees(nextLongitude), toDegrees(nextLatitude)];
}

export function bearingFromScreenSwipe(deltaX: number, deltaY: number) {
  return normalizeDegrees(toDegrees(Math.atan2(deltaX, -deltaY)));
}

export function createScentPlumeFeature({
  directionDegrees,
  lengthMeters,
  origin,
  spreadDegrees,
}: {
  directionDegrees: number;
  lengthMeters: number;
  origin: LngLat;
  spreadDegrees: number;
}): GeoJSON.Feature<GeoJSON.Polygon> {
  const startBearing = directionDegrees - spreadDegrees / 2;
  const step = spreadDegrees / DEFAULT_SEGMENTS;
  const arcCoordinates = Array.from({ length: DEFAULT_SEGMENTS + 1 }, (_, index) =>
    coordinateAtBearing(origin, startBearing + step * index, lengthMeters)
  );

  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: [[origin, ...arcCoordinates, origin]],
    },
  };
}
