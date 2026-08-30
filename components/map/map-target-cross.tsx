import { APP_COLORS } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

type MapTargetCrossProps = {
  accessibilityLabel?: string;
};

export function MapTargetCross({ accessibilityLabel }: MapTargetCrossProps) {
  return (
    <View
      accessible={Boolean(accessibilityLabel)}
      accessibilityLabel={accessibilityLabel}
      pointerEvents="none"
      style={styles.container}
    >
      <Ionicons name="close" size={20} color="rgba(255, 255, 255, 0.96)" />
      <Ionicons name="close" size={15} color={APP_COLORS.text} style={styles.foreground} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
  foreground: {
    position: 'absolute',
  },
});
