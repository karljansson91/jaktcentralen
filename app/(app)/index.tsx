import { HomeSectionHeader } from '@/components/home/home-section-header';
import { Badge, Button, Card, CardContent, IconButton, Text } from '@/components/ui';
import { api } from '@/convex/_generated/api';
import { useCurrentTime } from '@/hooks/use-current-time';
import {
  getEventLifecycle,
  getEventLifecycleLabel,
  type EventLifecycle,
} from '@/lib/event-lifecycle';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from 'convex/react';
import { Href, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('sv-SE');
}

function getDateRangeLabel(startDate: number, endDate: number) {
  const start = formatDate(startDate);

  if (endDate === startDate) {
    return start;
  }

  return `${start} till ${formatDate(endDate)}`;
}

function getEventStatusTone(lifecycle: EventLifecycle) {
  return lifecycle === 'active' ? 'live' : lifecycle;
}

export default function HomeScreen() {
  const { push } = useRouter();
  const insets = useSafeAreaInsets();
  const currentTime = useCurrentTime(60_000);
  const user = useQuery(api.users.getCurrentUserProfile);
  const areas = useQuery(api.areas.listMyAreas, user ? {} : 'skip');
  const events = useQuery(api.events.listMyEvents, user ? {} : 'skip');
  const endedEvents = useQuery(api.events.listMyEndedEvents, user ? {} : 'skip');
  const pendingInvitations = useQuery(api.eventMembers.listMyInvitations, user ? {} : 'skip');
  const pendingFriendRequests = useQuery(api.friends.listPendingReceived, user ? {} : 'skip');
  const inboxCount = (pendingInvitations?.length ?? 0) + (pendingFriendRequests?.length ?? 0);

  const profileInitial =
    user?.name
      ?.trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || null;

  if (user === undefined || areas === undefined || events === undefined || endedEvents === undefined) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <View className="items-center gap-4">
          <View className="size-14 items-center justify-center rounded-full bg-primary/10">
            <Ionicons name="trail-sign-outline" size={28} color="#35523b" />
          </View>
          <ActivityIndicator size="small" color="#35523b" />
          <Text className="text-sm text-muted-foreground">Laddar…</Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <View className="absolute left-[-72] top-[-12] size-56 rounded-full bg-primary/10" />
      <View className="absolute bottom-24 right-[-64] size-52 rounded-full bg-secondary/80" />

      <ScrollView
        className="flex-1"
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerClassName="gap-7 px-4 pb-8"
        contentContainerStyle={{ paddingTop: 14, paddingBottom: 96 }}
        contentInset={{ bottom: insets.bottom }}
        scrollIndicatorInsets={{ bottom: insets.bottom }}>
        <View className="flex-row justify-end">
          <IconButton
            accessibilityLabel="Öppna profil"
            variant="outline"
            onPress={() => push('/profile' as Href)}
            className="relative border border-border/70 bg-card">
            {profileInitial ? (
              <Text className="text-sm font-semibold text-primary">{profileInitial}</Text>
            ) : (
              <Ionicons name="person-outline" size={20} color="#425848" />
            )}
            {inboxCount > 0 ? (
              <View className="absolute -right-1 -top-1 min-h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1">
                <Text className="text-[10px] font-bold leading-3 text-white">
                  {inboxCount > 9 ? '9+' : inboxCount}
                </Text>
              </View>
            ) : null}
          </IconButton>
        </View>

        <View className="gap-3">
          <HomeSectionHeader
            title="Mina jakter"
            count={events.length + endedEvents.length}
            addAccessibilityLabel="Gå med i jakt"
            actionIcon="enter-outline"
            actionLabel="Gå med"
            onAddPress={() => push('/join')}
          />

          {events.length + endedEvents.length > 0 ? (
            <View className="gap-2">
              {events.map((event) => {
                const lifecycle = getEventLifecycle(event, currentTime);
                const status = {
                  label: getEventLifecycleLabel(lifecycle),
                  tone: getEventStatusTone(lifecycle),
                };

                return (
                  <Pressable
                    key={event._id}
                    accessibilityRole="button"
                    onPress={() => push(`/event/${event._id}`)}>
                    <Card className="border-border/70 py-0">
                      <CardContent className="px-5 py-4">
                        <View className="flex-row items-center gap-4">
                          <View className="size-12 items-center justify-center rounded-2xl bg-primary/10">
                            <Ionicons name="compass-outline" size={22} color="#35523b" />
                          </View>
                          <View className="flex-1 gap-1">
                            <View className="flex-row items-center justify-between gap-3">
                              <Text className="flex-1 text-base font-semibold text-foreground">
                                {event.title}
                              </Text>
                              <Badge
                                variant={
                                  status.tone === 'live'
                                    ? 'default'
                                    : status.tone === 'upcoming'
                                      ? 'secondary'
                                      : 'muted'
                                }>
                                <Text>{status.label}</Text>
                              </Badge>
                            </View>
                            <Text className="text-sm text-muted-foreground">
                              {getDateRangeLabel(event.startDate, event.endDate)}
                            </Text>
                          </View>
                          <Ionicons name="chevron-forward" size={18} color="#8b948d" />
                        </View>
                      </CardContent>
                    </Card>
                  </Pressable>
                );
              })}

              {endedEvents.map((event) => (
                <Pressable
                  key={event._id}
                  accessibilityRole="button"
                  onPress={() => push(`/event/${event._id}`)}>
                  <Card className="border-border/70 bg-card/80 py-0">
                    <CardContent className="px-5 py-4">
                      <View className="flex-row items-center gap-4">
                        <View className="size-12 items-center justify-center rounded-2xl bg-secondary">
                          <Ionicons name="archive-outline" size={22} color="#35523b" />
                        </View>
                        <View className="flex-1 gap-1">
                          <View className="flex-row items-center justify-between gap-3">
                            <Text className="flex-1 text-base font-semibold text-foreground">
                              {event.title}
                            </Text>
                            <Badge variant="muted">
                              <Text>Avslutad</Text>
                            </Badge>
                          </View>
                          <Text className="text-sm text-muted-foreground">
                            {event.endedAt
                              ? `Avslutad ${formatDate(event.endedAt)}`
                              : getDateRangeLabel(event.startDate, event.endDate)}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="#8b948d" />
                      </View>
                    </CardContent>
                  </Card>
                </Pressable>
              ))}
            </View>
          ) : (
            <Card className="overflow-hidden border-border/70 bg-card/95 py-0">
              <CardContent className="gap-4 p-5">
                <View className="flex-row items-start gap-4">
                  <View className="size-12 items-center justify-center rounded-2xl bg-primary/10">
                    <Ionicons name="enter-outline" size={22} color="#35523b" />
                  </View>
                  <View className="min-w-0 flex-1 gap-1">
                    <Text className="text-base font-semibold text-foreground">
                      Gå med i en jakt
                    </Text>
                    <Text className="text-sm leading-5 text-muted-foreground">
                      Har du fått en jaktkod? Anslut direkt och se karta, deltagare och chat.
                    </Text>
                  </View>
                </View>
                <Button
                  className="h-12 rounded-xl"
                  onPress={() => push('/join')}
                  accessibilityLabel="Gå med i jakt med kod">
                  <Ionicons name="key-outline" size={18} color="#f8f4ea" />
                  <Text>Gå med i jakt</Text>
                </Button>
              </CardContent>
            </Card>
          )}
        </View>

        <View className="gap-3">
          <HomeSectionHeader
            title="Mina områden"
            count={areas.length}
            addAccessibilityLabel="Skapa område"
            onAddPress={() => push('/area/create')}
          />

          {areas.length > 0 ? (
            <View className="gap-2">
              {areas.map((area) => (
                <Pressable
                  key={area._id}
                  accessibilityRole="button"
                  onPress={() => push(`/area/${area._id}`)}>
                  <Card className="border-border/70 py-0">
                    <CardContent className="px-5 py-4">
                      <View className="flex-row items-center gap-4">
                        <View className="size-12 items-center justify-center rounded-2xl bg-secondary">
                          <Ionicons name="map-outline" size={22} color="#35523b" />
                        </View>
                        <View className="flex-1 gap-1">
                          <Text className="text-base font-semibold text-foreground">
                            {area.name}
                          </Text>
                          <Text className="text-sm text-muted-foreground" numberOfLines={2}>
                            {area.description ||
                              'Öppna området för att se gränser, jakter och medlemmar.'}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="#8b948d" />
                      </View>
                    </CardContent>
                  </Card>
                </Pressable>
              ))}
            </View>
          ) : (
            <Card className="overflow-hidden border-border/70 bg-card/95 py-0">
              <CardContent className="gap-4 p-5">
                <View className="flex-row items-start gap-4">
                  <View className="size-12 items-center justify-center rounded-2xl bg-secondary">
                    <Ionicons name="map-outline" size={22} color="#35523b" />
                  </View>
                  <View className="min-w-0 flex-1 gap-1">
                    <Text className="text-base font-semibold text-foreground">
                      Skapa ditt första område
                    </Text>
                    <Text className="text-sm leading-5 text-muted-foreground">
                      Rita gränserna för marken först. Därifrån kan du skapa jakter och markörer.
                    </Text>
                  </View>
                </View>
                <Button
                  variant="outline"
                  className="h-12 rounded-xl bg-background/80"
                  onPress={() => push('/area/create')}
                  accessibilityLabel="Skapa område">
                  <Ionicons name="add-circle-outline" size={18} color="#35523b" />
                  <Text>Skapa område</Text>
                </Button>
              </CardContent>
            </Card>
          )}
        </View>
      </ScrollView>

    </View>
  );
}
