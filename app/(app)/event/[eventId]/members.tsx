import { Card, CardDescription, CardHeader, CardTitle, Text } from '@/components/ui';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from 'convex/react';
import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, FlatList, View } from 'react-native';

export default function EventMembersScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const members = useQuery(api.eventMembers.listMembers, {
    eventId: eventId as Id<'events'>,
  });

  if (members === undefined) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="small" color="#2c4b31" />
      </View>
    );
  }

  return (
    <FlatList
      className="flex-1 bg-background"
      data={members}
      keyExtractor={(item) => item._id}
      contentContainerClassName="p-4 gap-2"
      ListEmptyComponent={
        <Text className="mt-8 text-center text-muted-foreground">
          Inga deltagare
        </Text>
      }
      renderItem={({ item }) => (
        <Card>
          <CardHeader className="flex-row items-center gap-3 py-3">
            <View className="h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Ionicons name="person" size={20} color="#2c4b31" />
            </View>
            <View className="flex-1">
              <CardTitle className="text-base">
                {item.user?.name ?? 'Okänd'}
              </CardTitle>
              <CardDescription>
                {item.role === 'admin' ? 'Admin' : 'Medlem'}
              </CardDescription>
            </View>
            {item.lastSeenAt && (
              <Text className="text-xs text-muted-foreground">
                {new Date(item.lastSeenAt).toLocaleTimeString('sv-SE', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            )}
          </CardHeader>
        </Card>
      )}
    />
  );
}
