import { Text } from '@/components/ui';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, usePaginatedQuery } from 'convex/react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  TextInput,
  View,
} from 'react-native';

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('sv-SE', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function EventChatScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const router = useRouter();
  const [body, setBody] = useState('');
  const sendMessage = useMutation(api.messages.send);

  const { results, status, loadMore } = usePaginatedQuery(
    api.messages.list,
    { eventId: eventId as Id<'events'> },
    { initialNumItems: 30 }
  );

  const handleSend = useCallback(async () => {
    const trimmed = body.trim();
    if (!trimmed) return;
    setBody('');
    await sendMessage({ eventId: eventId as Id<'events'>, body: trimmed });
  }, [body, eventId, sendMessage]);

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View className="flex-row items-center gap-3 border-b border-border px-4 pb-3 pt-14">
        <Pressable onPress={() => router.back()}>
          <Ionicons name="close" size={24} color="#374151" />
        </Pressable>
        <Text className="flex-1 text-lg font-semibold">Chatt</Text>
      </View>

      {/* Messages */}
      <FlatList
        data={results}
        keyExtractor={(item) => item._id}
        inverted
        contentContainerClassName="px-4 py-3 gap-2"
        onEndReached={() => {
          if (status === 'CanLoadMore') loadMore(20);
        }}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          status === 'LoadingFirstPage' ? (
            <ActivityIndicator
              size="small"
              color="#2c4b31"
              className="mt-8"
            />
          ) : (
            <Text className="mt-8 text-center text-muted-foreground">
              Inga meddelanden ännu
            </Text>
          )
        }
        renderItem={({ item }) => (
          <View className="gap-0.5">
            <View className="flex-row items-baseline gap-2">
              <Text className="text-sm font-semibold">
                {item.user?.name ?? 'Okänd'}
              </Text>
              <Text className="text-xs text-muted-foreground">
                {formatTime(item._creationTime)}
              </Text>
            </View>
            <Text>{item.body}</Text>
          </View>
        )}
      />

      {/* Input */}
      <View className="flex-row items-end gap-2 border-t border-border px-4 pb-8 pt-3">
        <TextInput
          className="min-h-[40px] flex-1 rounded-xl bg-muted px-4 py-2 text-base text-foreground"
          placeholder="Skriv ett meddelande..."
          placeholderTextColor="#9ca3af"
          value={body}
          onChangeText={setBody}
          multiline
          maxLength={2000}
          returnKeyType="send"
          onSubmitEditing={handleSend}
          blurOnSubmit={false}
        />
        <Pressable
          onPress={handleSend}
          className="h-10 w-10 items-center justify-center rounded-full bg-primary"
          disabled={!body.trim()}
        >
          <Ionicons name="send" size={18} color="white" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
