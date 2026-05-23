import { GlassScreenHeader, useGlassHeaderSpacing } from '@/components/glass';
import { Button, Card, CardDescription, CardHeader, CardTitle, Text } from '@/components/ui';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { APP_COLORS } from '@/lib/theme';
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
  const { insets } = useGlassHeaderSpacing();
  const events = useQuery(api.events.listByArea, { areaId: id as Id<'areas'> });

  return (
    <View className="flex-1 bg-background">
      <GlassScreenHeader
        title="Jakter"
        onBack={() => router.back()}
        onRightPress={() => router.push(`/area/${id}/event/create`)}
        rightAccessibilityLabel="Skapa jakt"
        rightIcon="add"
      />
      <FlatList
        data={events ?? []}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{
          gap: 8,
          paddingBottom: Math.max(insets.bottom, 16),
          paddingHorizontal: 16,
          paddingTop: 0,
        }}
        ListEmptyComponent={
          events === undefined ? (
            <View className="items-center py-10">
              <ActivityIndicator size="small" color={APP_COLORS.primary} />
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
                    {formatDate(item.startDate)} — {formatDate(item.endDate)}
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
