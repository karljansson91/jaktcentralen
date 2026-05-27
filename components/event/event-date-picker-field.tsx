import { EventDatePickerSheet } from '@/components/event/event-date-picker-sheet';
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
  const [androidPickerVisible, setAndroidPickerVisible] = useState(false);
  const [calendarVisible, setCalendarVisible] = useState(false);
  const formattedValue = formatEventDate(value);
  const showAndroidDialog = Platform.OS === 'android' && androidPickerVisible;

  const handleValueChange = (date: Date) => {
    setAndroidPickerVisible(false);
    setCalendarVisible(false);
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

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${formattedValue}`}
        onPress={() => {
          if (Platform.OS === 'android') {
            setAndroidPickerVisible(true);
          } else {
            setCalendarVisible(true);
          }
        }}
        className="relative min-h-12 flex-row items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 active:bg-accent">
        <View className="min-w-0 flex-1">
          <Text className="text-base font-semibold text-foreground" numberOfLines={1}>
            {formattedValue}
          </Text>
        </View>
        <Ionicons name="calendar-outline" size={20} color={APP_COLORS.textMuted} />
      </Pressable>

      {showAndroidDialog ? (
        <DateTimePicker
          value={value}
          mode="date"
          display="default"
          presentation="dialog"
          accentColor={APP_COLORS.primary}
          positiveButton={{ label: 'Välj' }}
          negativeButton={{ label: 'Avbryt' }}
          onDismiss={() => setAndroidPickerVisible(false)}
          onValueChange={(_, date) => handleValueChange(date)}
        />
      ) : null}

      {Platform.OS !== 'android' && calendarVisible ? (
        <EventDatePickerSheet
          label={label}
          onClose={() => setCalendarVisible(false)}
          onSelect={handleValueChange}
          value={value}
        />
      ) : null}

      {helperText ? (
        <Text className="text-sm text-muted-foreground">{helperText}</Text>
      ) : null}
    </View>
  );
}
