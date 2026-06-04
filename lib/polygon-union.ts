import type { LatLngPoint } from '@/lib/area-features';
import { union, type MultiPolygon, type Ring } from 'polygon-clipping';

const CLOSE_EPSILON = 1e-12;

function toRing(points: LatLngPoint[]): Ring {
  const ring = points.map((point) => [point.longitude, point.latitude] as [number, number]);
  const first = ring[0];
  const last = ring[ring.length - 1];

  if (
    first &&
    last &&
    (Math.abs(first[0] - last[0]) > CLOSE_EPSILON ||
      Math.abs(first[1] - last[1]) > CLOSE_EPSILON)
  ) {
    ring.push(first);
  }

  return ring;
}

function fromRing(ring: Ring): LatLngPoint[] {
  const openRing =
    ring.length > 1 &&
    Math.abs(ring[0][0] - ring[ring.length - 1][0]) <= CLOSE_EPSILON &&
    Math.abs(ring[0][1] - ring[ring.length - 1][1]) <= CLOSE_EPSILON
      ? ring.slice(0, -1)
      : ring;

  return openRing.map(([longitude, latitude]) => ({ latitude, longitude }));
}

function signedArea(ring: Ring) {
  let area = 0;
  for (let index = 0; index < ring.length; index += 1) {
    const current = ring[index];
    const next = ring[(index + 1) % ring.length];
    area += current[0] * next[1] - next[0] * current[1];
  }
  return area / 2;
}

function cross(origin: Ring[number], a: Ring[number], b: Ring[number]) {
  return (a[0] - origin[0]) * (b[1] - origin[1]) - (a[1] - origin[1]) * (b[0] - origin[0]);
}

function convexHull(points: Ring): Ring {
  const sorted = Array.from(
    new Map(points.map((point) => [`${point[0]},${point[1]}`, point])).values()
  ).sort((a, b) => (a[0] === b[0] ? a[1] - b[1] : a[0] - b[0]));

  if (sorted.length <= 3) {
    return sorted;
  }

  const lower: Ring = [];
  for (const point of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0) {
      lower.pop();
    }
    lower.push(point);
  }

  const upper: Ring = [];
  for (let index = sorted.length - 1; index >= 0; index -= 1) {
    const point = sorted[index];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0) {
      upper.pop();
    }
    upper.push(point);
  }

  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

function largestOuterRing(multiPolygon: MultiPolygon): Ring | null {
  let largest: Ring | null = null;
  let largestArea = 0;

  for (const polygon of multiPolygon) {
    const outerRing = polygon[0];
    if (!outerRing) {
      continue;
    }

    const area = Math.abs(signedArea(outerRing));
    if (area > largestArea) {
      largest = outerRing;
      largestArea = area;
    }
  }

  return largest;
}

export function unionLatLngPolygons(
  currentPolygon: LatLngPoint[],
  nextPolygon: LatLngPoint[]
): LatLngPoint[] {
  if (currentPolygon.length < 3) {
    return nextPolygon;
  }
  if (nextPolygon.length < 3) {
    return currentPolygon;
  }

  const currentRing = toRing(currentPolygon);
  const nextRing = toRing(nextPolygon);
  let result: MultiPolygon;
  try {
    result = union([currentRing], [nextRing]);
  } catch {
    return fromRing(convexHull([...currentRing, ...nextRing]));
  }
  if (result.length === 0) {
    return currentPolygon;
  }

  if (result.length > 1) {
    return fromRing(convexHull(result.flatMap((polygon) => polygon[0] ?? [])));
  }

  const largest = largestOuterRing(result);
  return largest ? fromRing(largest) : currentPolygon;
}
