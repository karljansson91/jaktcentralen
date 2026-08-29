import { Button, Text } from '@/components/ui';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { getAreaFeatureTargetKey } from '@/lib/area-features';
import { getPassMarkersInsideSat } from '@/lib/area-sats';
import { getEventLifecycle } from '@/lib/event-lifecycle';
import { getUserDisplayName } from '@/lib/user-profile';
import { APP_COLORS } from '@/lib/theme';
import { useCurrentTime } from '@/hooks/use-current-time';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery } from 'convex/react';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useReducer, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type AssignmentMap = Record<string, Id<'users'>>;

type SatDraftState = {
  assignmentsOverride: AssignmentMap | null;
  draftSatIdOverride: Id<'areaSats'> | null | undefined;
  errorText: string | null;
  excludedUserIdsOverride: Set<Id<'users'>> | null;
  selectedTargetKeysOverride: Set<string> | null;
};

type SatDraftAction =
  | {
      type: 'select-sat';
      assignments: AssignmentMap;
      excludedUserIds: Set<Id<'users'>>;
      satId: Id<'areaSats'>;
      selectedTargetKeys: Set<string>;
    }
  | {
      type: 'toggle-pass';
      assignments: AssignmentMap;
      selectedTargetKeys: Set<string>;
      targetKey: string;
    }
  | {
      type: 'toggle-hunter';
      assignments: AssignmentMap;
      excludedUserIds: Set<Id<'users'>>;
      userId: Id<'users'>;
    }
  | {
      type: 'assign-hunter';
      assignments: AssignmentMap;
      targetKey: string;
      userId: Id<'users'> | null;
    }
  | { type: 'replace-assignments'; assignments: AssignmentMap }
  | { type: 'set-error'; message: string | null };

const initialSatDraftState: SatDraftState = {
  assignmentsOverride: null,
  draftSatIdOverride: undefined,
  errorText: null,
  excludedUserIdsOverride: null,
  selectedTargetKeysOverride: null,
};

function satDraftReducer(state: SatDraftState, action: SatDraftAction): SatDraftState {
  switch (action.type) {
    case 'select-sat':
      return {
        assignmentsOverride: action.assignments,
        draftSatIdOverride: action.satId,
        errorText: null,
        excludedUserIdsOverride: action.excludedUserIds,
        selectedTargetKeysOverride: action.selectedTargetKeys,
      };
    case 'toggle-pass': {
      const selectedTargetKeysOverride = new Set(action.selectedTargetKeys);
      if (!selectedTargetKeysOverride.delete(action.targetKey)) {
        selectedTargetKeysOverride.add(action.targetKey);
        return { ...state, selectedTargetKeysOverride };
      }

      const assignmentsOverride = { ...action.assignments };
      delete assignmentsOverride[action.targetKey];
      return { ...state, assignmentsOverride, selectedTargetKeysOverride };
    }
    case 'toggle-hunter': {
      const excludedUserIdsOverride = new Set(action.excludedUserIds);
      if (excludedUserIdsOverride.delete(action.userId)) {
        return { ...state, excludedUserIdsOverride };
      }

      excludedUserIdsOverride.add(action.userId);
      const assignmentsOverride = Object.fromEntries(
        Object.entries(action.assignments).filter(
          ([, assignedUserId]) => assignedUserId !== action.userId
        )
      ) as AssignmentMap;
      return { ...state, assignmentsOverride, excludedUserIdsOverride };
    }
    case 'assign-hunter': {
      const assignmentsOverride = Object.fromEntries(
        Object.entries(action.assignments).filter(
          ([candidateTargetKey, assignedUserId]) =>
            candidateTargetKey !== action.targetKey && assignedUserId !== action.userId
        )
      ) as AssignmentMap;
      if (action.userId) {
        assignmentsOverride[action.targetKey] = action.userId;
      }
      return { ...state, assignmentsOverride };
    }
    case 'replace-assignments':
      return { ...state, assignmentsOverride: action.assignments };
    case 'set-error':
      return { ...state, errorText: action.message };
  }
}

function shuffle<T>(items: T[]) {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}

function Chip({
  label,
  muted,
  selected,
  onPress,
}: {
  label: string;
  muted?: boolean;
  selected?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className={`rounded-full border px-3 py-1.5 ${
        selected ? 'border-primary bg-primary' : 'border-border bg-card'
      } ${muted ? 'opacity-50' : ''}`}
    >
      <Text
        className={`text-sm font-medium ${
          selected ? 'text-primary-foreground' : 'text-foreground'
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function EventSatScreen() {
  const { eventId, satId } = useLocalSearchParams<{
    eventId: string;
    satId?: string;
  }>();
  const { back } = useRouter();
  const insets = useSafeAreaInsets();
  const currentTime = useCurrentTime(60_000);
  const event = useQuery(api.events.get, { eventId: eventId as Id<'events'> });
  const currentUser = useQuery(api.users.getCurrentUserProfile);
  const members = useQuery(
    api.eventMembers.listMembers,
    event ? { eventId: eventId as Id<'events'> } : 'skip'
  );
  const areaFeatures = useQuery(
    api.areaFeatures.listForEvent,
    event ? { eventId: eventId as Id<'events'> } : 'skip'
  );
  const areaSats = useQuery(
    api.areaSats.listForEvent,
    event ? { eventId: eventId as Id<'events'> } : 'skip'
  );
  const setup = useQuery(
    api.eventSats.getSetup,
    event ? { eventId: eventId as Id<'events'> } : 'skip'
  );
  const saveSetup = useMutation(api.eventSats.saveSetup);
  const clearSetup = useMutation(api.eventSats.clearSetup);
  const [draftState, dispatchDraft] = useReducer(satDraftReducer, initialSatDraftState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    assignmentsOverride,
    draftSatIdOverride,
    errorText,
    excludedUserIdsOverride,
    selectedTargetKeysOverride,
  } = draftState;

  const acceptedMembers = (members ?? []).filter(
    (member) => member.status === 'accepted' && member.user
  );
  const memberNameById = (() => {
    const names = new Map<Id<'users'>, string>();
    for (const member of acceptedMembers) {
      names.set(member.userId, member.user ? getUserDisplayName(member.user) : 'Okänd');
    }
    return names;
  })();
  const satById = new Map((areaSats ?? []).map((sat) => [sat.id, sat]));
  const requestedSatId = satId as Id<'areaSats'> | undefined;
  const initialSatId = (() => {
    if (requestedSatId && areaSats?.some((sat) => sat.id === requestedSatId)) {
      return requestedSatId;
    }
    return setup?.activeSatId ?? null;
  })();
  const draftSatId = draftSatIdOverride !== undefined ? draftSatIdOverride : initialSatId;
  const draftSat = draftSatId ? (satById.get(draftSatId) ?? null) : null;
  const passCandidates = (() => {
    if (!draftSat || !areaFeatures) {
      return [];
    }
    return getPassMarkersInsideSat(draftSat, areaFeatures);
  })();
  const initialSelectedTargetKeys = (() => {
    if (!draftSat || !areaFeatures) {
      return new Set<string>();
    }
    if (setup?.activeSatId === draftSat.id) {
      return new Set(setup.selectedTargetKeys);
    }
    return new Set(getPassMarkersInsideSat(draftSat, areaFeatures).map(getAreaFeatureTargetKey));
  })();
  const initialExcludedUserIds =
    setup?.activeSatId === draftSatId ? new Set(setup.excludedUserIds) : new Set<Id<'users'>>();
  const initialAssignments =
    setup?.activeSatId === draftSatId
      ? (Object.fromEntries(
          setup.assignments.map((assignment) => [assignment.targetKey, assignment.assignedUserId])
        ) as AssignmentMap)
      : {};
  const selectedTargetKeys = selectedTargetKeysOverride ?? initialSelectedTargetKeys;
  const excludedUserIds = excludedUserIdsOverride ?? initialExcludedUserIds;
  const assignments = assignmentsOverride ?? initialAssignments;
  const passByTargetKey = new Map(
    passCandidates.map((pass) => [getAreaFeatureTargetKey(pass), pass])
  );
  const selectedPasses = passCandidates.filter((pass) =>
    selectedTargetKeys.has(getAreaFeatureTargetKey(pass))
  );
  const unassignedSelectedPassCount = selectedPasses.filter(
    (pass) => !assignments[getAreaFeatureTargetKey(pass)]
  ).length;

  const isEnded = event ? getEventLifecycle(event, currentTime) === 'ended' : false;
  const isCreator = Boolean(event && currentUser && event.creatorId === currentUser._id);
  const canEdit = isCreator && !isEnded;

  function selectSat(nextSatId: Id<'areaSats'>) {
    const nextSat = satById.get(nextSatId);
    if (!nextSat || !areaFeatures) {
      return;
    }

    const sameAsActive = setup?.activeSatId === nextSatId;
    dispatchDraft({
      type: 'select-sat',
      assignments: sameAsActive
        ? (Object.fromEntries(
            setup.assignments.map((assignment) => [assignment.targetKey, assignment.assignedUserId])
          ) as AssignmentMap)
        : {},
      excludedUserIds: new Set(sameAsActive ? setup.excludedUserIds : []),
      satId: nextSatId,
      selectedTargetKeys: new Set(
        sameAsActive
          ? setup.selectedTargetKeys
          : getPassMarkersInsideSat(nextSat, areaFeatures).map(getAreaFeatureTargetKey)
      ),
    });
  }

  function togglePass(targetKey: string) {
    dispatchDraft({
      type: 'toggle-pass',
      assignments,
      selectedTargetKeys,
      targetKey,
    });
  }

  function toggleHunter(userId: Id<'users'>) {
    dispatchDraft({
      type: 'toggle-hunter',
      assignments,
      excludedUserIds,
      userId,
    });
  }

  function assignHunter(targetKey: string, userId: Id<'users'> | null) {
    dispatchDraft({
      type: 'assign-hunter',
      assignments,
      targetKey,
      userId,
    });
  }

  function randomizeAssignments() {
    const targetKeys = shuffle([...selectedTargetKeys]);
    const availableUserIds: Id<'users'>[] = [];
    for (const member of acceptedMembers) {
      if (!excludedUserIds.has(member.userId)) {
        availableUserIds.push(member.userId);
      }
    }
    const userIds = shuffle(availableUserIds);
    const nextAssignments: AssignmentMap = {};
    targetKeys.forEach((targetKey, index) => {
      const userId = userIds[index];
      if (userId) {
        nextAssignments[targetKey] = userId;
      }
    });
    dispatchDraft({ type: 'replace-assignments', assignments: nextAssignments });
  }

  async function handleSave() {
    if (!draftSatId) {
      dispatchDraft({ type: 'set-error', message: 'Välj såt.' });
      return;
    }

    const selectedAssignments: { assignedUserId: Id<'users'>; targetKey: string }[] = [];
    for (const [targetKey, assignedUserId] of Object.entries(assignments)) {
      if (selectedTargetKeys.has(targetKey)) {
        selectedAssignments.push({ assignedUserId, targetKey });
      }
    }

    setIsSubmitting(true);
    dispatchDraft({ type: 'set-error', message: null });
    try {
      await saveSetup({
        assignments: selectedAssignments,
        eventId: eventId as Id<'events'>,
        excludedUserIds: [...excludedUserIds],
        satId: draftSatId,
        selectedTargetKeys: [...selectedTargetKeys],
      });
      setIsSubmitting(false);
      back();
    } catch (error) {
      dispatchDraft({
        type: 'set-error',
        message: error instanceof Error ? error.message : 'Kunde inte spara såten.',
      });
      setIsSubmitting(false);
    }
  }

  async function handleClear() {
    setIsSubmitting(true);
    dispatchDraft({ type: 'set-error', message: null });
    try {
      await clearSetup({ eventId: eventId as Id<'events'> });
      setIsSubmitting(false);
      back();
    } catch (error) {
      dispatchDraft({
        type: 'set-error',
        message: error instanceof Error ? error.message : 'Kunde inte rensa såten.',
      });
      setIsSubmitting(false);
    }
  }

  if (
    event === undefined ||
    currentUser === undefined ||
    members === undefined ||
    areaFeatures === undefined ||
    areaSats === undefined ||
    setup === undefined
  ) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="small" color={APP_COLORS.primary} />
      </View>
    );
  }

  if (event === null || currentUser === null) {
    return (
      <View className="flex-1 items-center justify-center bg-background p-6">
        <Text>Jakten kunde inte hittas.</Text>
      </View>
    );
  }

  const ownAssignment = setup.assignments.find(
    (assignment) => assignment.assignedUserId === currentUser._id
  );
  const ownPass = ownAssignment ? passByTargetKey.get(ownAssignment.targetKey) : null;

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{
        gap: 22,
        paddingBottom: 28,
        paddingHorizontal: 22,
        paddingTop: 22,
      }}
      contentInset={{ bottom: Math.max(insets.bottom, 24) }}
      scrollIndicatorInsets={{ bottom: Math.max(insets.bottom, 24) }}
    >
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Stäng"
              hitSlop={12}
              onPress={back}
            >
              <Ionicons name="close" size={24} color={APP_COLORS.text} />
            </Pressable>
          ),
        }}
      />

      {isEnded ? (
        <Text className="text-sm text-muted-foreground">Såt visas inte för avslutade jakter.</Text>
      ) : null}

      {!isEnded && (
        <>
          <View className="gap-3">
            <Text className="font-medium">Såt</Text>
            {areaSats.length === 0 ? (
              <View className="rounded-2xl border border-border bg-card p-4">
                <Text className="text-sm text-muted-foreground">
                  Skapa såtar från området först.
                </Text>
              </View>
            ) : (
              <View className="gap-2">
                {areaSats.map((sat) => (
                  <Pressable
                    key={sat.id}
                    accessibilityRole="button"
                    disabled={!canEdit}
                    onPress={() => selectSat(sat.id)}
                    className={`min-h-14 flex-row items-center gap-3 rounded-2xl border px-4 py-3 ${
                      draftSatId === sat.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border bg-card'
                    }`}
                  >
                    <View className="size-4 rounded-full" style={{ backgroundColor: sat.color }} />
                    <View className="min-w-0 flex-1">
                      <Text className="font-semibold" numberOfLines={1}>
                        {sat.name}
                      </Text>
                    </View>
                    {draftSatId === sat.id ? (
                      <Ionicons name="checkmark-circle" size={22} color={APP_COLORS.primary} />
                    ) : null}
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          {draftSat ? (
            <>
              {ownPass && !canEdit ? (
                <View className="rounded-2xl border border-primary bg-primary/5 p-4">
                  <Text className="text-sm text-muted-foreground">Ditt pass</Text>
                  <Text className="mt-1 text-lg font-semibold">{ownPass.name}</Text>
                </View>
              ) : null}

              <View className="gap-3">
                <View className="flex-row items-center justify-between gap-3">
                  <Text className="font-medium">Pass i såten</Text>
                  {canEdit ? (
                    <Button
                      variant="outline"
                      className="h-10 rounded-2xl px-3"
                      onPress={randomizeAssignments}
                    >
                      <Text>Slumpa tilldelning</Text>
                    </Button>
                  ) : null}
                </View>

                {passCandidates.map((pass) => {
                  const targetKey = getAreaFeatureTargetKey(pass);
                  const selected = selectedTargetKeys.has(targetKey);
                  const assignedUserId = assignments[targetKey];
                  const assignedName = assignedUserId ? memberNameById.get(assignedUserId) : null;

                  return (
                    <View
                      key={targetKey}
                      className={`gap-3 rounded-2xl border p-4 ${
                        selected ? 'border-primary/40 bg-card' : 'border-border bg-muted/40'
                      }`}
                    >
                      <View className="flex-row items-center justify-between gap-3">
                        <View className="min-w-0 flex-1">
                          <Text className="font-semibold" numberOfLines={1}>
                            {pass.name}
                          </Text>
                          <Text className="text-sm text-muted-foreground">
                            {selected ? (assignedName ?? 'Saknar jägare') : 'Ingår inte'}
                          </Text>
                        </View>
                        {canEdit ? (
                          <Switch value={selected} onValueChange={() => togglePass(targetKey)} />
                        ) : null}
                      </View>

                      {selected && canEdit ? (
                        <View className="flex-row flex-wrap gap-2">
                          <Chip
                            label="Ingen"
                            selected={!assignedUserId}
                            onPress={() => assignHunter(targetKey, null)}
                          />
                          {acceptedMembers.map((member) => (
                            <Chip
                              key={member.userId}
                              label={member.user ? getUserDisplayName(member.user) : 'Okänd'}
                              muted={excludedUserIds.has(member.userId)}
                              selected={assignedUserId === member.userId}
                              onPress={() => {
                                if (canEdit && !excludedUserIds.has(member.userId)) {
                                  assignHunter(targetKey, member.userId);
                                }
                              }}
                            />
                          ))}
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </View>

              {canEdit ? (
                <View className="gap-3">
                  <Text className="font-medium">Jägare i slumpning</Text>
                  <View className="gap-2">
                    {acceptedMembers.map((member) => (
                      <Pressable
                        key={member.userId}
                        accessibilityRole="button"
                        onPress={() => toggleHunter(member.userId)}
                        className="min-h-12 flex-row items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-2"
                      >
                        <Text className="font-medium">
                          {member.user ? getUserDisplayName(member.user) : 'Okänd'}
                        </Text>
                        <Switch
                          value={!excludedUserIds.has(member.userId)}
                          onValueChange={() => toggleHunter(member.userId)}
                        />
                      </Pressable>
                    ))}
                  </View>
                </View>
              ) : null}

              <Text className="text-sm text-muted-foreground">
                {selectedPasses.length === 0
                  ? passCandidates.length === 0
                    ? 'Inga pass i såten.'
                    : 'Inga pass valda.'
                  : unassignedSelectedPassCount > 0
                    ? `${unassignedSelectedPassCount} pass saknar jägare`
                    : 'Alla valda pass har jägare'}
              </Text>

              {errorText ? <Text className="text-sm text-destructive">{errorText}</Text> : null}

              {canEdit ? (
                <View className="gap-3">
                  <Button
                    size="xl"
                    className="rounded-2xl"
                    disabled={isSubmitting}
                    onPress={() => void handleSave()}
                  >
                    <Text>{setup.activeSatId === draftSatId ? 'Spara' : 'Aktivera såt'}</Text>
                  </Button>
                  {setup.activeSatId ? (
                    <Button
                      variant="outline"
                      size="xl"
                      className="rounded-2xl"
                      disabled={isSubmitting}
                      onPress={() => void handleClear()}
                    >
                      <Text>Rensa aktiv såt</Text>
                    </Button>
                  ) : null}
                </View>
              ) : null}
            </>
          ) : (
            <View className="rounded-2xl border border-border bg-card p-4">
              <Text className="text-sm text-muted-foreground">Ingen aktiv såt.</Text>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}
