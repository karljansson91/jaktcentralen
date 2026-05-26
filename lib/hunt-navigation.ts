export type Coordinate = [number, number];

export type AssignmentTrail = {
  endCoordinate: Coordinate;
  startCoordinate: Coordinate;
  targetKey: string;
};

export type AssignmentTrailMode = 'walking' | 'direct';

export type AssignmentRoute = {
  coordinates: Coordinate[];
  distanceMeters: number;
  durationSeconds: number;
  mode: AssignmentTrailMode;
};

type MapboxDirectionsResponse = {
  code?: string;
  message?: string;
  routes?: {
    distance?: number;
    duration?: number;
    geometry?: {
      coordinates?: Coordinate[];
      type?: string;
    };
  }[];
};

export const HUNT_WALKING_SPEED_MPS = 1.1;

function toCoordinateKey(coordinate: Coordinate) {
  return `${coordinate[0].toFixed(5)},${coordinate[1].toFixed(5)}`;
}

function toDirectionsCoordinate(coordinate: Coordinate) {
  return `${coordinate[0]},${coordinate[1]}`;
}

function getDistanceMeters(from: Coordinate, to: Coordinate) {
  const earthRadiusMeters = 6_371_000;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const deltaLatitude = toRadians(to[1] - from[1]);
  const deltaLongitude = toRadians(to[0] - from[0]);
  const fromLatitude = toRadians(from[1]);
  const toLatitude = toRadians(to[1]);
  const haversine =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(fromLatitude) * Math.cos(toLatitude) * Math.sin(deltaLongitude / 2) ** 2;

  return 2 * earthRadiusMeters * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

export function buildAssignmentTrailKey(trail: AssignmentTrail) {
  return [
    trail.targetKey,
    toCoordinateKey(trail.startCoordinate),
    toCoordinateKey(trail.endCoordinate),
  ].join(':');
}

export function buildDirectAssignmentRoute(trail: AssignmentTrail): AssignmentRoute {
  const distanceMeters = getDistanceMeters(trail.startCoordinate, trail.endCoordinate);

  return {
    coordinates: [trail.startCoordinate, trail.endCoordinate],
    distanceMeters,
    durationSeconds: distanceMeters / HUNT_WALKING_SPEED_MPS,
    mode: 'direct',
  };
}

export async function fetchWalkingAssignmentRoute(
  trail: AssignmentTrail,
  signal: AbortSignal
): Promise<AssignmentRoute> {
  const accessToken = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error('Mapbox token saknas.');
  }

  const coordinates = `${toDirectionsCoordinate(trail.startCoordinate)};${toDirectionsCoordinate(
    trail.endCoordinate
  )}`;
  const params = new URLSearchParams({
    access_token: accessToken,
    geometries: 'geojson',
    overview: 'full',
    steps: 'false',
    walking_speed: String(HUNT_WALKING_SPEED_MPS),
  });
  const response = await fetch(
    `https://api.mapbox.com/directions/v5/mapbox/walking/${coordinates}?${params.toString()}`,
    { signal }
  );
  const body = (await response.json()) as MapboxDirectionsResponse;

  if (!response.ok || body.code !== 'Ok') {
    throw new Error(body.message || 'Kunde inte beräkna gångväg.');
  }

  const route = body.routes?.[0];
  const routeCoordinates = route?.geometry?.coordinates;

  if (
    !route ||
    route.geometry?.type !== 'LineString' ||
    !Array.isArray(routeCoordinates) ||
    routeCoordinates.length < 2 ||
    typeof route.distance !== 'number' ||
    typeof route.duration !== 'number'
  ) {
    throw new Error('Mapbox gav ingen användbar gångväg.');
  }

  return {
    coordinates: routeCoordinates,
    distanceMeters: route.distance,
    durationSeconds: route.duration,
    mode: 'walking',
  };
}

export function buildAssignmentRouteGeoJSON(route: AssignmentRoute | null) {
  if (!route) return null;

  return {
    type: 'Feature' as const,
    properties: {},
    geometry: {
      type: 'LineString' as const,
      coordinates: route.coordinates,
    },
  };
}

export function formatTrailDistance(distanceMeters: number) {
  if (distanceMeters < 950) {
    return `${Math.max(10, Math.round(distanceMeters / 10) * 10)} m`;
  }

  const kilometers = distanceMeters / 1000;
  const decimals = kilometers < 10 ? 1 : 0;
  return `${kilometers.toFixed(decimals).replace('.', ',')} km`;
}

export function formatTrailDuration(durationSeconds: number) {
  const minutes = Math.max(1, Math.round(durationSeconds / 60));

  if (minutes < 60) {
    return `ca ${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `ca ${hours} h ${remainingMinutes} min` : `ca ${hours} h`;
}
