import { Button, Card, CardContent, Input, Text } from '@/components/ui';
import { api } from '@/convex/_generated/api';
import { Doc, Id } from '@/convex/_generated/dataModel';
import { getMemberInitials } from '@/lib/event-formatting';
import { APP_COLORS } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery } from 'convex/react';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useDeferredValue, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Share,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type InviteStatus = 'accepted' | 'invited' | 'declined';
type InviteUser = Doc<'users'>;

function isInviteUser(user: InviteUser | null | undefined): user is InviteUser {
  return !!user;
}

function getDisplayName(user: InviteUser | null | undefined) {
  return user?.name?.trim() || user?.email || 'Okänd användare';
}

function getInviteLabel(status: InviteStatus | undefined, isPending: boolean) {
  if (status === 'accepted') {
    return 'Med';
  }
  if (status === 'invited') {
    return 'Inbjuden';
  }
  if (isPending) {
    return 'Bjuder in...';
  }
  if (status === 'declined') {
    return 'Bjud in igen';
  }
  return 'Bjud in';
}

function getInviteSubtitle(user: InviteUser, status: InviteStatus | undefined) {
  if (status === 'accepted') {
    return 'Deltar i jakten';
  }
  if (status === 'invited') {
    return 'Inbjudan skickad';
  }
  if (status === 'declined') {
    return 'Har tidigare tackat nej';
  }
  return user.email || 'Användare';
}

type InviteUserRowProps = {
  user: InviteUser;
  status: InviteStatus | undefined;
  isPending: boolean;
  onInvite: (userId: Id<'users'>) => void;
};

function InviteUserRow({ user, status, isPending, onInvite }: InviteUserRowProps) {
  const isDisabled = status === 'accepted' || status === 'invited' || isPending;
  const name = getDisplayName(user);

  return (
    <View className="flex-row items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3">
      <View className="h-10 w-10 items-center justify-center rounded-2xl bg-primary/10">
        <Text className="text-sm font-semibold text-primary">
          {getMemberInitials(name)}
        </Text>
      </View>
      <View className="min-w-0 flex-1 gap-0.5">
        <Text className="text-base font-semibold text-foreground" numberOfLines={1}>
          {name}
        </Text>
        <Text className="text-sm text-muted-foreground" numberOfLines={1}>
          {getInviteSubtitle(user, status)}
        </Text>
      </View>
      <Button
        variant={isDisabled ? 'outline' : 'default'}
        size="sm"
        onPress={() => onInvite(user._id)}
        disabled={isDisabled}
        className="rounded-xl">
        <Text>{getInviteLabel(status, isPending)}</Text>
      </Button>
    </View>
  );
}

export default function EventInviteScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const insets = useSafeAreaInsets();
  const [pendingUserId, setPendingUserId] = useState<Id<'users'> | null>(null);
  const [invitedUserIds, setInvitedUserIds] = useState<Set<Id<'users'>>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery.trim());
  const isSearchMode = searchQuery.trim().length > 0;

  const event = useQuery(api.events.get, {
    eventId: eventId as Id<'events'>,
  });
  const currentUser = useQuery(api.users.getCurrentUserProfile);
  const isCreator = !!event && !!currentUser && event.creatorId === currentUser._id;
  const friends = useQuery(api.friends.listFriends);
  const searchResults = useQuery(
    api.users.searchUsers,
    deferredSearchQuery.length >= 2 ? { query: deferredSearchQuery } : 'skip'
  );
  const inviteStatuses = useQuery(
    api.eventMembers.listInviteStatuses,
    isCreator ? { eventId: eventId as Id<'events'> } : 'skip'
  );
  const inviteMember = useMutation(api.eventMembers.invite);

  const statusByUserId = useMemo(() => {
    const statuses = new Map<Id<'users'>, InviteStatus>();
    for (const status of inviteStatuses ?? []) {
      statuses.set(status.userId, status.status);
    }
    for (const userId of invitedUserIds) {
      statuses.set(userId, 'invited');
    }
    return statuses;
  }, [inviteStatuses, invitedUserIds]);

  const friendRows = useMemo(
    () =>
      (friends ?? [])
        .map((friend) => friend.user)
        .filter(isInviteUser),
    [friends]
  );
  const searchRows = useMemo(
    () =>
      (searchResults ?? []).filter(
        (user) => !friendRows.some((friend) => friend._id === user._id)
      ),
    [friendRows, searchResults]
  );

  const handleInvite = useCallback(
    async (userId: Id<'users'>) => {
      setPendingUserId(userId);
      try {
        await inviteMember({ eventId: eventId as Id<'events'>, userId });
        setInvitedUserIds((previous) => new Set(previous).add(userId));
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

  const handleShareCode = useCallback(async () => {
    if (!event?.joinCode) {
      Alert.alert('Ingen jaktkod', 'Den här jakten har ingen kod att kopiera.');
      return;
    }

    try {
      const clipboard = Platform.OS === 'web' ? globalThis.navigator?.clipboard : undefined;
      if (clipboard?.writeText) {
        await clipboard.writeText(event.joinCode);
        Alert.alert('Kopierad', 'Jaktkoden är kopierad.');
        return;
      }

      await Share.share({
        title: event.title,
        message: `Gå med i ${event.title} med jaktkod: ${event.joinCode}`,
      });
    } catch (error) {
      Alert.alert(
        'Kunde inte kopiera',
        error instanceof Error ? error.message : 'Försök igen om en stund.'
      );
    }
  }, [event]);

  if (
    event === undefined ||
    friends === undefined ||
    currentUser === undefined ||
    (isCreator && inviteStatuses === undefined)
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

  if (!isCreator) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6">
        <Text className="text-center text-muted-foreground">
          Bara jaktledaren kan bjuda in användare eller dela jaktkoden.
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      collapsable={false}>
      <ScrollView
        className="min-h-0 flex-1"
        contentContainerClassName="gap-5 px-5 pt-5"
        contentContainerStyle={{ paddingBottom: 18 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        collapsable={false}>
        {!isSearchMode ? (
          <>
            <Card>
              <CardContent className="gap-4 p-4">
                <View className="flex-row items-center gap-3">
                  <View className="h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
                    <Ionicons name="key-outline" size={22} color={APP_COLORS.primary} />
                  </View>
                  <View className="min-w-0 flex-1">
                    <Text className="text-sm font-medium text-muted-foreground">Jaktkod</Text>
                    <Text
                      className="text-2xl font-semibold tracking-wide text-foreground"
                      numberOfLines={1}>
                      {event.joinCode ?? 'Ingen kod'}
                    </Text>
                  </View>
                </View>

                {event.joinCode ? (
                  <Button onPress={() => void handleShareCode()} className="rounded-xl">
                    <Ionicons name="copy-outline" size={18} color={APP_COLORS.surface} />
                    <Text>Kopiera kod</Text>
                  </Button>
                ) : (
                  <Text className="text-sm leading-5 text-muted-foreground">
                    Den här jakten saknar kod. Skapa en jaktkod för att kunna dela den här vägen.
                  </Text>
                )}
              </CardContent>
            </Card>
          </>
        ) : null}

        {isSearchMode ? (
          <View className="gap-3">
            <Text className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Sökresultat
            </Text>

            {deferredSearchQuery.length < 2 ? null : searchResults === undefined ? (
              <View className="items-center justify-center rounded-2xl border border-border bg-card py-5">
                <ActivityIndicator size="small" color={APP_COLORS.primary} />
              </View>
            ) : searchRows.length > 0 ? (
              searchRows.map((user) => (
                <InviteUserRow
                  key={user._id}
                  user={user}
                  status={statusByUserId.get(user._id)}
                  isPending={pendingUserId === user._id}
                  onInvite={handleInvite}
                />
              ))
            ) : (
              <Text className="rounded-2xl border border-border bg-card px-4 py-4 text-sm text-muted-foreground">
                Inga användare hittades.
              </Text>
            )}
          </View>
        ) : null}

        {!isSearchMode ? (
          <View className="gap-3">
          <Text className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Vänner
          </Text>

          {friendRows.length > 0 ? (
            friendRows.map((user) => (
              <InviteUserRow
                key={user._id}
                user={user}
                status={statusByUserId.get(user._id)}
                isPending={pendingUserId === user._id}
                onInvite={handleInvite}
              />
            ))
          ) : (
            <Text className="rounded-2xl border border-border bg-card px-4 py-4 text-sm leading-5 text-muted-foreground">
              Inga vänner ännu. Sök användare ovan eller kopiera jaktkoden.
            </Text>
          )}
          </View>
        ) : null}
      </ScrollView>

      <View
        className="border-t border-border bg-background px-5 pt-3"
        style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
        <Text className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Sök användare
        </Text>
        <Input
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="words"
          autoCorrect={false}
          placeholder="Sök namn eller e-post..."
          className="h-12 rounded-xl bg-card"
          returnKeyType="search"
        />
      </View>
    </KeyboardAvoidingView>
  );
}
