import { Text } from '@/components/ui';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

const EARTH_CIRCUMFERENCE_METERS = 40_075_016.686;
const MAPBOX_TILE_SIZE = 512;
const MAX_SCALE_WIDTH = 76;
const MIN_SCALE_WIDTH = 28;
const NICE_DISTANCE_STEPS = [1, 2, 5] as const;

function getMetersPerPoint(latitude: number, zoom: number) {
  const latitudeRadians = (latitude * Math.PI) / 180;
  return (
    (EARTH_CIRCUMFERENCE_METERS * Math.cos(latitudeRadians)) /
    (MAPBOX_TILE_SIZE * 2 ** zoom)
  );
}

function getNiceDistanceMeters(maxDistanceMeters: number) {
  if (!Number.isFinite(maxDistanceMeters) || maxDistanceMeters <= 0) {
    return null;
  }

  const exponent = Math.floor(Math.log10(maxDistanceMeters));
  const magnitude = 10 ** exponent;

  for (let index = NICE_DISTANCE_STEPS.length - 1; index >= 0; index -= 1) {
    const distance = NICE_DISTANCE_STEPS[index] * magnitude;
    if (distance <= maxDistanceMeters) {
      return distance;
    }
  }

  return magnitude / 2;
}

function formatScaleDistance(distanceMeters: number) {
  if (distanceMeters >= 1000) {
    const kilometers = distanceMeters / 1000;
    return Number.isInteger(kilometers) ? `${kilometers} km` : `${kilometers.toFixed(1)} km`;
  }

  return `${Math.round(distanceMeters)} m`;
}

export function MapScaleBar({
  latitude,
  style,
  zoom,
}: {
  latitude: number;
  style?: StyleProp<ViewStyle>;
  zoom: number;
}) {
  const metersPerPoint = getMetersPerPoint(latitude, zoom);
  const distanceMeters = getNiceDistanceMeters(metersPerPoint * MAX_SCALE_WIDTH);

  if (!distanceMeters || !Number.isFinite(metersPerPoint) || metersPerPoint <= 0) {
    return null;
  }

  const width = Math.max(MIN_SCALE_WIDTH, distanceMeters / metersPerPoint);

  return (
    <View pointerEvents="none" style={[styles.container, style]}>
      <View style={[styles.scaleLine, { width }]} />
      <Text style={styles.label}>{formatScaleDistance(distanceMeters)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-start',
    gap: 3,
    position: 'absolute',
  } satisfies ViewStyle,
  label: {
    color: '#0F172A',
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 12,
    textShadowColor: 'rgba(255, 255, 255, 0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  scaleLine: {
    borderBottomColor: '#0F172A',
    borderBottomWidth: 2,
    borderLeftColor: '#0F172A',
    borderLeftWidth: 2,
    borderRightColor: '#0F172A',
    borderRightWidth: 2,
    height: 7,
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.75,
    shadowRadius: 1,
  } satisfies ViewStyle,
});
