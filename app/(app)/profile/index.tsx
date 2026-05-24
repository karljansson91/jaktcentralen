import { Badge, Button, Card, CardContent, IconButton, Text } from '@/components/ui';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { APP_COLORS } from '@/lib/theme';
import { useUser } from '@clerk/expo';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery } from 'convex/react';
import { Href, useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, View } from 'react-native';
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

function formatDate(ts?: number) {
  if (!ts) {
    return 'Datum saknas';
  }

  return new Date(ts).toLocaleDateString('sv-SE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onActionPress?: () => void;
};

function SectionHeader({ title, subtitle, actionLabel, onActionPress }: SectionHeaderProps) {
  return (
    <View className="flex-row items-end justify-between gap-4 px-1">
      <View className="min-w-0 flex-1 gap-1">
        <Text className="text-xs font-semibold uppercase tracking-[1.6px] text-muted-foreground">
          {title}
        </Text>
        {subtitle ? <Text className="text-sm text-muted-foreground">{subtitle}</Text> : null}
      </View>
      {onActionPress ? (
        <IconButton
          accessibilityLabel={actionLabel || title}
          variant="default"
          size="sm"
          className="bg-primary"
          onPress={onActionPress}>
          <Ionicons name="add" size={20} color={APP_COLORS.surface} />
        </IconButton>
      ) : null}
    </View>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user: clerkUser } = useUser();

  const user = useQuery(api.users.getCurrentUserProfile);
  const invitations = useQuery(api.eventMembers.listMyInvitations);
  const friendRequests = useQuery(api.friends.listPendingReceived);
  const sentFriendRequests = useQuery(api.friends.listPendingSent);
  const friends = useQuery(api.friends.listFriends);

  const acceptInvite = useMutation(api.eventMembers.acceptInvite);
  const declineInvite = useMutation(api.eventMembers.declineInvite);
  const acceptFriendRequest = useMutation(api.friends.acceptRequest);
  const declineFriendRequest = useMutation(api.friends.declineRequest);
  const removeFriend = useMutation(api.friends.removeFriend);

  const displayName = user?.name || clerkUser?.fullName || clerkUser?.primaryEmailAddress?.emailAddress;
  const displayEmail = user?.email || clerkUser?.primaryEmailAddress?.emailAddress;
  const profileInitials = getInitials(displayName);
  const hasInvitations =
    (invitations && invitations.length > 0) || (friendRequests && friendRequests.length > 0);

  async function handleAcceptInvite(memberId: Id<'eventMembers'>, eventId?: Id<'events'>) {
    try {
      await acceptInvite({ memberId });
      if (eventId) {
        router.replace(`/event/${eventId}` as Href);
      }
    } catch (error) {
      Alert.alert(
        'Kunde inte gå med',
        error instanceof Error ? error.message : 'Försök igen om en stund.'
      );
    }
  }

  async function handleDeclineInvite(memberId: Id<'eventMembers'>) {
    try {
      await declineInvite({ memberId });
    } catch (error) {
      Alert.alert(
        'Kunde inte avböja',
        error instanceof Error ? error.message : 'Försök igen om en stund.'
      );
    }
  }

  async function handleAcceptFriendRequest(friendshipId: Id<'friendships'>) {
    try {
      await acceptFriendRequest({ friendshipId });
    } catch (error) {
      Alert.alert(
        'Kunde inte acceptera',
        error instanceof Error ? error.message : 'Försök igen om en stund.'
      );
    }
  }

  async function handleDeclineFriendRequest(friendshipId: Id<'friendships'>) {
    try {
      await declineFriendRequest({ friendshipId });
    } catch (error) {
      Alert.alert(
        'Kunde inte avböja',
        error instanceof Error ? error.message : 'Försök igen om en stund.'
      );
    }
  }

  function confirmRemoveFriend(friendshipId: Id<'friendships'>, name?: string | null) {
    Alert.alert('Ta bort vän?', name || 'Den här personen tas bort från dina vänner.', [
      { text: 'Avbryt', style: 'cancel' },
      {
        text: 'Ta bort',
        style: 'destructive',
        onPress: () => {
          void removeFriend({ friendshipId }).catch((error) => {
            Alert.alert(
              'Kunde inte ta bort vän',
              error instanceof Error ? error.message : 'Försök igen om en stund.'
            );
          });
        },
      },
    ]);
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerClassName="gap-5 px-4"
      contentContainerStyle={{
        paddingTop: 12,
        paddingBottom: Math.max(insets.bottom, 16) + 24,
      }}>
      <Card className="overflow-hidden border-border/70 bg-card py-0">
        <CardContent className="gap-5 px-5 py-5">
          <View className="flex-row items-center gap-4">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-primary">
              <Text className="text-xl font-semibold text-primary-foreground">
                {profileInitials}
              </Text>
            </View>
            <View className="min-w-0 flex-1 gap-1">
              <Text className="text-xl font-semibold text-foreground" numberOfLines={1}>
                {displayName || 'Profil'}
              </Text>
              {displayEmail ? (
                <Text className="text-sm text-muted-foreground" numberOfLines={1}>
                  {displayEmail}
                </Text>
              ) : (
                <Text className="text-sm text-muted-foreground">Ditt Jaktcentralen-konto</Text>
              )}
            </View>
          </View>

        </CardContent>
      </Card>

      {hasInvitations ? (
        <View className="gap-3">
          <SectionHeader title="Inbjudningar" subtitle="Svara direkt här." />

          {invitations?.map((invitation) => (
            <Card key={invitation._id} className="border-border/70 bg-card py-0">
              <CardContent className="gap-4 px-5 py-5">
                <View className="flex-row items-start gap-3">
                  <View className="h-11 w-11 items-center justify-center rounded-2xl bg-secondary">
                    <Ionicons name="compass-outline" size={22} color={APP_COLORS.primary} />
                  </View>
                  <View className="min-w-0 flex-1 gap-1">
                    <Text className="text-base font-semibold text-foreground" numberOfLines={2}>
                      {invitation.event?.title || 'Borttagen jakt'}
                    </Text>
                    <Text className="text-sm text-muted-foreground">
                      Jaktinbjudan · {formatDate(invitation.event?.startDate)}
                    </Text>
                  </View>
                  <Badge>
                    <Text>Jakt</Text>
                  </Badge>
                </View>
                <View className="flex-row gap-2">
                  <Button
                    className="h-11 flex-1 rounded-xl"
                    disabled={!invitation.event}
                    onPress={() =>
                      void handleAcceptInvite(invitation._id, invitation.event?._id as Id<'events'>)
                    }>
                    <Text>Gå med</Text>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-11 flex-1 rounded-xl bg-background/70"
                    onPress={() => void handleDeclineInvite(invitation._id)}>
                    <Text>Avböj</Text>
                  </Button>
                </View>
              </CardContent>
            </Card>
          ))}

          {friendRequests?.map((request) => (
            <Card key={request.friendshipId} className="border-border/70 bg-card py-0">
              <CardContent className="gap-4 px-5 py-5">
                <View className="flex-row items-center gap-3">
                  <View className="h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
                    <Text className="text-sm font-semibold text-primary">
                      {getInitials(request.user?.name)}
                    </Text>
                  </View>
                  <View className="min-w-0 flex-1 gap-1">
                    <Text className="text-base font-semibold text-foreground" numberOfLines={1}>
                      {request.user?.name || 'Okänd användare'}
                    </Text>
                    <Text className="text-sm text-muted-foreground">Vill bli vän</Text>
                  </View>
                  <Badge>
                    <Text>Vän</Text>
                  </Badge>
                </View>
                <View className="flex-row gap-2">
                  <Button
                    className="h-11 flex-1 rounded-xl"
                    onPress={() => void handleAcceptFriendRequest(request.friendshipId)}>
                    <Text>Acceptera</Text>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-11 flex-1 rounded-xl bg-background/70"
                    onPress={() => void handleDeclineFriendRequest(request.friendshipId)}>
                    <Text>Avböj</Text>
                  </Button>
                </View>
              </CardContent>
            </Card>
          ))}
        </View>
      ) : null}

      {sentFriendRequests && sentFriendRequests.length > 0 ? (
        <View className="gap-3">
          <SectionHeader title="Skickade förfrågningar" subtitle="Väntar på svar." />

          {sentFriendRequests.map((request) => (
            <Card key={request.friendshipId} className="border-border/70 bg-card py-0">
              <CardContent className="px-5 py-4">
                <View className="flex-row items-center gap-3">
                  <View className="h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
                    <Text className="text-sm font-semibold text-primary">
                      {getInitials(request.user?.name)}
                    </Text>
                  </View>
                  <View className="min-w-0 flex-1 gap-1">
                    <Text className="text-base font-semibold text-foreground" numberOfLines={1}>
                      {request.user?.name || 'Okänd användare'}
                    </Text>
                    {request.user?.email ? (
                      <Text className="text-sm text-muted-foreground" numberOfLines={1}>
                        {request.user.email}
                      </Text>
                    ) : (
                      <Text className="text-sm text-muted-foreground">Vänförfrågan skickad</Text>
                    )}
                  </View>
                  <Badge className="bg-secondary">
                    <Text className="text-muted-foreground">Skickad</Text>
                  </Badge>
                </View>
              </CardContent>
            </Card>
          ))}
        </View>
      ) : null}

      <View className="gap-3">
        <SectionHeader
          title="Vänner"
          subtitle="Håll in en vän för att ta bort."
          actionLabel="Lägg till vän"
          onActionPress={() => router.push('/profile/add-friend' as Href)}
        />

        {friends && friends.length > 0 ? (
          friends.map((friend) => (
            <Pressable
              key={friend.friendshipId}
              accessibilityRole="button"
              accessibilityLabel={`${friend.user?.name || 'Vän'}, håll in för att ta bort`}
              onLongPress={() => confirmRemoveFriend(friend.friendshipId, friend.user?.name)}>
              <Card className="border-border/70 bg-card py-0">
                <CardContent className="px-5 py-4">
                  <View className="flex-row items-center gap-3">
                    <View className="h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
                      <Text className="text-sm font-semibold text-primary">
                        {getInitials(friend.user?.name)}
                      </Text>
                    </View>
                    <View className="min-w-0 flex-1 gap-1">
                      <Text className="text-base font-semibold text-foreground" numberOfLines={1}>
                        {friend.user?.name || 'Okänd användare'}
                      </Text>
                      {friend.user?.email ? (
                        <Text className="text-sm text-muted-foreground" numberOfLines={1}>
                          {friend.user.email}
                        </Text>
                      ) : (
                        <Text className="text-sm text-muted-foreground">Vän</Text>
                      )}
                    </View>
                  </View>
                </CardContent>
              </Card>
            </Pressable>
          ))
        ) : null}
      </View>
    </ScrollView>
  );
}
