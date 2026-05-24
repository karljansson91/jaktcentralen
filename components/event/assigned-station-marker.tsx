import { Text } from '@/components/ui';
import { APP_COLORS } from '@/lib/theme';
import { MarkerView } from '@rnmapbox/maps';
import { Pressable, StyleSheet, View } from 'react-native';

export type AssignedStationMarkerItem = {
  coordinates: [number, number];
  initials: string;
  targetKey: string;
};

type AssignedStationMarkerProps = {
  marker: AssignedStationMarkerItem;
  onPress: (targetKey: string) => void;
};

export function AssignedStationMarker({ marker, onPress }: AssignedStationMarkerProps) {
  return (
    <MarkerView
      key={marker.targetKey}
      coordinate={marker.coordinates}
      anchor={{ x: 0.5, y: 1 }}
      allowOverlap
      allowOverlapWithPuck>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Öppna tilldelning för ${marker.initials}`}
        onPress={() => onPress(marker.targetKey)}
        style={styles.assignedStationPin}>
        <View style={styles.assignedStationPinHeadOutline} />
        <View style={styles.assignedStationPinTailOutline} />
        <View style={styles.assignedStationPinHead} />
        <View style={styles.assignedStationPinTail} />
        <Text style={styles.assignedStationPinText}>
          {marker.initials}
        </Text>
      </Pressable>
    </MarkerView>
  );
}

const styles = StyleSheet.create({
  assignedStationPin: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'flex-start',
    width: 34,
  },
  assignedStationPinHead: {
    backgroundColor: APP_COLORS.primary,
    borderRadius: 13,
    height: 26,
    position: 'absolute',
    top: 2,
    width: 26,
  },
  assignedStationPinHeadOutline: {
    backgroundColor: APP_COLORS.surface,
    borderRadius: 15,
    height: 30,
    position: 'absolute',
    top: 0,
    width: 30,
  },
  assignedStationPinTail: {
    borderLeftColor: 'transparent',
    borderLeftWidth: 8,
    borderRightColor: 'transparent',
    borderRightWidth: 8,
    borderTopColor: APP_COLORS.primary,
    borderTopWidth: 12,
    height: 0,
    position: 'absolute',
    top: 24,
    width: 0,
  },
  assignedStationPinTailOutline: {
    borderLeftColor: 'transparent',
    borderLeftWidth: 10,
    borderRightColor: 'transparent',
    borderRightWidth: 10,
    borderTopColor: APP_COLORS.surface,
    borderTopWidth: 15,
    height: 0,
    position: 'absolute',
    top: 23,
    width: 0,
  },
  assignedStationPinText: {
    color: APP_COLORS.surface,
    fontSize: 10,
    fontWeight: '800',
    lineHeight: 26,
    textAlign: 'center',
    width: 30,
  },
});
