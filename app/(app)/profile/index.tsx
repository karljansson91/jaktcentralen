import { Badge, Button, Card, CardContent, IconButton, Text } from '@/components/ui';
import { UserAvatar } from '@/components/user-avatar';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { getUserContactLine, getUserDisplayName } from '@/lib/user-profile';
import { APP_COLORS } from '@/lib/theme';
import { useUser } from '@clerk/expo';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery } from 'convex/react';
import { Href, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

type NotificationPreferenceKey = 'allEnabled' | 'chatEnabled' | 'invitesEnabled';

type NotificationSwitchRowProps = {
  disabled?: boolean;
  label: string;
  muted?: boolean;
  onValueChange: (value: boolean) => void;
  value: boolean;
};

function NotificationSwitchRow({
  disabled = false,
  label,
  muted = false,
  onValueChange,
  value,
}: NotificationSwitchRowProps) {
  return (
    <View
      className={`min-h-14 flex-row items-center justify-between gap-4 px-5 py-3 ${
        muted ? 'opacity-50' : ''
      }`}>
      <Text className="min-w-0 flex-1 text-base font-medium text-foreground">{label}</Text>
      <Switch
        disabled={disabled}
        onValueChange={onValueChange}
        thumbColor="#ffffff"
        trackColor={{ false: '#D8DED3', true: APP_COLORS.primary }}
        value={value}
      />
    </View>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { push, replace } = useRouter();
  const { user: clerkUser } = useUser();
  const [updatingNotificationKey, setUpdatingNotificationKey] =
    useState<NotificationPreferenceKey | null>(null);

  const user = useQuery(api.users.getCurrentUserProfile);
  const notificationPreferences = useQuery(
    api.notifications.getPreferences,
    user ? {} : 'skip'
  );
  const invitations = useQuery(api.eventMembers.listMyInvitations);
  const friendRequests = useQuery(api.friends.listPendingReceived);
  const sentFriendRequests = useQuery(api.friends.listPendingSent);
  const friends = useQuery(api.friends.listFriends);

  const acceptInvite = useMutation(api.eventMembers.acceptInvite);
  const declineInvite = useMutation(api.eventMembers.declineInvite);
  const acceptFriendRequest = useMutation(api.friends.acceptRequest);
  const declineFriendRequest = useMutation(api.friends.declineRequest);
  const removeFriend = useMutation(api.friends.removeFriend);
  const updateNotificationPreferences = useMutation(api.notifications.updatePreferences);

  const displayName =
    user?.name || clerkUser?.fullName || clerkUser?.primaryEmailAddress?.emailAddress;
  const displayContact =
    getUserContactLine(user) || clerkUser?.primaryEmailAddress?.emailAddress || '';
  const hasInvitations =
    (invitations && invitations.length > 0) || (friendRequests && friendRequests.length > 0);
  const resolvedNotificationPreferences = notificationPreferences ?? {
    allEnabled: true,
    chatEnabled: true,
    invitesEnabled: true,
  };
  const notificationPreferencesLoading = notificationPreferences === undefined;

  async function handleNotificationPreferenceChange(
    key: NotificationPreferenceKey,
    value: boolean
  ) {
    setUpdatingNotificationKey(key);
    try {
      await updateNotificationPreferences({ [key]: value });
    } catch (error) {
      Alert.alert(
        'Kunde inte uppdatera notiser',
        error instanceof Error ? error.message : 'Försök igen om en stund.'
      );
    } finally {
      setUpdatingNotificationKey(null);
    }
  }

  async function handleAcceptInvite(memberId: Id<'eventMembers'>, eventId?: Id<'events'>) {
    try {
      await acceptInvite({ memberId });
      if (eventId) {
        replace(`/event/${eventId}` as Href);
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
        paddingBottom: 24,
      }}
      contentInset={{ bottom: Math.max(insets.bottom, 16) }}
      scrollIndicatorInsets={{ bottom: Math.max(insets.bottom, 16) }}>
      <Card className="overflow-hidden border-border/70 bg-card py-0">
        <CardContent className="gap-5 p-5">
          <View className="flex-row items-center gap-4">
            <UserAvatar imageUrl={user?.imageUrl} name={displayName} size={64} />
            <View className="min-w-0 flex-1 gap-1">
              <Text className="text-xl font-semibold text-foreground" numberOfLines={1}>
                {displayName || 'Profil'}
              </Text>
              {displayContact ? (
                <Text className="text-sm text-muted-foreground" numberOfLines={1}>
                  {displayContact}
                </Text>
              ) : (
                <Text className="text-sm text-muted-foreground">Ditt Jaktcentralen-konto</Text>
              )}
            </View>
          </View>

          <Button
            variant="outline"
            className="h-11 rounded-xl bg-background/70"
            onPress={() => push('/profile/edit' as Href)}
            accessibilityLabel="Redigera profil">
            <Ionicons name="create-outline" size={18} color={APP_COLORS.primary} />
            <Text>Redigera profil</Text>
          </Button>
        </CardContent>
      </Card>

      <View className="gap-3">
        <SectionHeader title="Notiser" />
        <Card className="overflow-hidden border-border/70 bg-card py-0">
          <CardContent className="p-0">
            <NotificationSwitchRow
              disabled={notificationPreferencesLoading || updatingNotificationKey !== null}
              label="Alla notiser"
              onValueChange={(value) =>
                void handleNotificationPreferenceChange('allEnabled', value)
              }
              value={resolvedNotificationPreferences.allEnabled}
            />
            <View className="h-px bg-border/70" />
            <NotificationSwitchRow
              disabled={
                notificationPreferencesLoading ||
                updatingNotificationKey !== null ||
                !resolvedNotificationPreferences.allEnabled
              }
              label="Meddelanden"
              muted={!resolvedNotificationPreferences.allEnabled}
              onValueChange={(value) =>
                void handleNotificationPreferenceChange('chatEnabled', value)
              }
              value={resolvedNotificationPreferences.chatEnabled}
            />
            <View className="h-px bg-border/70" />
            <NotificationSwitchRow
              disabled={
                notificationPreferencesLoading ||
                updatingNotificationKey !== null ||
                !resolvedNotificationPreferences.allEnabled
              }
              label="Inbjudningar"
              muted={!resolvedNotificationPreferences.allEnabled}
              onValueChange={(value) =>
                void handleNotificationPreferenceChange('invitesEnabled', value)
              }
              value={resolvedNotificationPreferences.invitesEnabled}
            />
          </CardContent>
        </Card>
      </View>

      {hasInvitations ? (
        <View className="gap-3">
          <SectionHeader title="Inbjudningar" subtitle="Svara direkt här." />

          {invitations?.map((invitation) => (
            <Card key={invitation._id} className="border-border/70 bg-card py-0">
              <CardContent className="gap-4 p-5">
                <View className="flex-row items-start gap-3">
                  <View className="size-11 items-center justify-center rounded-2xl bg-secondary">
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
              <CardContent className="gap-4 p-5">
                <View className="flex-row items-center gap-3">
                  <UserAvatar imageUrl={request.user?.imageUrl} name={request.user?.name} />
                  <View className="min-w-0 flex-1 gap-1">
                    <Text className="text-base font-semibold text-foreground" numberOfLines={1}>
                      {getUserDisplayName(request.user)}
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
                  <UserAvatar imageUrl={request.user?.imageUrl} name={request.user?.name} />
                  <View className="min-w-0 flex-1 gap-1">
                    <Text className="text-base font-semibold text-foreground" numberOfLines={1}>
                      {getUserDisplayName(request.user)}
                    </Text>
                    {getUserContactLine(request.user) ? (
                      <Text className="text-sm text-muted-foreground" numberOfLines={1}>
                        {getUserContactLine(request.user)}
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
          onActionPress={() => push('/profile/add-friend' as Href)}
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
                    <UserAvatar imageUrl={friend.user?.imageUrl} name={friend.user?.name} />
                    <View className="min-w-0 flex-1 gap-1">
                      <Text className="text-base font-semibold text-foreground" numberOfLines={1}>
                        {getUserDisplayName(friend.user)}
                      </Text>
                      {getUserContactLine(friend.user) ? (
                        <Text className="text-sm text-muted-foreground" numberOfLines={1}>
                          {getUserContactLine(friend.user)}
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

      <View className="gap-3">
        <SectionHeader title="Feedback" />
        <Button
          variant="outline"
          className="h-11 rounded-xl bg-card"
          onPress={() => push('/issues' as Href)}
          accessibilityLabel="Visa feedback">
          <Ionicons name="chatbubble-ellipses-outline" size={18} color={APP_COLORS.primary} />
          <Text>Feedback</Text>
        </Button>
      </View>
    </ScrollView>
  );
}
