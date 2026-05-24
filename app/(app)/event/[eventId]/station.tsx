import { Button, Text } from '@/components/ui';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import {
  AREA_FEATURE_CATEGORY_LABELS,
  getAreaFeatureTargetKey,
} from '@/lib/area-features';
import { APP_COLORS } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery } from 'convex/react';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function EventStationAssignmentScreen() {
  const { eventId, targetKey } = useLocalSearchParams<{
    eventId: string;
    targetKey?: string;
  }>();
  const insets = useSafeAreaInsets();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const decodedTargetKey = typeof targetKey === 'string' ? decodeURIComponent(targetKey) : '';
  const event = useQuery(api.events.get, { eventId: eventId as Id<'events'> });
  const currentUser = useQuery(api.users.getCurrentUserProfile);
  const members = useQuery(
    api.eventMembers.listMembers,
    event ? { eventId: eventId as Id<'events'> } : 'skip'
  );
  const assignments = useQuery(
    api.eventPointAssignments.listByEvent,
    event ? { eventId: eventId as Id<'events'> } : 'skip'
  );
  const areaFeatures = useQuery(
    api.areaFeatures.listForEvent,
    event ? { eventId: eventId as Id<'events'> } : 'skip'
  );
  const assign = useMutation(api.eventPointAssignments.assign);
  const clear = useMutation(api.eventPointAssignments.clear);

  const feature = useMemo(
    () =>
      areaFeatures?.find(
        (candidate) =>
          candidate.geometryType === 'point' &&
          getAreaFeatureTargetKey(candidate) === decodedTargetKey
      ),
    [areaFeatures, decodedTargetKey]
  );
  const assignment = useMemo(
    () => assignments?.find((candidate) => candidate.targetKey === decodedTargetKey),
    [assignments, decodedTargetKey]
  );

  const acceptedMembers = useMemo(
    () => (members ?? []).filter((member) => member.status === 'accepted' && member.user),
    [members]
  );

  const featureNameByTargetKey = useMemo(() => {
    const names = new Map<string, string>();

    for (const areaFeature of areaFeatures ?? []) {
      if (areaFeature.geometryType === 'point') {
        names.set(getAreaFeatureTargetKey(areaFeature), areaFeature.name);
      }
    }

    return names;
  }, [areaFeatures]);

  async function handleAssign(assignedUserId: Id<'users'>) {
    setIsSubmitting(true);
    try {
      await assign({
        assignedUserId,
        eventId: eventId as Id<'events'>,
        targetKey: decodedTargetKey,
      });
    } catch (error) {
      Alert.alert(
        'Kunde inte tilldela pass',
        error instanceof Error ? error.message : 'Försök igen om en stund.'
      );
    }
    setIsSubmitting(false);
  }

  async function handleClear() {
    setIsSubmitting(true);
    try {
      await clear({
        eventId: eventId as Id<'events'>,
        targetKey: decodedTargetKey,
      });
    } catch (error) {
      Alert.alert(
        'Kunde inte ta bort tilldelning',
        error instanceof Error ? error.message : 'Försök igen om en stund.'
      );
    }
    setIsSubmitting(false);
  }

  function handleToggleAssignment(assignedUserId: Id<'users'>) {
    if (assignment?.assignedUserId === assignedUserId) {
      void handleClear();
      return;
    }

    void handleAssign(assignedUserId);
  }

  if (
    event === undefined ||
    currentUser === undefined ||
    members === undefined ||
    assignments === undefined ||
    areaFeatures === undefined
  ) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="small" color={APP_COLORS.primary} />
      </View>
    );
  }

  if (event === null || currentUser === null || !feature) {
    return (
      <View className="flex-1 bg-background px-6 pt-5">
        <View className="flex-1 items-center justify-center">
          <Text className="text-center text-muted-foreground">Passet kunde inte hittas.</Text>
        </View>
      </View>
    );
  }

  const isCreator = event.creatorId === currentUser._id;
  const canEdit = isCreator && event.endedAt === undefined;

  return (
    <View
      className="flex-1 bg-background px-6 pt-5"
      style={{ paddingBottom: Math.max(insets.bottom, 16) + 16 }}
      collapsable={false}>
      <View className="gap-5" collapsable={false}>
        <View className="gap-1">
          <Text variant="h3" className="text-left">
            {feature.name}
          </Text>
          <Text className="text-sm text-muted-foreground">
            {AREA_FEATURE_CATEGORY_LABELS[feature.category]} · tilldelning för jakten
          </Text>
        </View>

        {feature.description ? (
          <Text className="text-sm leading-5 text-muted-foreground">{feature.description}</Text>
        ) : null}

        {feature.images.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-3">
              {feature.images.map((image) => (
                <Image
                  key={image.fileId}
                  source={{ uri: image.url }}
                  className="size-28 rounded-2xl bg-muted"
                />
              ))}
            </View>
          </ScrollView>
        ) : null}

        {canEdit ? (
          <View className="gap-3">
            {acceptedMembers.map((member) => {
              const isAssigned = assignment?.assignedUserId === member.userId;
              const otherAssignment = assignments.find(
                (candidate) =>
                  candidate.assignedUserId === member.userId &&
                  candidate.targetKey !== decodedTargetKey
              );
              const otherAssignmentName = otherAssignment
                ? featureNameByTargetKey.get(otherAssignment.targetKey)
                : undefined;
              const subtitle = isAssigned
                ? undefined
                : otherAssignmentName
                  ? otherAssignmentName
                  : undefined;

              return (
                <Button
                  key={member._id}
                  variant={isAssigned ? 'default' : 'outline'}
                  onPress={() => handleToggleAssignment(member.userId)}
                  disabled={isSubmitting}
                  className="h-auto justify-between rounded-2xl px-4 py-3">
                  <View className="min-w-0 flex-1 items-start">
                    <Text
                      className={`text-left text-base font-semibold ${
                        isAssigned ? 'text-primary-foreground' : ''
                      }`}>
                      {member.user?.name ?? 'Okänd'}
                    </Text>
                    {subtitle ? (
                      <Text className="text-left text-xs text-muted-foreground">{subtitle}</Text>
                    ) : null}
                  </View>
                  <Ionicons
                    name={
                      isAssigned
                        ? 'checkmark-circle'
                        : otherAssignmentName
                          ? 'swap-horizontal'
                          : 'radio-button-off'
                    }
                    size={22}
                    color={
                      isAssigned
                        ? APP_COLORS.surface
                        : otherAssignmentName
                          ? APP_COLORS.primary
                          : APP_COLORS.textMuted
                    }
                  />
                </Button>
              );
            })}
          </View>
        ) : (
          <View className="rounded-3xl border border-border bg-card p-4">
            <Text className="text-sm leading-5 text-muted-foreground">
              {event.endedAt !== undefined
                ? 'Jakten är avslutad, så tilldelningar kan inte ändras.'
                : 'Endast jaktens skapare kan ändra tilldelningar.'}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}
