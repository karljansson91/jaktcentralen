import { GlassSurface } from '@/components/glass';
import { Button, Text } from '@/components/ui';
import {
  ANIMAL_SIGHTING_OPTIONS,
  type AnimalSightingType,
} from '@/lib/animal-sightings';
import { APP_COLORS } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';

type AnimalSightingPickerProps = {
  disabled?: boolean;
  onCancel: () => void;
  onSelect: (animal: AnimalSightingType) => void;
};

export function AnimalSightingPicker({
  disabled = false,
  onCancel,
  onSelect,
}: AnimalSightingPickerProps) {
  return (
    <GlassSurface
      className="rounded-[28px]"
      contentClassName="gap-3 px-4 py-4"
      fallbackIntensity={86}>
      <View className="flex-row items-center justify-between gap-3">
        <Text className="text-base font-semibold text-foreground">Vad såg du?</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Stäng observation"
          disabled={disabled}
          onPress={onCancel}
          className="size-9 items-center justify-center rounded-full bg-background/70">
          <Ionicons name="close" size={18} color={APP_COLORS.text} />
        </Pressable>
      </View>

      <View className="flex-row flex-wrap gap-2">
        {ANIMAL_SIGHTING_OPTIONS.map((option) => (
          <Button
            key={option.value}
            variant="outline"
            size="sm"
            disabled={disabled}
            onPress={() => onSelect(option.value)}
            className="rounded-full border-white/60 bg-background/80 px-4">
            <View className="size-2.5 rounded-full" style={{ backgroundColor: option.color }} />
            <Text>{option.label}</Text>
          </Button>
        ))}
      </View>
    </GlassSurface>
  );
}
