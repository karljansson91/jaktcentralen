import { Button, Card, CardDescription, CardHeader, CardTitle, Text } from '@/components/ui';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from 'convex/react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, View } from 'react-native';

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('sv-SE');
}

export default function EventsListScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const events = useQuery(api.events.listByArea, { areaId: id as Id<'areas'> });

  return (
    <View className="flex-1 bg-background">
      <FlatList
        data={events ?? []}
        keyExtractor={(item) => item._id}
        contentContainerClassName="p-4 gap-2"
        ListHeaderComponent={
          <View className="mb-2 flex-row items-center justify-between">
            <Text variant="h3">Jakter</Text>
            <Pressable
              onPress={() => router.push(`/area/${id}/event/create`)}
              className="flex-row items-center gap-1"
            >
              <Ionicons name="add-circle-outline" size={22} color="#2c4b31" />
              <Text className="font-medium text-primary">Ny jakt</Text>
            </Pressable>
          </View>
        }
        ListEmptyComponent={
          events === undefined ? (
            <View className="items-center py-10">
              <ActivityIndicator size="small" color="#2c4b31" />
            </View>
          ) : (
            <View className="items-center py-10">
              <Text className="mb-4 text-muted-foreground">Inga jakter ännu</Text>
              <Button onPress={() => router.push(`/area/${id}/event/create`)}>
                <Text>Skapa din första jakt</Text>
              </Button>
            </View>
          )
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => {
            router.back();
            setTimeout(() => router.push(`/event/${item._id}`), 100);
          }}>
            <Card>
              <CardHeader className="flex-row items-center py-3">
                <View className="flex-1">
                  <CardTitle className="text-base">{item.title}</CardTitle>
                  <CardDescription>
                    {formatDate(item.startDate)}
                    {item.endDate ? ` — ${formatDate(item.endDate)}` : ''}
                  </CardDescription>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
              </CardHeader>
            </Card>
          </Pressable>
        )}
      />
    </View>
  );
}
