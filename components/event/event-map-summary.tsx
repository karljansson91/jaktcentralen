import { IconButton, Text } from '@/components/ui';
import { APP_COLORS } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

type EventMapSummaryProps = {
  title: string;
  elapsedLabel: string;
  areaName: string;
  participantLabel: string;
  topInset: number;
  onOpenActions: () => void;
};

export function EventMapSummary({
  title,
  elapsedLabel,
  areaName,
  participantLabel,
  topInset,
  onOpenActions,
}: EventMapSummaryProps) {
  return (
    <View
      className="rounded-b-[24px] border-b border-border bg-card px-5 pb-4"
      style={{
        paddingTop: Math.max(topInset, 8) + 8,
        boxShadow: '0 8px 22px rgba(49, 52, 68, 0.14)',
      }}>
      <View className="flex-row items-center gap-3">
        <Text
          className="min-w-0 flex-1 text-[34px] font-medium leading-[39px] text-foreground"
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.76}>
          {title}
        </Text>

        <IconButton
          variant="ghost"
          size="sm"
          onPress={onOpenActions}
          accessibilityLabel="Jaktåtgärder"
          className="-mr-2 bg-transparent">
          <Ionicons name="ellipsis-horizontal" size={25} color={APP_COLORS.text} />
        </IconButton>
      </View>

      <View className="mt-2 flex-row items-baseline gap-3">
        <Text
          className="shrink-0 text-[26px] font-medium leading-[31px] text-foreground"
          numberOfLines={1}>
          {elapsedLabel}
        </Text>
        <Text
          className="min-w-0 flex-1 text-[17px] font-medium leading-[22px] text-muted-foreground"
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.72}>
          {areaName} • {participantLabel}
        </Text>
      </View>
    </View>
  );
}
