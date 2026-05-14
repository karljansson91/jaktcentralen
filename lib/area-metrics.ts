import type { LatLngPoint } from '@/lib/area-features';

const EARTH_RADIUS_METERS = 6_378_137;
const SQUARE_METERS_PER_HECTARE = 10_000;

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

export function calculatePolygonHectares(points: LatLngPoint[]) {
  if (points.length < 3) {
    return 0;
  }

  const meanLatitude =
    points.reduce((total, point) => total + point.latitude, 0) / points.length;
  const latitudeScale = Math.cos(toRadians(meanLatitude));
  const projectedPoints = points.map((point) => ({
    x: EARTH_RADIUS_METERS * toRadians(point.longitude) * latitudeScale,
    y: EARTH_RADIUS_METERS * toRadians(point.latitude),
  }));

  const twiceArea = projectedPoints.reduce((total, point, index) => {
    const next = projectedPoints[(index + 1) % projectedPoints.length];
    return total + point.x * next.y - next.x * point.y;
  }, 0);

  return Math.abs(twiceArea) / 2 / SQUARE_METERS_PER_HECTARE;
}

export function formatHectares(hectares: number) {
  if (!Number.isFinite(hectares) || hectares <= 0) {
    return '0 ha';
  }

  if (hectares < 0.1) {
    return '<0,1 ha';
  }

  if (hectares < 10) {
    return `${hectares.toFixed(1).replace('.', ',')} ha`;
  }

  return `${Math.round(hectares)} ha`;
}

export function formatInterestPointCount(count: number) {
  return count === 1 ? '1 intressepunkt' : `${count} intressepunkter`;
}

export function getPolygonCenter(points: LatLngPoint[]): LatLngPoint | undefined {
  if (points.length === 0) {
    return undefined;
  }

  const total = points.reduce(
    (acc, point) => ({
      latitude: acc.latitude + point.latitude,
      longitude: acc.longitude + point.longitude,
    }),
    { latitude: 0, longitude: 0 }
  );

  return {
    latitude: total.latitude / points.length,
    longitude: total.longitude / points.length,
  };
}
