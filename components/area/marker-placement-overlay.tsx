import { MapTargetCross } from '@/components/map/map-target-cross';
import { Button, Text } from '@/components/ui';
import { APP_COLORS } from '@/lib/theme';
import { ActivityIndicator, View } from 'react-native';

type MarkerPlacementOverlayProps = {
  bottomInset: number;
  isConfirming: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function MarkerPlacementOverlay({
  bottomInset,
  isConfirming,
  onCancel,
  onConfirm,
}: MarkerPlacementOverlayProps) {
  return (
    <View pointerEvents="box-none" className="absolute bottom-0 left-0 right-0 top-0">
      <View
        pointerEvents="none"
        className="absolute bottom-0 left-0 right-0 top-0 items-center justify-center"
      >
        <MapTargetCross accessibilityLabel="Vald position" />
      </View>

      <View
        className="absolute left-4 right-4 rounded-3xl border border-border bg-background/95 p-4 shadow-lg"
        style={{ bottom: bottomInset }}
      >
        <Text className="text-center font-semibold">Placera intressepunkt</Text>
        <Text className="mt-1 text-center text-sm text-muted-foreground">
          Flytta kartan tills krysset ligger rätt.
        </Text>
        <View className="mt-4 flex-row gap-3">
          <Button
            className="flex-1 rounded-2xl"
            disabled={isConfirming}
            onPress={onCancel}
            variant="outline"
          >
            <Text>Avbryt</Text>
          </Button>
          <Button
            className="flex-1 rounded-2xl"
            disabled={isConfirming}
            onPress={onConfirm}
          >
            {isConfirming ? (
              <ActivityIndicator color={APP_COLORS.surface} />
            ) : (
              <Text>Bekräfta</Text>
            )}
          </Button>
        </View>
      </View>
    </View>
  );
}
