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

const ASSIGNED_PIN_COLOR = APP_COLORS.text;

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
        <View style={styles.assignedStationPinShape} />
        <View style={styles.assignedStationPinFace}>
          <Text style={styles.assignedStationPinText}>{marker.initials}</Text>
        </View>
      </Pressable>
    </MarkerView>
  );
}

const styles = StyleSheet.create({
  assignedStationPin: {
    alignItems: 'center',
    height: 50,
    justifyContent: 'flex-start',
    width: 44,
  },
  assignedStationPinFace: {
    alignItems: 'center',
    backgroundColor: ASSIGNED_PIN_COLOR,
    borderRadius: 13,
    height: 26,
    justifyContent: 'center',
    position: 'absolute',
    top: 7,
    width: 26,
  },
  assignedStationPinShape: {
    backgroundColor: ASSIGNED_PIN_COLOR,
    borderColor: APP_COLORS.surface,
    borderRadius: 19,
    borderBottomRightRadius: 5,
    borderWidth: 3,
    boxShadow: '0 7px 16px rgba(49, 52, 68, 0.24)',
    height: 38,
    position: 'absolute',
    top: 0,
    transform: [{ rotate: '45deg' }],
    width: 38,
  },
  assignedStationPinText: {
    color: APP_COLORS.surface,
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 14,
    textAlign: 'center',
  },
});
