import * as Location from 'expo-location';

export type LastKnownUserPosition = {
  latitude: number;
  longitude: number;
  timestamp: number;
};

export async function getLastKnownUserPosition(): Promise<LastKnownUserPosition | null> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    return null;
  }

  const position = await Location.getLastKnownPositionAsync();
  if (!position) {
    return null;
  }

  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    timestamp: position.timestamp,
  };
}

export async function getCurrentUserCoordinate(): Promise<[number, number] | null> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    return null;
  }

  const lastKnown = await Location.getLastKnownPositionAsync();
  if (lastKnown) {
    return [lastKnown.coords.longitude, lastKnown.coords.latitude];
  }

  const current = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  return [current.coords.longitude, current.coords.latitude];
}
