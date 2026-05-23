import { Button, ButtonProps, Text } from '@/components/ui';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { APP_COLORS } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { Href, useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery } from 'convex/react';
import { useState } from 'react';
import { ActivityIndicator, Alert, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type EventActionButtonProps = Pick<ButtonProps, 'variant' | 'onPress' | 'accessibilityLabel' | 'disabled'> & {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  label: string;
};

function EventActionButton({
  variant,
  onPress,
  accessibilityLabel,
  disabled,
  icon,
  iconColor,
  label,
}: EventActionButtonProps) {
  return (
    <Button
      variant={variant}
      size="xl"
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      className="h-auto min-h-12 rounded-xl px-4 py-3"
      style={{ height: 'auto', minHeight: 48 }}>
      <Ionicons name={icon} size={20} color={iconColor} />
      <Text className="flex-1 text-center text-base leading-5" numberOfLines={2}>
        {label}
      </Text>
      <View style={{ width: 20 }} />
    </Button>
  );
}

export default function EventActionsScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const event = useQuery(api.events.get, {
    eventId: eventId as Id<'events'>,
  });
  const currentUser = useQuery(api.users.getCurrentUserProfile);
  const leaveEvent = useMutation(api.eventMembers.leave);
  const endEvent = useMutation(api.events.end);

  function closeAndNavigate(path: Href) {
    router.back();
    setTimeout(() => router.push(path), 100);
  }

  async function handleLeaveEvent() {
    setIsSubmitting(true);
    try {
      await leaveEvent({ eventId: eventId as Id<'events'> });
      router.replace('/' as Href);
    } catch (error) {
      Alert.alert(
        'Kunde inte lämna jakten',
        error instanceof Error ? error.message : 'Försök igen om en stund.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleEndEvent() {
    if (!event) return;

    setIsSubmitting(true);
    try {
      await endEvent({ eventId: eventId as Id<'events'> });
      router.replace(`/event/${eventId}` as Href);
    } catch (error) {
      Alert.alert(
        'Kunde inte avsluta jakten',
        error instanceof Error ? error.message : 'Försök igen om en stund.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function confirmLeaveOrRemove() {
    if (!event || !currentUser) return;

    const isCreator = event.creatorId === currentUser._id;

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
  }

  if (event === undefined || currentUser === undefined) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="small" color={APP_COLORS.primary} />
      </View>
    );
  }

  if (event === null || currentUser === null) {
    return (
      <View className="flex-1 items-center justify-center bg-background p-6">
        <Text className="text-center text-muted-foreground">Kunde inte ladda jaktåtgärder.</Text>
      </View>
    );
  }

  const isCreator = event.creatorId === currentUser._id;
  const destructiveLabel = isCreator ? 'Avsluta jakt' : 'Lämna jakt';
  const isEnded = event.endedAt !== undefined;

  return (
    <View
      className="flex-1 bg-background px-4 pt-5"
      style={{
        backgroundColor: APP_COLORS.background,
        paddingBottom: Math.max(insets.bottom, 16),
      }}>
      <View className="gap-3">
        <EventActionButton
          variant="outline"
          onPress={() =>
            closeAndNavigate({
              pathname: '/event/[eventId]/members',
              params: { eventId },
            } as Href)
          }
          accessibilityLabel="Visa jaktinfo"
          icon="information-circle-outline"
          iconColor={APP_COLORS.text}
          label="Info"
          disabled={isSubmitting}
        />

        {isEnded && (
          <EventActionButton
            variant="outline"
            onPress={() => closeAndNavigate(`/event/${eventId}/timeline` as Href)}
            accessibilityLabel="Visa jakt tidslinje"
            icon="analytics-outline"
            iconColor={APP_COLORS.text}
            label="Jakt tidslinje"
            disabled={isSubmitting}
          />
        )}

        {isCreator && !isEnded && (
          <EventActionButton
            variant="outline"
            onPress={() =>
              closeAndNavigate({
                pathname: '/event/[eventId]/invite',
                params: { eventId },
              } as Href)
            }
            accessibilityLabel="Bjud in användare"
            icon="person-add-outline"
            iconColor={APP_COLORS.text}
            label="Bjud in användare"
            disabled={isSubmitting}
          />
        )}

        {!isEnded && (
          <EventActionButton
            variant="destructive"
            onPress={confirmLeaveOrRemove}
            accessibilityLabel={destructiveLabel}
            icon={isCreator ? 'archive-outline' : 'exit-outline'}
            iconColor={APP_COLORS.surface}
            label={destructiveLabel}
            disabled={isSubmitting}
          />
        )}
      </View>
    </View>
  );
}
