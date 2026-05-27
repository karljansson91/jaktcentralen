import { Badge, Button, Card, CardContent, Text } from '@/components/ui';
import { AllowedGameDetails } from '@/components/event/allowed-game-details';
import { AllowedGameEditor } from '@/components/event/allowed-game-editor';
import { HuntDateEditFields } from '@/components/event/hunt-date-edit-fields';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import type { AllowedGameRule } from '@/lib/allowed-game';
import { formatEventInfoDateRange } from '@/lib/event-dates';
import { useCurrentTime } from '@/hooks/use-current-time';
import {
  getEventLifecycle,
  getEventLifecycleLabel,
  type EventLifecycle,
} from '@/lib/event-lifecycle';
import { getMemberInitials } from '@/lib/event-formatting';
import { APP_COLORS } from '@/lib/theme';
import { useUser } from '@clerk/expo';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery } from 'convex/react';
import { Href, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type MemberStatus = 'accepted' | 'invited' | 'declined';
type AllowedGameSaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error';
type AllowedGameSaveAction =
  | { type: 'changed'; dirty: boolean }
  | { type: 'error' }
  | { type: 'idle' }
  | { type: 'saved' }
  | { type: 'saving' };

const EVENT_INFO_STATUS_LABELS: Record<EventLifecycle, string> = {
  active: 'Pågår',
  ended: 'Avslutad',
  upcoming: 'Planerad',
};

function getEventStatus(startDate: number, endDate: number, now: number, endedAt?: number) {
  return getEventLifecycleLabel(
    getEventLifecycle({ endedAt, endDate, startDate }, now),
    EVENT_INFO_STATUS_LABELS
  );
}

function formatTrackingStatus(status: MemberStatus, now: number, lastSeenAt?: number) {
  if (status === 'invited') {
    return 'Väntar på svar';
  }
  if (status === 'declined') {
    return 'Tackat nej till inbjudan';
  }
  if (!lastSeenAt) {
    return 'Ingen position ännu';
  }

  const minutesAgo = Math.max(0, Math.round((now - lastSeenAt) / 60_000));
  const time = new Date(lastSeenAt).toLocaleTimeString('sv-SE', {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (minutesAgo > 15) {
    return `Spårning pausad · senast ${time}`;
  }

  if (minutesAgo <= 1) {
    return `Spårning aktiv · nyss`;
  }

  return `Spårning aktiv · ${minutesAgo} min sedan`;
}

function getRoleLabel(isCreator: boolean, status: MemberStatus) {
  if (status === 'invited') {
    return 'Inbjuden';
  }
  if (status === 'declined') {
    return 'Tackat nej';
  }
  return isCreator ? 'Jaktledare' : 'Deltagare';
}

function getDisplayName(
  user: { name?: string; email?: string } | null | undefined,
  fallbackName?: string
) {
  const name = user?.name?.trim();
  if (name) {
    return name;
  }
  if (fallbackName?.trim()) {
    return fallbackName.trim();
  }
  return user?.email || 'Okänd deltagare';
}

function getStatusTone(status: MemberStatus) {
  if (status === 'accepted') {
    return { container: 'bg-primary/10', text: 'text-primary' };
  }
  if (status === 'invited') {
    return { container: 'bg-accent', text: 'text-muted-foreground' };
  }
  return { container: 'bg-destructive/10', text: 'text-destructive' };
}

const ALLOWED_GAME_SAVE_DELAY_MS = 800;

function getAllowedGameSaveStatus(status: AllowedGameSaveStatus) {
  switch (status) {
    case 'pending':
    case 'saving':
      return {
        color: APP_COLORS.textMuted,
        icon: 'cloud-upload-outline' as const,
        label: 'Sparar...',
      };
    case 'saved':
      return {
        color: APP_COLORS.primary,
        icon: 'checkmark-circle-outline' as const,
        label: 'Sparat',
      };
    case 'error':
      return {
        color: '#B64E4E',
        icon: 'alert-circle-outline' as const,
        label: 'Kunde inte spara',
      };
    default:
      return null;
  }
}

function allowedGameSaveStatusReducer(
  status: AllowedGameSaveStatus,
  action: AllowedGameSaveAction
): AllowedGameSaveStatus {
  switch (action.type) {
    case 'changed':
      return action.dirty ? 'pending' : 'idle';
    case 'saving':
      return status === 'saving' ? status : 'saving';
    case 'saved':
      return 'saved';
    case 'error':
      return 'error';
    case 'idle':
      return 'idle';
    default:
      return status;
  }
}

function AllowedGameEditCard({
  eventId,
  initialRules,
}: {
  eventId: Id<'events'>;
  initialRules: AllowedGameRule[];
}) {
  const [allowedGameDraft, setAllowedGameDraft] = useState(initialRules);
  const [saveStatus, dispatchSaveStatus] = useReducer(
    allowedGameSaveStatusReducer,
    'idle'
  );
  const updateAllowedGame = useMutation(api.events.updateAllowedGame);
  const allowedGameDraftJson = useMemo(
    () => JSON.stringify(allowedGameDraft),
    [allowedGameDraft]
  );
  const latestDraftJsonRef = useRef(allowedGameDraftJson);
  const lastSavedJsonRef = useRef(JSON.stringify(initialRules));

  useEffect(() => {
    latestDraftJsonRef.current = allowedGameDraftJson;
  }, [allowedGameDraftJson]);

  useEffect(() => {
    if (allowedGameDraftJson === lastSavedJsonRef.current) {
      return;
    }

    let cancelled = false;

    const timeout = setTimeout(() => {
      dispatchSaveStatus({ type: 'saving' });

      void updateAllowedGame({
        eventId,
        allowedGame: allowedGameDraft,
      })
        .then(() => {
          if (cancelled || latestDraftJsonRef.current !== allowedGameDraftJson) {
            return;
          }

          lastSavedJsonRef.current = allowedGameDraftJson;
          dispatchSaveStatus({ type: 'saved' });
        })
        .catch((error) => {
          if (cancelled || latestDraftJsonRef.current !== allowedGameDraftJson) {
            return;
          }

          console.error('Failed to auto-save allowed game:', error);
          dispatchSaveStatus({ type: 'error' });
        });
    }, ALLOWED_GAME_SAVE_DELAY_MS);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [allowedGameDraft, allowedGameDraftJson, eventId, updateAllowedGame]);

  useEffect(() => {
    if (saveStatus !== 'saved') {
      return;
    }

    const timeout = setTimeout(() => {
      if (latestDraftJsonRef.current === lastSavedJsonRef.current) {
        dispatchSaveStatus({ type: 'idle' });
      }
    }, 1400);

    return () => {
      clearTimeout(timeout);
    };
  }, [saveStatus]);

  const saveStatusDisplay = getAllowedGameSaveStatus(saveStatus);

  return (
    <View className="gap-4">
      {saveStatusDisplay ? (
        <View className="flex-row items-center justify-end gap-1.5 px-1">
          <Ionicons
            name={saveStatusDisplay.icon}
            size={15}
            color={saveStatusDisplay.color}
          />
          <Text className="text-xs font-semibold" style={{ color: saveStatusDisplay.color }}>
            {saveStatusDisplay.label}
          </Text>
        </View>
      ) : null}
      <AllowedGameEditor
        value={allowedGameDraft}
        onChange={(draft) => {
          setAllowedGameDraft(draft);
          dispatchSaveStatus({
            dirty: JSON.stringify(draft) !== lastSavedJsonRef.current,
            type: 'changed',
          });
        }}
      />
    </View>
  );
}

export default function EventInfoScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const { push } = useRouter();
  const insets = useSafeAreaInsets();
  const currentTime = useCurrentTime(60_000);
  const { user: clerkUser } = useUser();
  const [pendingUserId, setPendingUserId] = useState<Id<'users'> | null>(null);

  const event = useQuery(api.events.get, {
    eventId: eventId as Id<'events'>,
  });
  const area = useQuery(
    api.areas.getForEvent,
    event ? { eventId: eventId as Id<'events'> } : 'skip'
  );
  const currentUser = useQuery(api.users.getCurrentUserProfile);
  const isCreator = !!event && !!currentUser && event.creatorId === currentUser._id;
  const acceptedMembers = useQuery(
    api.eventMembers.listMembers,
    event ? { eventId: eventId as Id<'events'> } : 'skip'
  );
  const inviteStatuses = useQuery(
    api.eventMembers.listInviteStatuses,
    isCreator ? { eventId: eventId as Id<'events'> } : 'skip'
  );
  const removeMember = useMutation(api.eventMembers.removeMember);

  const memberRows = useMemo(
    () => (isCreator ? inviteStatuses ?? [] : acceptedMembers ?? []),
    [acceptedMembers, inviteStatuses, isCreator]
  );
  const currentUserDisplayFallback =
    clerkUser?.fullName ||
    clerkUser?.username ||
    clerkUser?.primaryEmailAddress?.emailAddress ||
    undefined;
  const acceptedCount = memberRows.filter((member) => member.status === 'accepted').length;
  const currentUserMembership = acceptedMembers?.find((member) => member.userId === currentUser?._id);
  const canEditEventDates = Boolean(
    event &&
      currentUser &&
      (event.creatorId === currentUser._id || currentUserMembership?.role === 'admin')
  );
  const canEditAllowedGame =
    Boolean(currentUserMembership?.role === 'admin') &&
    getEventLifecycle(event ?? { startDate: 0, endDate: 0 }, currentTime) !== 'ended';

  async function handleRemoveMember(userId: Id<'users'>) {
    setPendingUserId(userId);
    try {
      await removeMember({ eventId: eventId as Id<'events'>, userId });
    } catch (error) {
      Alert.alert(
        'Kunde inte ta bort deltagaren',
        error instanceof Error ? error.message : 'Försök igen om en stund.'
      );
    }
    setPendingUserId(null);
  }

  function confirmRemoveMember(userId: Id<'users'>, name: string, status: MemberStatus) {
    Alert.alert(
      status === 'accepted' ? 'Ta bort deltagare' : 'Ta bort inbjudan',
      `Vill du ta bort ${name} från jakten?`,
      [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: 'Ta bort',
          style: 'destructive',
          onPress: () => void handleRemoveMember(userId),
        },
      ]
    );
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
        <Text className="text-center text-muted-foreground">Kunde inte ladda jaktinfo.</Text>
      </View>
    );
  }

  if (area === undefined || acceptedMembers === undefined || (isCreator && inviteStatuses === undefined)) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="small" color={APP_COLORS.primary} />
      </View>
    );
  }

  if (area === null) {
    return (
      <View className="flex-1 items-center justify-center bg-background p-6">
        <Text className="text-center text-muted-foreground">Kunde inte ladda jaktinfo.</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        className="flex-1 bg-background"
        contentContainerClassName="gap-6 px-5"
        contentContainerStyle={{
          paddingBottom: 16,
          paddingTop: 0,
        }}
        contentInset={{ bottom: Math.max(insets.bottom, 16) }}
        scrollIndicatorInsets={{ bottom: Math.max(insets.bottom, 16) }}
        showsVerticalScrollIndicator={false}>
        <View className="gap-5">
          <View className="gap-3">
            <View className="flex-row items-start gap-3">
              <View className="size-12 items-center justify-center rounded-2xl bg-primary/10">
                <Ionicons name="trail-sign-outline" size={24} color={APP_COLORS.primary} />
              </View>
              <View className="min-w-0 flex-1 gap-1">
                <Text className="text-2xl font-semibold text-foreground" numberOfLines={2}>
                  {event.title}
                </Text>
                <Text className="text-sm leading-5 text-muted-foreground">
                  {area.name}
                </Text>
              </View>
              <Badge className="rounded-full bg-primary/10">
                <Text className="text-xs font-semibold text-primary">
                  {getEventStatus(event.startDate, event.endDate, currentTime, event.endedAt)}
                </Text>
              </Badge>
            </View>

            {event.description ? (
              <Text className="text-sm leading-5 text-muted-foreground">
                {event.description}
              </Text>
            ) : null}
          </View>

          <View className="gap-4 border-y border-border py-4">
            {canEditEventDates ? (
              <HuntDateEditFields
                key={event.endDate}
                endDate={event.endDate}
                eventId={eventId as Id<'events'>}
                startDate={event.startDate}
              />
            ) : (
              <View className="flex-row items-center gap-3">
                <Ionicons name="calendar-outline" size={18} color={APP_COLORS.textMuted} />
                <Text className="flex-1 text-sm leading-5 text-foreground">
                  {formatEventInfoDateRange(event.startDate, event.endDate)}
                </Text>
              </View>
            )}
            <View className="flex-row items-center gap-3">
              <Ionicons name="people-outline" size={18} color={APP_COLORS.textMuted} />
              <Text className="flex-1 text-sm text-foreground">
                {acceptedCount} deltagare
              </Text>
            </View>
            {isCreator && event.joinCode ? (
              <View className="flex-row items-center gap-3">
                <Ionicons name="key-outline" size={18} color={APP_COLORS.textMuted} />
                <Text className="flex-1 text-sm text-foreground">
                  Jaktkod: {event.joinCode}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <View className="gap-4">
          <View className="flex-row items-center justify-between gap-3 px-1">
            <Text className="text-lg font-semibold text-foreground">Tillåtet vilt</Text>
            {canEditAllowedGame ? (
              <View className="rounded-full bg-primary/10 px-2.5 py-1">
                <Text className="text-xs font-semibold text-primary">Redigerbar</Text>
              </View>
            ) : null}
          </View>

          {canEditAllowedGame ? (
            <AllowedGameEditCard
              eventId={eventId as Id<'events'>}
              initialRules={(event.allowedGame ?? []) as AllowedGameRule[]}
            />
          ) : (
            <AllowedGameDetails rules={event.allowedGame as AllowedGameRule[] | undefined} />
          )}
        </View>

        {isCreator ? (
          <Button
            variant="outline"
            onPress={() =>
              push({
                pathname: '/event/[eventId]/invite',
                params: { eventId },
              } as Href)
            }
            className="rounded-xl">
            <Ionicons name="person-add-outline" size={18} color={APP_COLORS.text} />
            <Text>Bjud in användare</Text>
          </Button>
        ) : null}

        <View className="gap-3">
          <Text className="px-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Deltagare
          </Text>

          {memberRows.length === 0 ? (
            <Card>
              <CardContent className="p-5">
                <Text className="text-center text-muted-foreground">Inga deltagare ännu.</Text>
              </CardContent>
            </Card>
          ) : (
            memberRows.map((member) => {
              const rowIsCurrentUser = member.userId === currentUser._id;
              const name = getDisplayName(
                member.user,
                rowIsCurrentUser ? currentUserDisplayFallback : undefined
              );
              const status = member.status as MemberStatus;
              const statusTone = getStatusTone(status);
              const rowIsCreator = member.userId === event.creatorId;
              const canRemove = isCreator && !rowIsCreator;
              const isPending = pendingUserId === member.userId;

              return (
                <Card key={member._id}>
                  <CardContent className="gap-3 p-4">
                    <View className="flex-row items-center gap-3">
                      <View className="size-11 items-center justify-center rounded-2xl bg-primary/10">
                        <Text className="text-sm font-semibold text-primary">
                          {getMemberInitials(name)}
                        </Text>
                      </View>

                      <View className="min-w-0 flex-1 gap-1">
                        <View className="min-w-0 flex-row items-center gap-2">
                          <Text
                            className="min-w-0 shrink text-base font-semibold text-foreground"
                            numberOfLines={1}>
                            {name}
                          </Text>
                          {rowIsCurrentUser ? (
                            <View className="rounded-full bg-primary px-2 py-0.5">
                              <Text className="text-[11px] font-semibold text-primary-foreground">
                                Du
                              </Text>
                            </View>
                          ) : null}
                        </View>
                        <Text className="text-sm text-muted-foreground" numberOfLines={1}>
                          {formatTrackingStatus(status, currentTime, member.lastSeenAt)}
                        </Text>
                      </View>

                      <View className={`rounded-full px-3 py-1 ${statusTone.container}`}>
                        <Text className={`text-xs font-semibold ${statusTone.text}`}>
                          {getRoleLabel(rowIsCreator, status)}
                        </Text>
                      </View>
                    </View>

                    {canRemove ? (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isPending}
                        onPress={() => confirmRemoveMember(member.userId, name, status)}
                        className="self-end rounded-xl">
                        <Text>{isPending ? 'Tar bort...' : 'Ta bort'}</Text>
                      </Button>
                    ) : null}
                  </CardContent>
                </Card>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}
