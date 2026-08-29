import { GlassMenuButton } from '@/components/glass/glass-menu-button';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { withLoadingState } from '@/lib/async-state';
import { useCurrentTime } from '@/hooks/use-current-time';
import { useMapStylePicker } from '@/hooks/use-map-style-picker';
import { getEventLifecycle, type EventLifecycleInput } from '@/lib/event-lifecycle';
import { type MenuAction, type NativeActionEvent } from '@expo/ui/community/menu';
import { useMutation } from 'convex/react';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

const ACTION_INFO = 'info';
const ACTION_SAT = 'sat';
const ACTION_MAP_STYLE = 'map-style';
const ACTION_TIMELINE = 'timeline';
const ACTION_INVITE = 'invite';
const ACTION_LEAVE_OR_END = 'leave-or-end';

type HuntActionsMenuProps = {
  currentUserId: Id<'users'>;
  event: EventLifecycleInput & {
    creatorId: Id<'users'>;
  };
  eventId: Id<'events'>;
};

export function HuntActionsMenu({ currentUserId, event, eventId }: HuntActionsMenuProps) {
  const { push, replace } = useRouter();
  const currentTime = useCurrentTime();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const handleSelectMapStyle = useMapStylePicker();
  const leaveEvent = useMutation(api.eventMembers.leave);
  const endEvent = useMutation(api.events.end);
  const isCreator = event.creatorId === currentUserId;
  const isEnded = getEventLifecycle(event, currentTime) === 'ended';
  const destructiveTitle = isCreator ? 'Avsluta jakt' : 'Lämna jakt';

  const handleLeaveEvent = async () => {
    await withLoadingState(setIsSubmitting, async () => {
      try {
        await leaveEvent({ eventId });
        replace('/');
      } catch (error) {
        Alert.alert(
          'Kunde inte lämna jakten',
          error instanceof Error ? error.message : 'Försök igen om en stund.'
        );
      }
    });
  };

  const handleEndEvent = async () => {
    await withLoadingState(setIsSubmitting, async () => {
      try {
        await endEvent({ eventId });
        replace(`/event/${eventId}`);
      } catch (error) {
        Alert.alert(
          'Kunde inte avsluta jakten',
          error instanceof Error ? error.message : 'Försök igen om en stund.'
        );
      }
    });
  };

  const confirmLeaveOrEnd = () => {
    if (isCreator) {
      Alert.alert(
        'Avsluta jakt',
        'Jakten flyttas till historik och blir skrivskyddad. Vill du fortsätta?',
        [
          { text: 'Avbryt', style: 'cancel' },
          { text: 'Avsluta jakt', style: 'destructive', onPress: () => void handleEndEvent() },
        ]
      );
      return;
    }

    Alert.alert('Lämna jakt', 'Vill du lämna den här jakten?', [
      { text: 'Avbryt', style: 'cancel' },
      { text: 'Lämna jakt', style: 'destructive', onPress: () => void handleLeaveEvent() },
    ]);
  };

  const actions: MenuAction[] = [
    {
      attributes: { disabled: isSubmitting, hidden: isEnded },
      id: ACTION_SAT,
      image: 'map.circle',
      title: 'Såt',
    },
    {
      attributes: { disabled: isSubmitting },
      id: ACTION_INFO,
      image: 'info.circle',
      title: 'Info',
    },
    {
      attributes: { disabled: isSubmitting },
      id: ACTION_MAP_STYLE,
      image: 'map',
      title: 'Ändra kartvy',
    },
    {
      attributes: { disabled: isSubmitting, hidden: !isEnded },
      id: ACTION_TIMELINE,
      image: 'chart.line.uptrend.xyaxis',
      title: 'Jakt tidslinje',
    },
    {
      attributes: { disabled: isSubmitting, hidden: !isCreator || isEnded },
      id: ACTION_INVITE,
      image: 'person.badge.plus',
      title: 'Bjud in användare',
    },
    {
      attributes: { destructive: true, disabled: isSubmitting, hidden: isEnded },
      id: ACTION_LEAVE_OR_END,
      image: isCreator ? 'archivebox' : 'rectangle.portrait.and.arrow.right',
      title: destructiveTitle,
    },
  ];

  const handlePressAction = (event: NativeActionEvent) => {
    switch (event.nativeEvent.event) {
      case ACTION_INFO:
        push(`/event/${eventId}/members`);
        break;
      case ACTION_MAP_STYLE:
        handleSelectMapStyle();
        break;
      case ACTION_SAT:
        push(`/event/${eventId}/sat`);
        break;
      case ACTION_TIMELINE:
        push(`/event/${eventId}/timeline`);
        break;
      case ACTION_INVITE:
        push(`/event/${eventId}/invite`);
        break;
      case ACTION_LEAVE_OR_END:
        confirmLeaveOrEnd();
        break;
    }
  };

  return (
    <GlassMenuButton
      accessibilityLabel="Jaktåtgärder"
      actions={actions}
      icon="ellipsis-horizontal"
      onPressAction={handlePressAction}
      style={isSubmitting ? { opacity: 0.5 } : undefined}
      title="Jaktåtgärder"
    />
  );
}
