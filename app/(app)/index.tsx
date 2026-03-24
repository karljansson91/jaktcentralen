import { Badge, Button, Card, CardContent, IconButton, Text } from '@/components/ui';
import { api } from '@/convex/_generated/api';
import { useAuth } from '@clerk/expo';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from 'convex/react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('sv-SE');
}

function getDateRangeLabel(startDate: number, endDate?: number) {
  const start = formatDate(startDate);

  if (!endDate || endDate === startDate) {
    return start;
  }

  return `${start} till ${formatDate(endDate)}`;
}

function getEventStatus(startDate: number, endDate?: number) {
  const now = Date.now();

  if (startDate > now) {
    return { label: 'Kommande', tone: 'upcoming' as const };
  }

  if (endDate && endDate < now) {
    return { label: 'Avslutad', tone: 'ended' as const };
  }

  return { label: 'Pågår nu', tone: 'live' as const };
}

export default function HomeScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const user = useQuery(api.users.getCurrentUserProfile);
  const areas = useQuery(api.areas.listMyAreas, user ? {} : 'skip');
  const events = useQuery(api.events.listMyEvents, user ? {} : 'skip');
  const firstName = user?.name?.trim().split(/\s+/)[0] ?? 'där';

  if (user === undefined || areas === undefined || events === undefined) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <View className="items-center gap-4">
          <View className="h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Ionicons name="trail-sign-outline" size={28} color="#35523b" />
          </View>
          <ActivityIndicator size="small" color="#35523b" />
          <Text className="text-sm text-muted-foreground">Laddar din översikt...</Text>
        </View>
      </View>
    );
  }

  if (areas.length === 0 && events.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
        <View className="absolute left-[-40] top-0 h-48 w-48 rounded-full bg-primary/10" />
        <View className="absolute bottom-10 right-[-30] h-40 w-40 rounded-full bg-secondary/70" />

        <View className="flex-1 justify-between px-6 pb-8 pt-6">
          <View className="gap-4">
            <View className="w-14 rounded-full bg-primary px-4 py-3">
              <Ionicons name="leaf-outline" size={24} color="#f8f4ea" />
            </View>
            <Text className="text-sm font-semibold uppercase tracking-[1.5px] text-primary/80">
              Start
            </Text>
            <Text className="text-4xl font-extrabold leading-tight text-foreground">
              Bygg din första jaktöversikt
            </Text>
            <Text className="text-base leading-6 text-muted-foreground">
              Skapa ett område för ditt lag eller gå med i en aktiv jakt via kod. Därefter får
              du en tydlig översikt över marker, deltagare och pågående pass.
            </Text>
          </View>

          <Card className="border-border/60 bg-card/95 py-0">
            <CardContent className="gap-5 px-5 py-5">
              <View className="gap-3">
                <Text className="text-lg font-semibold text-foreground">Kom igång snabbt</Text>
                <View className="gap-2">
                  <View className="flex-row items-center gap-3">
                    <View className="h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                      <Text className="text-sm font-semibold text-primary">1</Text>
                    </View>
                    <Text className="flex-1 text-sm text-muted-foreground">
                      Skapa ett jaktområde med gränser och namn.
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-3">
                    <View className="h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                      <Text className="text-sm font-semibold text-primary">2</Text>
                    </View>
                    <Text className="flex-1 text-sm text-muted-foreground">
                      Bjud in deltagare eller gå med via jaktkod.
                    </Text>
                  </View>
                </View>
              </View>

              <View className="gap-3">
                <Button className="h-12 rounded-xl" onPress={() => router.push('/area/create')}>
                  <Text>Skapa ditt första område</Text>
                </Button>
                <Button
                  variant="outline"
                  className="h-12 rounded-xl bg-background/80"
                  onPress={() => router.push('/join')}>
                  <Text>Gå med i en jakt</Text>
                </Button>
              </View>
            </CardContent>
          </Card>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
      <View className="absolute left-[-72] top-[-12] h-56 w-56 rounded-full bg-primary/10" />
      <View className="absolute right-[-48] top-40 h-44 w-44 rounded-full bg-secondary" />

      <ScrollView
        className="flex-1"
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerClassName="gap-5 px-4 pb-8"
        contentContainerStyle={{ paddingTop: 12, paddingBottom: insets.bottom + 96 }}>
        <View className="flex-row items-center justify-between">
          <View className="flex-1 pr-4">
            <Text className="text-sm font-semibold uppercase tracking-[1.2px] text-primary/80">
              Jaktcentralen
            </Text>
            <Text className="mt-1 text-3xl font-extrabold text-foreground">Hej, {firstName}</Text>
            <Text className="mt-2 text-sm leading-6 text-muted-foreground">
              Här ser du dina marker, pågående jakter och nästa steg för dagen.
            </Text>
          </View>

          <IconButton
            accessibilityLabel="Logga ut"
            variant="outline"
            onPress={() => signOut()}
            className="border border-border/70 bg-card">
            <Ionicons name="log-out-outline" size={20} color="#425848" />
          </IconButton>
        </View>

        <Card className="overflow-hidden border-border/60 bg-primary py-0">
          <CardContent className="gap-5 px-5 py-5">
            <View className="flex-row items-start justify-between gap-4">
              <View className="flex-1 gap-2">
                <Text className="text-sm font-semibold uppercase tracking-[1.2px] text-primary-foreground/80">
                  Din översikt
                </Text>
                <Text className="text-2xl font-bold leading-tight text-primary-foreground">
                  {events.length > 0
                    ? 'Du har aktiva jakter att följa upp.'
                    : 'Du är redo att starta nästa jakt.'}
                </Text>
                <Text className="text-sm leading-6 text-primary-foreground/80">
                  Håll koll på deltagare, marker och datum från ett ställe.
                </Text>
              </View>

              <View className="rounded-2xl bg-primary-foreground/10 px-3 py-2">
                <Ionicons name="map-outline" size={22} color="#f8f4ea" />
              </View>
            </View>

            <View className="flex-row gap-3">
              <View className="flex-1 rounded-2xl bg-primary-foreground/10 px-4 py-4">
                <Text className="text-2xl font-extrabold text-primary-foreground">
                  {areas.length}
                </Text>
                <Text className="mt-1 text-sm text-primary-foreground/80">Områden</Text>
              </View>
              <View className="flex-1 rounded-2xl bg-primary-foreground/10 px-4 py-4">
                <Text className="text-2xl font-extrabold text-primary-foreground">
                  {events.length}
                </Text>
                <Text className="mt-1 text-sm text-primary-foreground/80">Jakter</Text>
              </View>
            </View>

            <View className="gap-3">
              <Button
                variant="secondary"
                className="h-12 rounded-xl bg-primary-foreground"
                onPress={() => router.push('/area/create')}>
                <Text className="text-primary">Skapa nytt område</Text>
              </Button>
              <Button
                variant="outline"
                className="h-12 rounded-xl border-primary-foreground/30 bg-transparent"
                onPress={() => router.push('/join')}>
                <Text className="text-primary-foreground">Gå med i en jakt</Text>
              </Button>
            </View>
          </CardContent>
        </Card>

        <View className="gap-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-xl font-semibold text-foreground">Mina jakter</Text>
            <Text className="text-sm text-muted-foreground">{events.length} st</Text>
          </View>

          {events.length > 0 && (
            <View className="gap-2">
              {events.map((event) => {
                const status = getEventStatus(event.startDate, event.endDate);

                return (
                  <Pressable
                    key={event._id}
                    accessibilityRole="button"
                    onPress={() => router.push(`/event/${event._id}`)}>
                    <Card className="border-border/70 py-0">
                      <CardContent className="px-5 py-4">
                        <View className="flex-row items-center gap-4">
                          <View className="h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
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
            </View>
          )}
        </View>

        <View className="gap-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-xl font-semibold text-foreground">Mina områden</Text>
            <Text className="text-sm text-muted-foreground">{areas.length} st</Text>
          </View>

          {areas.length > 0 && (
            <View className="gap-2">
              {areas.map((area) => (
                <Pressable
                  key={area._id}
                  accessibilityRole="button"
                  onPress={() => router.push(`/area/${area._id}`)}>
                  <Card className="border-border/70 py-0">
                    <CardContent className="px-5 py-4">
                      <View className="flex-row items-center gap-4">
                        <View className="h-12 w-12 items-center justify-center rounded-2xl bg-secondary">
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
          )}
        </View>
      </ScrollView>

    </SafeAreaView>
  );
}
