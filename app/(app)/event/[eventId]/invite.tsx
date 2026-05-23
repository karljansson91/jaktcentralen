import { Button, Text } from '@/components/ui';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { APP_COLORS } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery } from 'convex/react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function EventInviteScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [pendingUserId, setPendingUserId] = useState<Id<'users'> | null>(null);
  const [invitedUserIds, setInvitedUserIds] = useState<Set<Id<'users'>>>(new Set());

  const event = useQuery(api.events.get, {
    eventId: eventId as Id<'events'>,
  });
  const friends = useQuery(api.friends.listFriends);
  const members = useQuery(
    api.eventMembers.listMembers,
    event ? { eventId: eventId as Id<'events'> } : 'skip'
  );
  const currentUser = useQuery(api.users.getCurrentUserProfile);
  const inviteMember = useMutation(api.eventMembers.invite);

  const memberUserIds = useMemo(
    () => new Set((members ?? []).map((member) => member.userId)),
    [members]
  );
  const currentMember = members?.find((member) => member.userId === currentUser?._id);
  const isAdmin = currentMember?.role === 'admin';
  const friendRows = useMemo(
    () => (friends ?? []).filter((friend) => friend.user),
    [friends]
  );

  const handleInvite = useCallback(
    async (userId: Id<'users'>) => {
      setPendingUserId(userId);
      try {
        await inviteMember({ eventId: eventId as Id<'events'>, userId });
        setInvitedUserIds((previous) => {
          const next = new Set(previous);
          next.add(userId);
          return next;
        });
      } catch (error) {
        Alert.alert(
          'Kunde inte bjuda in',
          error instanceof Error ? error.message : 'Försök igen om en stund.'
        );
      } finally {
        setPendingUserId(null);
      }
    },
    [eventId, inviteMember]
  );

  if (
    event === undefined ||
    friends === undefined ||
    (event && members === undefined) ||
    currentUser === undefined
  ) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="small" color={APP_COLORS.primary} />
      </View>
    );
  }

  if (event === null || currentUser === null) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6">
        <Text className="text-center text-muted-foreground">
          Kunde inte ladda inbjudningar för den här jakten.
        </Text>
      </View>
    );
  }

  if (!isAdmin) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6">
        <Text className="text-center text-muted-foreground">
          Bara administratörer kan bjuda in fler till jakten.
        </Text>
      </View>
    );
  }

  return (
    <View
      className="flex-1 bg-background px-5 pt-5"
      style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
      <Text className="mb-2 text-[28px] font-medium leading-[34px] text-foreground">
        Bjud in fler
      </Text>
      <Text className="mb-5 text-base text-muted-foreground">
        Välj vänner att bjuda in till jakten.
      </Text>

      <FlatList
        data={friendRows}
        keyExtractor={(item) => item.friendshipId}
        contentContainerClassName="gap-3 pb-5"
        ListEmptyComponent={
          <Text className="mt-8 text-center text-muted-foreground">
            Inga vänner att bjuda in ännu
          </Text>
        }
        renderItem={({ item }) => {
          const user = item.user!;
          const isMember = memberUserIds.has(user._id);
          const isInvited = invitedUserIds.has(user._id);
          const isPending = pendingUserId === user._id;
          const disabled = isMember || isInvited || isPending;
          const label = isMember ? 'Redan med' : isInvited ? 'Inbjuden' : isPending ? 'Bjuder in...' : 'Bjud in';

          return (
            <View className="flex-row items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3">
              <View className="h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Ionicons name="person" size={20} color={APP_COLORS.primary} />
              </View>
              <View className="min-w-0 flex-1">
                <Text className="text-base font-semibold text-foreground" numberOfLines={1}>
                  {user.name || 'Okänd'}
                </Text>
                <Text className="text-sm text-muted-foreground" numberOfLines={1}>
                  {user.email || 'Vän'}
                </Text>
              </View>
              <Button
                variant={disabled ? 'outline' : 'default'}
                size="sm"
                onPress={() => void handleInvite(user._id)}
                disabled={disabled}>
                <Text>{label}</Text>
              </Button>
            </View>
          );
        }}
      />

      <Button variant="ghost" size="xl" onPress={() => router.back()} className="rounded-xl">
        <Text>Stäng</Text>
      </Button>
    </View>
  );
}
