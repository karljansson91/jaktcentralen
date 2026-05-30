import { GlassIconButton } from '@/components/glass';
import { APP_COLORS } from '@/lib/theme';
import { View } from 'react-native';

type HuntMapMeasurementControlsProps = {
  onClear: () => void;
  onUndo: () => void;
};

export function HuntMapMeasurementControls({
  onClear,
  onUndo,
}: HuntMapMeasurementControlsProps) {
  return (
    <View className="flex-row gap-3">
      <GlassIconButton
        accessibilityLabel="Ångra senaste mätpunkt"
        className="size-14"
        color={APP_COLORS.surface}
        icon="arrow-undo"
        iconSize={24}
        onPress={onUndo}
        overlayColor="rgba(49, 52, 68, 0.18)"
        surfaceClassName="size-14"
        tintColor="rgba(49, 52, 68, 0.82)"
        tone="dark"
      />
      <GlassIconButton
        accessibilityLabel="Rensa mätning"
        className="size-14"
        color={APP_COLORS.surface}
        icon="close"
        iconSize={24}
        onPress={onClear}
        overlayColor="rgba(49, 52, 68, 0.18)"
        surfaceClassName="size-14"
        tintColor="rgba(49, 52, 68, 0.82)"
        tone="dark"
      />
    </View>
  );
}
