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
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type AssignmentMap = Record<string, Id<'users'>>;

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
      } ${muted ? 'opacity-50' : ''}`}>
      <Text
        className={`text-sm font-medium ${
          selected ? 'text-primary-foreground' : 'text-foreground'
        }`}>
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
  const [draftSatIdOverride, setDraftSatIdOverride] = useState<Id<'areaSats'> | null | undefined>();
  const [selectedTargetKeysOverride, setSelectedTargetKeysOverride] = useState<Set<string> | null>(null);
  const [excludedUserIdsOverride, setExcludedUserIdsOverride] = useState<Set<Id<'users'>> | null>(null);
  const [assignmentsOverride, setAssignmentsOverride] = useState<AssignmentMap | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const acceptedMembers = useMemo(
    () => (members ?? []).filter((member) => member.status === 'accepted' && member.user),
    [members]
  );
  const memberNameById = useMemo(() => {
    const names = new Map<Id<'users'>, string>();
    for (const member of acceptedMembers) {
      names.set(member.userId, member.user ? getUserDisplayName(member.user) : 'Okänd');
    }
    return names;
  }, [acceptedMembers]);
  const satById = useMemo(
    () => new Map((areaSats ?? []).map((sat) => [sat.id, sat])),
    [areaSats]
  );
  const requestedSatId = satId as Id<'areaSats'> | undefined;
  const initialSatId = useMemo(() => {
    if (requestedSatId && areaSats?.some((sat) => sat.id === requestedSatId)) {
      return requestedSatId;
    }
    return setup?.activeSatId ?? null;
  }, [areaSats, requestedSatId, setup?.activeSatId]);
  const draftSatId = draftSatIdOverride !== undefined ? draftSatIdOverride : initialSatId;
  const draftSat = draftSatId ? satById.get(draftSatId) ?? null : null;
  const passCandidates = useMemo(() => {
    if (!draftSat || !areaFeatures) {
      return [];
    }
    return getPassMarkersInsideSat(draftSat, areaFeatures);
  }, [areaFeatures, draftSat]);
  const initialSelectedTargetKeys = useMemo(() => {
    if (!draftSat || !areaFeatures) {
      return new Set<string>();
    }
    if (setup?.activeSatId === draftSat.id) {
      return new Set(setup.selectedTargetKeys);
    }
    return new Set(getPassMarkersInsideSat(draftSat, areaFeatures).map(getAreaFeatureTargetKey));
  }, [areaFeatures, draftSat, setup]);
  const initialExcludedUserIds = useMemo(
    () =>
      setup?.activeSatId === draftSatId
        ? new Set(setup.excludedUserIds)
        : new Set<Id<'users'>>(),
    [draftSatId, setup]
  );
  const initialAssignments = useMemo(
    () =>
      setup?.activeSatId === draftSatId
        ? (Object.fromEntries(
            setup.assignments.map((assignment) => [
              assignment.targetKey,
              assignment.assignedUserId,
            ])
          ) as AssignmentMap)
        : {},
    [draftSatId, setup]
  );
  const selectedTargetKeys = selectedTargetKeysOverride ?? initialSelectedTargetKeys;
  const excludedUserIds = excludedUserIdsOverride ?? initialExcludedUserIds;
  const assignments = assignmentsOverride ?? initialAssignments;
  const passByTargetKey = useMemo(
    () => new Map(passCandidates.map((pass) => [getAreaFeatureTargetKey(pass), pass])),
    [passCandidates]
  );
  const selectedPasses = useMemo(
    () => passCandidates.filter((pass) => selectedTargetKeys.has(getAreaFeatureTargetKey(pass))),
    [passCandidates, selectedTargetKeys]
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
    setDraftSatIdOverride(nextSatId);
    setSelectedTargetKeysOverride(
      new Set(
        sameAsActive
          ? setup.selectedTargetKeys
          : getPassMarkersInsideSat(nextSat, areaFeatures).map(getAreaFeatureTargetKey)
      )
    );
    setExcludedUserIdsOverride(new Set(sameAsActive ? setup.excludedUserIds : []));
    setAssignmentsOverride(
      sameAsActive
        ? Object.fromEntries(
            setup.assignments.map((assignment) => [
              assignment.targetKey,
              assignment.assignedUserId,
            ])
          )
        : {}
    );
    setErrorText(null);
  }

  function togglePass(targetKey: string) {
    setSelectedTargetKeysOverride((current) => {
      const next = new Set(current ?? selectedTargetKeys);
      if (next.has(targetKey)) {
        next.delete(targetKey);
        setAssignmentsOverride((currentAssignments) => {
          const updated = { ...(currentAssignments ?? assignments) };
          delete updated[targetKey];
          return updated;
        });
      } else {
        next.add(targetKey);
      }
      return next;
    });
  }

  function toggleHunter(userId: Id<'users'>) {
    setExcludedUserIdsOverride((current) => {
      const next = new Set(current ?? excludedUserIds);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
        setAssignmentsOverride((currentAssignments) =>
          Object.fromEntries(
            Object.entries(currentAssignments ?? assignments).filter(([, assignedUserId]) => assignedUserId !== userId)
          ) as AssignmentMap
        );
      }
      return next;
    });
  }

  function assignHunter(targetKey: string, userId: Id<'users'> | null) {
    setAssignmentsOverride((current) => {
      const next = Object.fromEntries(
        Object.entries(current ?? assignments).filter(
          ([candidateTargetKey, assignedUserId]) =>
            candidateTargetKey !== targetKey && assignedUserId !== userId
        )
      ) as AssignmentMap;
      if (userId) {
        next[targetKey] = userId;
      }
      return next;
    });
  }

  function randomizeAssignments() {
    const targetKeys = shuffle([...selectedTargetKeys]);
    const userIds = shuffle(
      acceptedMembers
        .map((member) => member.userId)
        .filter((userId) => !excludedUserIds.has(userId))
    );
    const nextAssignments: AssignmentMap = {};
    targetKeys.forEach((targetKey, index) => {
      const userId = userIds[index];
      if (userId) {
        nextAssignments[targetKey] = userId;
      }
    });
    setAssignmentsOverride(nextAssignments);
  }

  async function handleSave() {
    if (!draftSatId) {
      setErrorText('Välj såt.');
      return;
    }

    setIsSubmitting(true);
    setErrorText(null);
    try {
      await saveSetup({
        assignments: Object.entries(assignments)
          .filter(([targetKey]) => selectedTargetKeys.has(targetKey))
          .map(([targetKey, assignedUserId]) => ({ assignedUserId, targetKey })),
        eventId: eventId as Id<'events'>,
        excludedUserIds: [...excludedUserIds],
        satId: draftSatId,
        selectedTargetKeys: [...selectedTargetKeys],
      });
      back();
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : 'Kunde inte spara såten.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleClear() {
    setIsSubmitting(true);
    setErrorText(null);
    try {
      await clearSetup({ eventId: eventId as Id<'events'> });
      back();
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : 'Kunde inte rensa såten.');
    } finally {
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
      scrollIndicatorInsets={{ bottom: Math.max(insets.bottom, 24) }}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Stäng"
              hitSlop={12}
              onPress={back}>
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
                      draftSatId === sat.id ? 'border-primary bg-primary/5' : 'border-border bg-card'
                    }`}>
                    <View
                      className="size-4 rounded-full"
                      style={{ backgroundColor: sat.color }}
                    />
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
                    <Button variant="outline" className="h-10 rounded-2xl px-3" onPress={randomizeAssignments}>
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
                      }`}>
                      <View className="flex-row items-center justify-between gap-3">
                        <View className="min-w-0 flex-1">
                          <Text className="font-semibold" numberOfLines={1}>
                            {pass.name}
                          </Text>
                          <Text className="text-sm text-muted-foreground">
                            {selected
                              ? assignedName ?? 'Saknar jägare'
                              : 'Ingår inte'}
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
                        className="min-h-12 flex-row items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-2">
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
                    onPress={() => void handleSave()}>
                    <Text>{setup.activeSatId === draftSatId ? 'Spara' : 'Aktivera såt'}</Text>
                  </Button>
                  {setup.activeSatId ? (
                    <Button
                      variant="outline"
                      size="xl"
                      className="rounded-2xl"
                      disabled={isSubmitting}
                      onPress={() => void handleClear()}>
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
