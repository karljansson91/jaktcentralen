import { Text } from '@/components/ui';
import {
  addMonths,
  formatEventDate,
  getCalendarDays,
  isSameDay,
  startOfMonth,
} from '@/components/event/event-date-picker-utils';
import { APP_COLORS } from '@/lib/theme';
import { cn } from '@/lib/utils';
import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const WEEKDAY_LABELS = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'];

type EventDatePickerSheetProps = {
  label: string;
  onClose: () => void;
  onSelect: (date: Date) => void;
  value: Date;
};

export function EventDatePickerSheet({
  label,
  onClose,
  onSelect,
  value,
}: EventDatePickerSheetProps) {
  const insets = useSafeAreaInsets();
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(value));
  const calendarDays = useMemo(() => getCalendarDays(visibleMonth), [visibleMonth]);
  const monthLabel = visibleMonth.toLocaleDateString('sv-SE', {
    month: 'long',
    year: 'numeric',
  });
  const today = new Date();

  function handleSelect(date: Date) {
    onSelect(new Date(date.getFullYear(), date.getMonth(), date.getDate()));
  }

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible>
      <View style={styles.modalRoot}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Stäng datumväljare"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
        <View
          className="rounded-t-[30px] bg-background px-5 pt-4"
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 12 }]}>
          <View className="mb-4 h-1.5 w-12 self-center rounded-full bg-border" />

          <Text variant="h3" numberOfLines={1}>
            {label}
          </Text>

          <View className="mt-5 flex-row items-center justify-between">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Föregående månad"
              onPress={() => setVisibleMonth((month) => addMonths(month, -1))}
              className="size-10 items-center justify-center rounded-full bg-muted active:bg-accent">
              <Ionicons name="chevron-back" size={20} color={APP_COLORS.text} />
            </Pressable>
            <Text className="text-lg font-semibold capitalize">{monthLabel}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Nästa månad"
              onPress={() => setVisibleMonth((month) => addMonths(month, 1))}
              className="size-10 items-center justify-center rounded-full bg-muted active:bg-accent">
              <Ionicons name="chevron-forward" size={20} color={APP_COLORS.text} />
            </Pressable>
          </View>

          <View className="mt-4 flex-row">
            {WEEKDAY_LABELS.map((weekday) => (
              <Text
                key={weekday}
                className="w-[14.285%] text-center text-xs font-semibold text-muted-foreground">
                {weekday}
              </Text>
            ))}
          </View>

          <View className="mt-2 flex-row flex-wrap">
            {calendarDays.map((day) => {
              const selected = isSameDay(day, value);
              const currentMonth = day.getMonth() === visibleMonth.getMonth();
              const currentDay = isSameDay(day, today);

              return (
                <Pressable
                  key={day.toISOString()}
                  accessibilityRole="button"
                  accessibilityLabel={formatEventDate(day)}
                  onPress={() => handleSelect(day)}
                  className="h-10 w-[14.285%] items-center justify-center">
                  <View
                    className={cn(
                      'size-9 items-center justify-center rounded-full',
                      selected && 'bg-primary',
                      currentDay && !selected && 'border border-primary/40',
                    )}>
                    <Text
                      className={cn(
                        'text-sm font-medium',
                        selected ? 'text-primary-foreground' : 'text-foreground',
                        !currentMonth && !selected && 'text-muted-foreground/45',
                      )}>
                      {day.getDate()}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          <View className="mt-5 flex-row gap-3">
            <Pressable
              accessibilityRole="button"
              onPress={() => handleSelect(today)}
              className="h-11 flex-1 items-center justify-center rounded-2xl border border-border bg-card active:bg-accent">
              <Text className="font-semibold">Idag</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              className="h-11 flex-1 items-center justify-center rounded-2xl bg-primary active:bg-primary/90">
              <Text className="font-semibold text-primary-foreground">Klar</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    backgroundColor: 'rgba(49, 52, 68, 0.28)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    boxShadow: '0 -14px 34px rgba(49, 52, 68, 0.16)',
  },
});
