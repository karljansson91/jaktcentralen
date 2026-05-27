import { formatEventDate } from '@/components/event/event-date-picker-utils';
import { Text } from '@/components/ui';
import { APP_COLORS } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';

type EventDatePickerFieldProps = {
  label: string;
  value: Date;
  onValueChange: (date: Date) => void;
  actionLabel?: string;
  helperText?: string;
  onActionPress?: () => void;
  required?: boolean;
};

export function EventDatePickerField({
  actionLabel,
  helperText,
  label,
  onActionPress,
  onValueChange,
  required,
  value,
}: EventDatePickerFieldProps) {
  const [dialogVisible, setDialogVisible] = useState(false);
  const formattedValue = formatEventDate(value);
  const showInlinePicker = Platform.OS === 'ios';
  const showDialogPicker = Platform.OS === 'android' && dialogVisible;

  const handleValueChange = (date: Date) => {
    setDialogVisible(false);
    onValueChange(date);
  };

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

      {showInlinePicker ? (
        <View className="items-start">
          <DateTimePicker
            value={value}
            mode="date"
            display="compact"
            accentColor={APP_COLORS.primary}
            locale="sv_SE"
            onValueChange={(_, date) => handleValueChange(date)}
            style={{ minWidth: 160 }}
          />
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${formattedValue}`}
          onPress={() => setDialogVisible(true)}
          className="relative min-h-12 flex-row items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 active:bg-accent">
          <View className="min-w-0 flex-1">
            <Text className="text-base font-semibold text-foreground" numberOfLines={1}>
              {formattedValue}
            </Text>
          </View>
          <Ionicons name="calendar-outline" size={20} color={APP_COLORS.textMuted} />
        </Pressable>
      )}

      {showDialogPicker ? (
        <DateTimePicker
          value={value}
          mode="date"
          display="default"
          presentation="dialog"
          accentColor={APP_COLORS.primary}
          positiveButton={{ label: 'Välj' }}
          negativeButton={{ label: 'Avbryt' }}
          onDismiss={() => setDialogVisible(false)}
          onValueChange={(_, date) => handleValueChange(date)}
        />
      ) : null}

      {helperText ? (
        <Text className="text-sm text-muted-foreground">{helperText}</Text>
      ) : null}
    </View>
  );
}
