import { Text } from '@/components/ui';
import { APP_COLORS } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';

type HomeSectionHeaderProps = {
  addAccessibilityLabel?: string;
  actionIcon?: keyof typeof Ionicons.glyphMap;
  actionLabel?: string;
  count: number;
  onAddPress?: () => void;
  title: string;
};

export function HomeSectionHeader({
  addAccessibilityLabel,
  actionIcon = 'add',
  actionLabel,
  count,
  onAddPress,
  title,
}: HomeSectionHeaderProps) {
  return (
    <View className="flex-row items-center justify-between gap-4">
      <View className="min-w-0 flex-1">
        <Text className="text-xl font-semibold tracking-[-0.2px] text-foreground">
          {title}
        </Text>
        <Text className="mt-1 text-sm text-muted-foreground">{count} st</Text>
      </View>

      {onAddPress ? (
        <Pressable
          accessibilityLabel={addAccessibilityLabel}
          accessibilityRole="button"
          hitSlop={8}
          onPress={onAddPress}
          className={`h-10 flex-row items-center justify-center gap-1.5 rounded-full bg-primary ${
            actionLabel ? 'px-4' : 'w-10'
          }`}>
          <Ionicons name={actionIcon} size={actionLabel ? 18 : 22} color={APP_COLORS.surface} />
          {actionLabel ? (
            <Text className="text-sm font-semibold text-primary-foreground">
              {actionLabel}
            </Text>
          ) : null}
        </Pressable>
      ) : null}
    </View>
  );
}
