import { Text } from '@/components/ui';
import { normalizeMapHeading } from '@/lib/map-heading';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View, type TextStyle, type ViewStyle } from 'react-native';

const COMPASS_TICKS = Array.from({ length: 24 }, (_, index) => index * 15);
const HEADING_LABELS = ['N', 'NO', 'O', 'SO', 'S', 'SV', 'V', 'NV'] as const;
const COMPASS_SIZE = 44;

function getHeadingLabel(heading: number) {
  return HEADING_LABELS[Math.round(normalizeMapHeading(heading) / 45) % HEADING_LABELS.length];
}

export function NorthCompassButton({
  heading,
  onPress,
}: {
  heading: number;
  onPress: () => void;
}) {
  const normalizedHeading = normalizeMapHeading(heading);
  const headingLabel = getHeadingLabel(normalizedHeading);

  return (
    <Pressable
      accessibilityLabel={`Norr upp. Riktning ${headingLabel}`}
      accessibilityRole="button"
      hitSlop={8}
      onPress={onPress}
      style={styles.compassButton}>
      <View style={styles.compassDial}>
        {COMPASS_TICKS.map((degrees, index) => (
          <View
            key={degrees}
            style={[styles.compassTickRing, { transform: [{ rotate: `${degrees}deg` }] }]}>
            <View style={index % 6 === 0 ? styles.compassMajorTick : styles.compassTick} />
          </View>
        ))}
        <View
          style={[
            styles.compassNorthNeedle,
            { transform: [{ rotate: `${-normalizedHeading}deg` }] },
          ]}>
          <Ionicons
            accessibilityElementsHidden
            importantForAccessibility="no"
            name="caret-up"
            size={15}
            color="#FF4B4B"
            style={styles.compassNorthNeedleIcon}
          />
        </View>
        <Text style={styles.compassHeadingText}>{headingLabel}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  compassButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(19, 23, 37, 0.92)',
    borderColor: 'rgba(143, 232, 165, 0.58)',
    borderRadius: 22,
    borderWidth: 1,
    height: COMPASS_SIZE,
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    width: COMPASS_SIZE,
  } satisfies ViewStyle,
  compassDial: {
    alignItems: 'center',
    backgroundColor: 'rgba(17, 20, 38, 0.98)',
    borderColor: 'rgba(112, 92, 207, 0.7)',
    borderRadius: 19,
    borderWidth: 2,
    height: 38,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 38,
  } satisfies ViewStyle,
  compassHeadingText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 19,
    textShadowColor: 'rgba(0, 0, 0, 0.42)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  } satisfies TextStyle,
  compassMajorTick: {
    backgroundColor: 'rgba(255, 255, 255, 0.68)',
    borderRadius: 999,
    height: 7,
    width: 1.5,
  } satisfies ViewStyle,
  compassNorthNeedle: {
    alignItems: 'center',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  } satisfies ViewStyle,
  compassNorthNeedleIcon: {
    transform: [{ translateY: -2 }],
  } satisfies TextStyle,
  compassTick: {
    backgroundColor: 'rgba(255, 255, 255, 0.32)',
    borderRadius: 999,
    height: 5,
    width: 1,
  } satisfies ViewStyle,
  compassTickRing: {
    alignItems: 'center',
    bottom: 0,
    left: 0,
    paddingTop: 4,
    position: 'absolute',
    right: 0,
    top: 0,
  } satisfies ViewStyle,
});
