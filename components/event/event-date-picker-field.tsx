import { Text } from '@/components/ui';
import { APP_COLORS } from '@/lib/theme';
import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { Pressable, View } from 'react-native';

type EventDatePickerFieldProps = {
  label: string;
  value: Date;
  onValueChange: (date: Date) => void;
  actionLabel?: string;
  helperText?: string;
  onActionPress?: () => void;
  required?: boolean;
};

function formatDateLabel(date: Date): string {
  return date.toLocaleDateString('sv-SE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function EventDatePickerField({
  actionLabel,
  helperText,
  label,
  onActionPress,
  onValueChange,
  required,
  value,
}: EventDatePickerFieldProps) {
  return (
    <View className="mb-4 gap-2">
      <View className="flex-row items-center justify-between gap-3">
        <Text className="font-medium">
          {label}
          {required ? ' *' : ''}
        </Text>
        {onActionPress && actionLabel ? (
          <Pressable onPress={onActionPress} className="rounded-full bg-muted px-3 py-1">
            <Text className="text-sm font-medium text-muted-foreground">{actionLabel}</Text>
          </Pressable>
        ) : null}
      </View>

      <View className="rounded-2xl border border-border bg-card px-4 py-3">
        <Text className="mb-3 text-sm text-muted-foreground">{formatDateLabel(value)}</Text>
        <DateTimePicker
          value={value}
          mode="date"
          display="compact"
          presentation="inline"
          locale="sv_SE"
          accentColor={APP_COLORS.primary}
          positiveButton={{ label: 'Välj' }}
          negativeButton={{ label: 'Avbryt' }}
          onValueChange={(_, date) => onValueChange(date)}
        />
      </View>

      {helperText ? (
        <Text className="text-sm text-muted-foreground">{helperText}</Text>
      ) : null}
    </View>
  );
}
