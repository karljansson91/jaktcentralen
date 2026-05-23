import { Button, Card, CardContent, Input, Text } from '@/components/ui';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { APP_COLORS } from '@/lib/theme';
import { useMutation, useQuery } from 'convex/react';
import { useDeferredValue, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function getInitials(name?: string | null) {
  return (
    name
      ?.trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || '?'
  );
}

export default function AddFriendSheet() {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [pendingUserId, setPendingUserId] = useState<Id<'users'> | null>(null);
  const [sentUserIds, setSentUserIds] = useState<Set<Id<'users'>>>(new Set());
  const deferredQuery = useDeferredValue(query.trim());

  const results = useQuery(
    api.users.searchUsers,
    deferredQuery.length >= 2 ? { query: deferredQuery } : 'skip'
  );
  const friends = useQuery(api.friends.listFriends);
  const pendingSent = useQuery(api.friends.listPendingSent);
  const pendingReceived = useQuery(api.friends.listPendingReceived);
  const sendFriendRequest = useMutation(api.friends.sendRequest);

  const existingFriendUserIds = useMemo(
    () => new Set((friends ?? []).map((friend) => friend.user?._id).filter(Boolean)),
    [friends]
  );
  const pendingSentUserIds = useMemo(
    () => new Set((pendingSent ?? []).map((request) => request.user?._id).filter(Boolean)),
    [pendingSent]
  );
  const pendingReceivedUserIds = useMemo(
    () => new Set((pendingReceived ?? []).map((request) => request.user?._id).filter(Boolean)),
    [pendingReceived]
  );

  async function handleSendFriendRequest(addresseeId: Id<'users'>) {
    setPendingUserId(addresseeId);
    try {
      await sendFriendRequest({ addresseeId });
      setSentUserIds((previous) => new Set(previous).add(addresseeId));
    } catch (error) {
      Alert.alert(
        'Kunde inte skicka förfrågan',
        error instanceof Error ? error.message : 'Försök igen om en stund.'
      );
    } finally {
      setPendingUserId(null);
    }
  }

  return (
    <View
      className="flex-1 bg-background"
      collapsable={false}
      style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
      <ScrollView
        className="min-h-0 flex-1"
        contentContainerClassName="gap-4 px-5 pb-4 pt-5"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        collapsable={false}>
        <View className="gap-2" collapsable={false}>
          <Text className="text-[26px] font-semibold leading-[32px] text-foreground">
            Lägg till vän
          </Text>
          <Text className="text-sm leading-5 text-muted-foreground">
            Sök på namn och skicka en vänförfrågan.
          </Text>
        </View>

        <Input
          value={query}
          onChangeText={setQuery}
          autoFocus
          autoCapitalize="words"
          placeholder="Sök namn..."
          className="h-12 rounded-xl bg-card"
          returnKeyType="search"
        />

        {deferredQuery.length < 2 ? null : results === undefined ? (
          <View className="items-center justify-center py-8">
            <ActivityIndicator size="small" color={APP_COLORS.primary} />
          </View>
        ) : results.length > 0 ? (
          results.map((user) => {
            const alreadyFriend = existingFriendUserIds.has(user._id);
            const alreadyPending = pendingSentUserIds.has(user._id) || sentUserIds.has(user._id);
            const wantsToBeFriend = pendingReceivedUserIds.has(user._id);
            const isPending = pendingUserId === user._id;
            const disabled = alreadyFriend || alreadyPending || wantsToBeFriend || isPending;
            const label = alreadyFriend
              ? 'Vän'
              : alreadyPending
                ? 'Skickad'
                : wantsToBeFriend
                  ? 'Väntar på dig'
                  : isPending
                    ? 'Skickar...'
                    : 'Lägg till';

            return (
              <Pressable
                key={user._id}
                accessibilityRole="button"
                accessibilityLabel={`Lägg till ${user.name || 'användare'}`}
                disabled={disabled}
                className="rounded-3xl border border-border bg-card px-4 py-4 active:bg-accent"
                onPress={() => void handleSendFriendRequest(user._id)}>
                <View className="flex-row items-center gap-3">
                  <View className="h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
                    <Text className="text-sm font-semibold text-primary">
                      {getInitials(user.name)}
                    </Text>
                  </View>
                  <View className="min-w-0 flex-1 gap-1">
                    <Text className="text-base font-semibold text-foreground" numberOfLines={1}>
                      {user.name || 'Namnlös användare'}
                    </Text>
                    {user.email ? (
                      <Text className="text-sm text-muted-foreground" numberOfLines={1}>
                        {user.email}
                      </Text>
                    ) : null}
                  </View>
                  <Button
                    size="sm"
                    variant={disabled ? 'outline' : 'default'}
                    disabled={disabled}
                    onPress={() => void handleSendFriendRequest(user._id)}
                    className="rounded-xl">
                    <Text>{label}</Text>
                  </Button>
                </View>
              </Pressable>
            );
          })
        ) : (
          <Card className="border-border/70 bg-card/90 py-0">
            <CardContent className="gap-2 px-5 py-5">
              <Text className="text-base font-semibold text-foreground">Inga träffar</Text>
              <Text className="text-sm leading-5 text-muted-foreground">
                Testa ett annat namn. E-postsök kan vi lägga till när vi bygger ut vänflödet mer.
              </Text>
            </CardContent>
          </Card>
        )}
      </ScrollView>

    </View>
  );
}
