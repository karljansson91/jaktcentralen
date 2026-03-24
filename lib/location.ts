import * as Location from 'expo-location';

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
