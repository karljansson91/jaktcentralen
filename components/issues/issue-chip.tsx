import { Text } from '@/components/ui';
import { APP_COLORS } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';

type IssueChipProps<T extends string> = {
  label: string;
  onPress: (value: T) => void;
  selected: boolean;
  value: T;
};

export function IssueChip<T extends string>({
  label,
  onPress,
  selected,
  value,
}: IssueChipProps<T>) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      className={`min-h-10 flex-row items-center gap-2 rounded-full border px-4 ${
        selected ? 'border-primary bg-primary/10' : 'border-border bg-card'
      }`}
      onPress={() => onPress(value)}>
      {selected ? (
        <Ionicons name="checkmark" size={15} color={APP_COLORS.primary} />
      ) : null}
      <Text
        className={`text-sm font-semibold ${
          selected ? 'text-primary' : 'text-muted-foreground'
        }`}>
        {label}
      </Text>
    </Pressable>
  );
}

export function IssueTag({ label }: { label: string }) {
  return (
    <View className="self-start rounded-full bg-secondary px-2.5 py-1">
      <Text className="text-xs font-semibold text-muted-foreground">{label}</Text>
    </View>
  );
}
