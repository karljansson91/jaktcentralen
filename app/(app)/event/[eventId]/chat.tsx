import { Text } from '@/components/ui';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { APP_COLORS } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, usePaginatedQuery, useQuery } from 'convex/react';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import {
  KeyboardGestureArea,
  KeyboardStickyView,
  useKeyboardState,
} from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('sv-SE', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function EventChatScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const [body, setBody] = useState('');
  const sendMessage = useMutation(api.messages.send);
  const markMessagesRead = useMutation(api.messages.markRead);
  const currentUser = useQuery(api.users.getCurrentUserProfile);
  const isKeyboardVisible = useKeyboardState((state) => state.isVisible);

  const { results, status, loadMore } = usePaginatedQuery(
    api.messages.list,
    { eventId: eventId as Id<'events'> },
    { initialNumItems: 30 }
  );
  const messages = useMemo(() => [...results].reverse(), [results]);

  useEffect(() => {
    if (messages.length === 0) return;
    requestAnimationFrame(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    });
  }, [messages.length]);

  useEffect(() => {
    if (status === 'LoadingFirstPage') return;

    void markMessagesRead({ eventId: eventId as Id<'events'> }).catch((error) => {
      console.error('Failed to mark chat read:', error);
    });
  }, [eventId, markMessagesRead, messages.length, status]);

  const handleSend = useCallback(async () => {
    const trimmed = body.trim();
    if (!trimmed) return;
    setBody('');
    await sendMessage({ eventId: eventId as Id<'events'>, body: trimmed });
  }, [body, eventId, sendMessage]);

  return (
    <View style={{ flex: 1, backgroundColor: APP_COLORS.background }} collapsable={false}>
      <KeyboardGestureArea
        textInputNativeID="event-chat-composer"
        interpolator="ios"
        offset={12}
        style={{ flex: 1, minHeight: 0 }}>
        <ScrollView
          ref={scrollViewRef}
          className="min-h-0 flex-1"
          contentContainerStyle={{
            flexGrow: 1,
            gap: 12,
            paddingHorizontal: 20,
            paddingBottom: 16,
            paddingTop: 12,
          }}
          contentInset={{ bottom: isKeyboardVisible ? 80 : 0 }}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          scrollIndicatorInsets={{ bottom: isKeyboardVisible ? 80 : 0 }}
          stickyHeaderIndices={[0]}>
          <View className="bg-background pb-2 pt-1" collapsable={false}>
            <Text className="text-[18px] font-medium leading-[24px] text-foreground">
              Chat
            </Text>
          </View>

          {status === 'CanLoadMore' && (
            <Pressable
              onPress={() => loadMore(20)}
              className="self-center rounded-full bg-card px-4 py-2">
              <Text className="text-sm font-medium text-muted-foreground">
                Ladda äldre meddelanden
              </Text>
            </Pressable>
          )}

          {messages.length === 0 ? (
            <View className="flex-1 items-center justify-center py-8">
              {status === 'LoadingFirstPage' ? (
                <View className="items-center gap-3">
                  <ActivityIndicator size="small" color={APP_COLORS.primary} />
                  <Text className="text-center text-sm text-muted-foreground">
                    Laddar meddelanden…
                  </Text>
                </View>
              ) : (
                <Text className="text-center text-sm text-muted-foreground">
                  Inga meddelanden ännu
                </Text>
              )}
            </View>
          ) : (
            <View className="flex-1 justify-end gap-3">
              {messages.map((item) => {
                const isMine = item.userId === currentUser?._id;

                return (
                  <View
                    key={item._id}
                    className={`max-w-[82%] rounded-[26px] px-4 py-3 ${isMine ? 'self-end bg-primary' : 'self-start bg-muted'}`}>
                    {!isMine && (
                      <Text className="mb-1 text-xs font-semibold text-muted-foreground">
                        {item.user?.name ?? 'Okänd'}
                      </Text>
                    )}
                    <Text className={isMine ? 'text-primary-foreground' : 'text-foreground'}>
                      {item.body}
                    </Text>
                    <Text
                      className={`mt-1 text-right text-[11px] ${isMine ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                      {formatTime(item._creationTime)}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      </KeyboardGestureArea>

      <KeyboardStickyView>
        <View
          className="shrink-0 flex-row items-end gap-2 border-t border-border bg-background px-5 pt-3"
          style={{ paddingBottom: isKeyboardVisible ? 12 : Math.max(insets.bottom, 20) }}
          collapsable={false}>
          <TextInput
            nativeID="event-chat-composer"
            className="min-h-[44px] flex-1 rounded-[22px] bg-card px-4 py-3 text-base text-foreground"
            placeholder="Skriv ett meddelande…"
            placeholderTextColor={APP_COLORS.textMuted}
            value={body}
            onChangeText={setBody}
            multiline
            maxLength={2000}
            enablesReturnKeyAutomatically
            returnKeyType="send"
            submitBehavior="submit"
            onSubmitEditing={handleSend}
          />
          <Pressable
            onPress={handleSend}
            className="size-11 items-center justify-center rounded-full bg-primary"
            disabled={!body.trim()}
            accessibilityRole="button"
            accessibilityLabel="Skicka meddelande">
            <Ionicons name="arrow-up" size={24} color={APP_COLORS.surface} />
          </Pressable>
        </View>
      </KeyboardStickyView>
    </View>
  );
}
