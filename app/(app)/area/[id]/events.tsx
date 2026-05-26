import { AreaUnavailableState } from '@/components/area/area-unavailable-state';
import { GlassScreenHeader, useGlassHeaderSpacing } from '@/components/glass';
import { Button, Card, CardDescription, CardHeader, CardTitle, Text } from '@/components/ui';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { APP_COLORS } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from 'convex/react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, FlatList, Pressable, View, type ListRenderItemInfo } from 'react-native';

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('sv-SE');
}

type AreaEventItem = {
  _id: Id<'events'>;
  title: string;
  startDate: number;
  endDate: number;
};

type EventRowProps = {
  item: AreaEventItem;
  onOpen: (eventId: Id<'events'>) => void;
};

function EventRow({ item, onOpen }: EventRowProps) {
  return (
    <Pressable onPress={() => onOpen(item._id)}>
      <Card>
        <CardHeader className="flex-row items-center py-3">
          <View className="flex-1">
            <CardTitle className="text-base">{item.title}</CardTitle>
            <CardDescription>
              {formatDate(item.startDate)} till {formatDate(item.endDate)}
            </CardDescription>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
        </CardHeader>
      </Card>
    </Pressable>
  );
}

export default function EventsListScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { back, push } = useRouter();
  const { insets } = useGlassHeaderSpacing();
  const area = useQuery(api.areas.get, { areaId: id as Id<'areas'> });
  const events = useQuery(
    api.events.listByArea,
    area ? { areaId: id as Id<'areas'> } : 'skip'
  );
  const openEvent = useCallback(
    (eventId: Id<'events'>) => {
      back();
      setTimeout(() => push(`/event/${eventId}`), 100);
    },
    [back, push]
  );
  const renderEventItem = useCallback(
    ({ item }: ListRenderItemInfo<AreaEventItem>) => <EventRow item={item} onOpen={openEvent} />,
    [openEvent]
  );

  if (area === undefined || (area && events === undefined)) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="small" color={APP_COLORS.primary} />
      </View>
    );
  }

  if (area === null) {
    return <AreaUnavailableState message="Området kan ha tagits bort från startsidan." />;
  }

  return (
    <View className="flex-1 bg-background">
      <GlassScreenHeader
        title="Jakter"
        onBack={() => back()}
        onRightPress={() => push(`/area/${id}/event/create`)}
        rightAccessibilityLabel="Skapa jakt"
        rightIcon="add"
      />
      <FlatList
        data={events ?? []}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{
          gap: 8,
          paddingHorizontal: 16,
          paddingTop: 0,
        }}
        contentInset={{ bottom: Math.max(insets.bottom, 16) }}
        scrollIndicatorInsets={{ bottom: Math.max(insets.bottom, 16) }}
        ListEmptyComponent={
          events === undefined ? (
            <View className="items-center py-10">
              <ActivityIndicator size="small" color={APP_COLORS.primary} />
            </View>
          ) : (
            <View className="items-center py-10">
              <Text className="mb-4 text-muted-foreground">Inga jakter ännu</Text>
              <Button onPress={() => push(`/area/${id}/event/create`)}>
                <Text>Skapa din första jakt</Text>
              </Button>
            </View>
          )
        }
        renderItem={renderEventItem}
      />
    </View>
  );
}
