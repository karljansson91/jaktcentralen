import { Button, Card, CardContent, Text } from '@/components/ui';
import { HuntInfoAdminFields, HuntInfoReadOnlyDetails } from '@/components/event/hunt-info-details';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { isValidEventDate, normalizeEventDate } from '@/lib/event-dates';
import { useCurrentTime } from '@/hooks/use-current-time';
import {
  getEventLifecycle,
  getEventLifecycleLabel,
  type EventLifecycle,
} from '@/lib/event-lifecycle';
import { getMemberInitials } from '@/lib/event-formatting';
import {
  createHuntInfoDraft,
  getHuntInfoDraftKey,
  type HuntInfoDraft,
} from '@/lib/hunt-info-draft';
import { validateJoinCode } from '@/lib/join-code';
import { APP_COLORS } from '@/lib/theme';
import { useUser } from '@clerk/expo';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery } from 'convex/react';
import { Href, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type MemberStatus = 'accepted' | 'invited' | 'declined';
type HuntInfoSaveStatus = 'idle' | 'saving' | 'saved';
type HuntInfoDraftState = {
  draft: HuntInfoDraft;
  sourceKey: string;
};

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
  const updateEvent = useMutation(api.events.update);
  const savedDraft = useMemo(() => (event ? createHuntInfoDraft(event) : null), [event]);
  const savedDraftKey = useMemo(
    () => (savedDraft ? getHuntInfoDraftKey(savedDraft) : ''),
    [savedDraft]
  );
  const [draftState, setDraftState] = useState<HuntInfoDraftState | null>(null);
  const [saveStatus, setSaveStatus] = useState<HuntInfoSaveStatus>('idle');

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
  const activeDraft = draftState?.sourceKey === savedDraftKey ? draftState.draft : savedDraft;
  const activeDraftKey = activeDraft ? getHuntInfoDraftKey(activeDraft) : '';
  const hasDraftChanges = Boolean(activeDraft && activeDraftKey !== savedDraftKey);
  const isSaving = saveStatus === 'saving';
  const statusLabel = event
    ? getEventStatus(event.startDate, event.endDate, currentTime, event.endedAt)
    : '';

  useEffect(() => {
    if (saveStatus !== 'saved') {
      return;
    }

    const timeout = setTimeout(() => setSaveStatus('idle'), 1400);
    return () => clearTimeout(timeout);
  }, [saveStatus]);

  const handleResetDraft = useCallback(() => {
    setDraftState(null);
    setSaveStatus('idle');
  }, []);

  const handleDraftChange = useCallback(
    (nextDraft: HuntInfoDraft) => {
      setDraftState({ draft: nextDraft, sourceKey: savedDraftKey });
      setSaveStatus('idle');
    },
    [savedDraftKey]
  );

  const handleSaveDraft = useCallback(async () => {
    if (!activeDraft) {
      return;
    }

    const startDate = normalizeEventDate(activeDraft.startDate);
    const endDate = normalizeEventDate(activeDraft.endDate);

    if (!activeDraft.title.trim()) {
      Alert.alert('Fel', 'Titel krävs.');
      return;
    }
    if (!isValidEventDate(startDate)) {
      Alert.alert('Fel', 'Välj ett startdatum.');
      return;
    }
    if (!isValidEventDate(endDate)) {
      Alert.alert('Fel', 'Välj ett slutdatum.');
      return;
    }
    if (endDate.getTime() < startDate.getTime()) {
      Alert.alert('Fel', 'Slutdatum kan inte vara före startdatum.');
      return;
    }

    const joinCodeError = validateJoinCode(activeDraft.joinCode);
    if (joinCodeError) {
      Alert.alert('Fel', joinCodeError);
      return;
    }

    setSaveStatus('saving');
    try {
      await updateEvent({
        eventId: eventId as Id<'events'>,
        title: activeDraft.title.trim(),
        description: activeDraft.description.trim(),
        startDate: startDate.getTime(),
        endDate: endDate.getTime(),
        joinCode: activeDraft.joinCode.trim(),
        allowedGame: activeDraft.allowedGame,
      });
      setSaveStatus('saved');
    } catch (error) {
      setSaveStatus('idle');
      Alert.alert(
        'Kunde inte spara',
        error instanceof Error ? error.message : 'Försök igen om en stund.'
      );
    }
  }, [activeDraft, eventId, updateEvent]);

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
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        className="flex-1 bg-background"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="gap-6 px-5"
        contentContainerStyle={{
          paddingBottom: 16,
          paddingTop: 0,
        }}
        contentInset={{ bottom: Math.max(insets.bottom, 16) + (isCreator ? 80 : 0) }}
        scrollIndicatorInsets={{ bottom: Math.max(insets.bottom, 16) + (isCreator ? 80 : 0) }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {isCreator && activeDraft ? (
          <HuntInfoAdminFields
            acceptedCount={acceptedCount}
            areaName={area.name}
            disabled={isSaving}
            draft={activeDraft}
            onChange={handleDraftChange}
            statusLabel={statusLabel}
          />
        ) : (
          <HuntInfoReadOnlyDetails
            acceptedCount={acceptedCount}
            areaName={area.name}
            event={event}
            statusLabel={statusLabel}
          />
        )}

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

      {isCreator && activeDraft ? (
        <View
          className="border-t border-border bg-background px-6 pt-3"
          style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
          <View className="flex-row items-center gap-3">
            <Button
              variant="ghost"
              className="h-12 flex-1 rounded-xl"
              disabled={!hasDraftChanges || isSaving}
              onPress={handleResetDraft}>
              <Text className="text-muted-foreground">Återställ</Text>
            </Button>

            <Button
              className="h-12 flex-1 rounded-xl"
              disabled={!hasDraftChanges || isSaving}
              onPress={() => void handleSaveDraft()}>
              <Text>{isSaving ? 'Sparar...' : saveStatus === 'saved' ? 'Sparat' : 'Spara'}</Text>
            </Button>
          </View>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}
