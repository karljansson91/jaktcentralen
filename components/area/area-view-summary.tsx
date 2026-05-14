import { IconButton, Text } from '@/components/ui';
import { APP_COLORS } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

type AreaViewSummaryProps = {
  name: string;
  hectaresLabel: string;
  interestPointLabel: string;
  onBack: () => void;
  onOpenActions: () => void;
};

export function AreaViewSummary({
  name,
  hectaresLabel,
  interestPointLabel,
  onBack,
  onOpenActions,
}: AreaViewSummaryProps) {
  return (
    <View
      className="rounded-2xl border border-border bg-card px-5 py-4"
      style={{ boxShadow: '0 8px 22px rgba(49, 52, 68, 0.14)' }}>
      <View className="flex-row items-start gap-2">
        <IconButton
          variant="ghost"
          size="sm"
          onPress={onBack}
          accessibilityLabel="Gå tillbaka"
          className="-ml-2 -mt-1 bg-transparent">
          <Ionicons name="chevron-back" size={24} color={APP_COLORS.text} />
        </IconButton>

        <View className="min-w-0 flex-1 gap-2">
          <Text
            className="text-left text-2xl font-semibold leading-7 text-foreground"
            numberOfLines={1}>
            {name}
          </Text>
          <Text
            className="w-full text-left text-base font-medium text-muted-foreground"
            numberOfLines={1}
            style={{ textAlign: 'left' }}>
            {hectaresLabel} • {interestPointLabel}
          </Text>
        </View>

        <IconButton
          variant="ghost"
          size="sm"
          onPress={onOpenActions}
          accessibilityLabel="Områdesåtgärder"
          className="-mr-2 -mt-1 bg-transparent">
          <Ionicons name="ellipsis-horizontal" size={22} color={APP_COLORS.text} />
        </IconButton>
      </View>
    </View>
  );
}
