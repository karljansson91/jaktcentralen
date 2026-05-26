import { distanceMeters, type LatLngPoint } from '@/lib/geo';
import {
  fetchWalkingAssignmentRoute,
  HUNT_WALKING_SPEED_MPS,
  type AssignmentRoute,
  type Coordinate,
} from '@/lib/hunt-navigation';

export type HuntMapMeasurementPoint = {
  coordinate: Coordinate;
  id: string;
};

function toCoordinateKey(coordinate: Coordinate) {
  return `${coordinate[0].toFixed(5)},${coordinate[1].toFixed(5)}`;
}

export function toMeasurementRouteKey(points: HuntMapMeasurementPoint[]) {
  if (points.length < 2) {
    return null;
  }

  return points.map((point) => `${point.id}:${toCoordinateKey(point.coordinate)}`).join('|');
}

export function latLngPointToCoordinate(point: LatLngPoint): Coordinate {
  return [point.longitude, point.latitude];
}

function coordinateToLatLngPoint(coordinate: Coordinate): LatLngPoint {
  return { latitude: coordinate[1], longitude: coordinate[0] };
}

export function buildDirectMeasurementRoute(
  points: HuntMapMeasurementPoint[]
): AssignmentRoute | null {
  if (points.length < 2) {
    return null;
  }

  const distance = points.slice(1).reduce((totalDistance, point, index) => {
    const previousPoint = points[index];
    return (
      totalDistance +
      distanceMeters(
        coordinateToLatLngPoint(previousPoint.coordinate),
        coordinateToLatLngPoint(point.coordinate)
      )
    );
  }, 0);

  return {
    coordinates: points.map((point) => point.coordinate),
    distanceMeters: distance,
    durationSeconds: distance / HUNT_WALKING_SPEED_MPS,
    mode: 'direct',
  };
}

export async function fetchWalkingMeasurementRoute(
  points: HuntMapMeasurementPoint[],
  signal: AbortSignal
): Promise<AssignmentRoute> {
  const routes = await Promise.all(
    points.slice(1).map((point, index) =>
      fetchWalkingAssignmentRoute(
        {
          endCoordinate: point.coordinate,
          startCoordinate: points[index].coordinate,
          targetKey: `measurement:${index}`,
        },
        signal
      )
    )
  );

  return {
    coordinates: routes.flatMap((route, index) =>
      index === 0 ? route.coordinates : route.coordinates.slice(1)
    ),
    distanceMeters: routes.reduce((totalDistance, route) => totalDistance + route.distanceMeters, 0),
    durationSeconds: routes.reduce(
      (totalDuration, route) => totalDuration + route.durationSeconds,
      0
    ),
    mode: 'walking',
  };
}
