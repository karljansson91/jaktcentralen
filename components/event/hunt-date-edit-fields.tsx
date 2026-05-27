import { EventDatePickerField } from '@/components/event/event-date-picker-field';
import { Text } from '@/components/ui';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import {
  formatEventInfoDate,
  isValidEventDate,
  normalizeEventDate,
} from '@/lib/event-dates';
import { APP_COLORS } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from 'convex/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, View } from 'react-native';

type DateSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

type HuntDateEditFieldsProps = {
  endDate: number;
  eventId: Id<'events'>;
  startDate: number;
};

function getDateSaveStatusLabel(status: DateSaveStatus) {
  switch (status) {
    case 'saving':
      return 'Sparar...';
    case 'saved':
      return 'Sparat';
    case 'error':
      return 'Kunde inte spara';
    default:
      return undefined;
  }
}

export function HuntDateEditFields({
  endDate,
  eventId,
  startDate,
}: HuntDateEditFieldsProps) {
  const updateEndDate = useMutation(api.events.updateEndDate);
  const [draftEndDate, setDraftEndDate] = useState(() =>
    normalizeEventDate(new Date(endDate))
  );
  const [saveStatus, setSaveStatus] = useState<DateSaveStatus>('idle');
  const latestSaveIdRef = useRef(0);

  useEffect(() => {
    if (saveStatus !== 'saved') {
      return;
    }

    const timeout = setTimeout(() => setSaveStatus('idle'), 1400);
    return () => clearTimeout(timeout);
  }, [saveStatus]);

  const handleEndDateChange = useCallback(
    async (date: Date) => {
      const nextEndDate = normalizeEventDate(date);
      if (!isValidEventDate(nextEndDate)) {
        Alert.alert('Fel', 'Välj ett slutdatum.');
        return;
      }

      const firstAllowedEndDate = normalizeEventDate(new Date(startDate));
      if (nextEndDate.getTime() < firstAllowedEndDate.getTime()) {
        Alert.alert('Fel', 'Slutdatum kan inte vara före startdatum.');
        return;
      }

      setDraftEndDate(nextEndDate);
      setSaveStatus('saving');
      const saveId = latestSaveIdRef.current + 1;
      latestSaveIdRef.current = saveId;

      try {
        await updateEndDate({
          endDate: nextEndDate.getTime(),
          eventId,
        });
        if (latestSaveIdRef.current === saveId) {
          setSaveStatus('saved');
        }
      } catch (error) {
        if (latestSaveIdRef.current !== saveId) {
          return;
        }

        setDraftEndDate(normalizeEventDate(new Date(endDate)));
        setSaveStatus('error');
        Alert.alert(
          'Kunde inte spara',
          error instanceof Error ? error.message : 'Försök igen om en stund.'
        );
      }
    },
    [endDate, eventId, startDate, updateEndDate]
  );

  return (
    <View className="gap-3">
      <View className="flex-row items-center gap-3">
        <Ionicons name="calendar-outline" size={18} color={APP_COLORS.textMuted} />
        <View className="min-w-0 flex-1 gap-1">
          <Text className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Startdatum
          </Text>
          <Text className="text-sm text-foreground">{formatEventInfoDate(startDate)}</Text>
        </View>
      </View>
      <View className="pl-8">
        <EventDatePickerField
          label="Slutdatum"
          value={draftEndDate}
          onValueChange={handleEndDateChange}
          helperText={getDateSaveStatusLabel(saveStatus)}
        />
      </View>
    </View>
  );
}
