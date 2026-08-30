import { AnimalSightingIcon } from '@/components/event/animal-sighting-icon';
import { Text } from '@/components/ui';
import {
  ESCAPE_DIRECTION_OPTIONS,
  FOLLOW_UP_RESOLUTION_OPTIONS,
  getShotSpeciesAnimal,
  SHOT_REPORT_RESULT_OPTIONS,
  type FollowUpResolution,
  type ShotReportResult,
  type ShotSpeciesOption,
} from '@/lib/shot-reports';
import { APP_COLORS } from '@/lib/theme';
import { Pressable, View } from 'react-native';

type SelectionTileProps = {
  compact?: boolean;
  icon?: React.ReactNode;
  label: string;
  onPress: () => void;
  selected: boolean;
};

export function SelectionTile({
  compact = false,
  icon,
  label,
  onPress,
  selected,
}: SelectionTileProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      className={`flex-1 flex-row items-center justify-center gap-2 rounded-2xl border px-3 active:bg-accent ${
        compact ? 'min-h-12 py-2' : 'min-h-14 py-3'
      } ${selected ? 'border-primary bg-primary/10' : 'border-border bg-card'}`}
      onPress={onPress}>
      {icon}
      <Text className={`text-center font-semibold ${selected ? 'text-primary' : ''}`}>
        {label}
      </Text>
    </Pressable>
  );
}

export function SpeciesChoices({
  onChange,
  options,
  value,
}: {
  onChange: (speciesId: string) => void;
  options: ShotSpeciesOption[];
  value: string | null;
}) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {options.map((species) => (
        <View key={species.id} className="w-[48.5%]">
          <SelectionTile
            icon={
              <AnimalSightingIcon
                animal={getShotSpeciesAnimal(species.id)}
                color={value === species.id ? APP_COLORS.primary : APP_COLORS.textMuted}
                size={25}
              />
            }
            label={species.label}
            onPress={() => onChange(species.id)}
            selected={value === species.id}
          />
        </View>
      ))}
    </View>
  );
}

export function ResultChoices({
  onChange,
  value,
}: {
  onChange: (result: ShotReportResult) => void;
  value: ShotReportResult | null;
}) {
  return (
    <View className="gap-2">
      {SHOT_REPORT_RESULT_OPTIONS.map((result) => (
        <SelectionTile
          key={result.value}
          icon={
            <View className="size-3 rounded-full" style={{ backgroundColor: result.color }} />
          }
          label={result.label}
          onPress={() => onChange(result.value)}
          selected={value === result.value}
        />
      ))}
    </View>
  );
}

export function DirectionChoices({
  onChange,
  value,
}: {
  onChange: (degrees: number) => void;
  value: number | null;
}) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {ESCAPE_DIRECTION_OPTIONS.map((direction) => (
        <View key={direction.degrees} className="w-[23%]">
          <SelectionTile
            compact
            label={direction.label}
            onPress={() => onChange(direction.degrees)}
            selected={value === direction.degrees}
          />
        </View>
      ))}
    </View>
  );
}

export function ResolutionChoices({
  onChange,
  value,
}: {
  onChange: (resolution: FollowUpResolution) => void;
  value: FollowUpResolution | null;
}) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {FOLLOW_UP_RESOLUTION_OPTIONS.map((resolution) => (
        <View key={resolution.value} className="w-[48.5%]">
          <SelectionTile
            compact
            label={resolution.label}
            onPress={() => onChange(resolution.value)}
            selected={value === resolution.value}
          />
        </View>
      ))}
    </View>
  );
}
