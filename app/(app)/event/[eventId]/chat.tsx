import { Text } from '@/components/ui';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { APP_COLORS } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, usePaginatedQuery, useQuery } from 'convex/react';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState, type ElementRef } from 'react';
import {
  ActivityIndicator,
  Pressable,
  TextInput,
  View,
} from 'react-native';
import {
  KeyboardChatScrollView,
  KeyboardStickyView,
  useKeyboardState,
} from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const COMPOSER_KEYBOARD_OFFSET = 76;
const COMPOSER_SCROLL_GAP = 12;

type ChatMessageItem = {
  _creationTime: number;
  _id: string;
  body: string;
  type?: string;
  user?: { name?: string | null } | null;
  userId: Id<'users'>;
};

type EventMessageIcon = {
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
};

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('sv-SE', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getEventMessageIcon(type: string): EventMessageIcon {
  switch (type) {
    case 'animal_sighting':
      return {
        color: '#C98122',
        icon: 'eye-outline',
      };
    case 'member_in_position':
      return {
        color: APP_COLORS.primary,
        icon: 'checkmark-circle-outline',
      };
    case 'member_left_position':
      return {
        color: APP_COLORS.textMuted,
        icon: 'exit-outline',
      };
    default:
      return {
        color: APP_COLORS.textMuted,
        icon: 'information-circle-outline',
      };
  }
}

function ChatMessageRow({
  currentUserId,
  message,
}: {
  currentUserId?: Id<'users'>;
  message: ChatMessageItem;
}) {
  const messageType = message.type ?? 'text';
  const isSystemMessage = messageType !== 'text';
  const isMine = message.userId === currentUserId;
  const eventIcon = isSystemMessage ? getEventMessageIcon(messageType) : null;

  return (
    <View
      className={`max-w-[82%] rounded-[26px] px-4 py-3 ${isMine ? 'self-end bg-primary' : 'self-start bg-muted'}`}>
      {!isMine && (
        <Text className="mb-1 text-xs font-semibold text-muted-foreground">
          {message.user?.name ?? 'Okänd'}
        </Text>
      )}
      <View className="flex-row items-start gap-2">
        {eventIcon ? (
          <View
            className={`mt-0.5 size-6 items-center justify-center rounded-full ${isMine ? 'bg-primary-foreground/90' : 'bg-background'}`}>
            <Ionicons name={eventIcon.icon} size={15} color={eventIcon.color} />
          </View>
        ) : null}
        <Text className={`shrink leading-5 ${isMine ? 'text-primary-foreground' : 'text-foreground'}`}>
          {message.body}
        </Text>
      </View>
      <Text
        className={`mt-1 text-right text-[11px] ${isMine ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
        {formatTime(message._creationTime)}
      </Text>
    </View>
  );
}

export default function EventChatScreen() {
  const { eventId, focusComposer } = useLocalSearchParams<{
    eventId: string;
    focusComposer?: string;
  }>();
  const insets = useSafeAreaInsets();
  const keyboardVisible = useKeyboardState((state) => state.isVisible);
  const scrollViewRef = useRef<ElementRef<typeof KeyboardChatScrollView>>(null);
  const composerRef = useRef<ElementRef<typeof TextInput>>(null);
  const [body, setBody] = useState('');
  const [composerHeight, setComposerHeight] = useState(COMPOSER_KEYBOARD_OFFSET);
  const sendMessage = useMutation(api.messages.send);
  const markMessagesRead = useMutation(api.messages.markRead);
  const currentUser = useQuery(api.users.getCurrentUserProfile);

  const { results, status, loadMore } = usePaginatedQuery(
    api.messages.list,
    { eventId: eventId as Id<'events'> },
    { initialNumItems: 30 }
  );
  const messages = useMemo(() => [...results].reverse(), [results]);

  const scrollToLatestMessage = useCallback((animated = true) => {
    requestAnimationFrame(() => {
      scrollViewRef.current?.scrollToEnd({ animated });
    });
  }, []);

  useEffect(() => {
    if (messages.length === 0) return;
    scrollToLatestMessage();
  }, [messages.length, scrollToLatestMessage]);

  useEffect(() => {
    if (!keyboardVisible || messages.length === 0) return;
    scrollToLatestMessage(false);
  }, [keyboardVisible, messages.length, scrollToLatestMessage]);

  useEffect(() => {
    if (focusComposer !== '1') return;

    const timeout = setTimeout(() => {
      composerRef.current?.focus();
    }, 250);

    return () => clearTimeout(timeout);
  }, [focusComposer]);

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
      <KeyboardChatScrollView
        ref={scrollViewRef}
        className="min-h-0 flex-1"
        contentContainerStyle={{
          flexGrow: 1,
          gap: 12,
          paddingHorizontal: 20,
          paddingBottom: 16,
          paddingTop: 12,
        }}
        keyboardDismissMode="interactive"
        keyboardLiftBehavior="always"
        keyboardShouldPersistTaps="handled"
        offset={composerHeight}
        onContentSizeChange={() => {
          if (messages.length > 0) {
            scrollToLatestMessage(false);
          }
        }}
        onLayout={() => {
          if (keyboardVisible && messages.length > 0) {
            scrollToLatestMessage(false);
          }
        }}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}>
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
          <>
            <View style={{ flexGrow: 1 }} />
            {messages.map((item) => (
              <ChatMessageRow
                key={item._id}
                currentUserId={currentUser?._id}
                message={item}
              />
            ))}
            <View
              style={{
                height:
                  composerHeight +
                  COMPOSER_SCROLL_GAP +
                  (keyboardVisible ? composerHeight : 0),
              }}
            />
          </>
        )}
      </KeyboardChatScrollView>

      <KeyboardStickyView>
        <View
          className="shrink-0 flex-row items-end gap-2 border-t border-border bg-background px-5 pt-3"
          style={{ paddingBottom: keyboardVisible ? 8 : Math.max(insets.bottom, 20) }}
          onLayout={(event) => {
            const nextHeight = event.nativeEvent.layout.height;
            setComposerHeight((currentHeight) =>
              Math.abs(currentHeight - nextHeight) > 1 ? nextHeight : currentHeight
            );
          }}
          collapsable={false}>
          <TextInput
            ref={composerRef}
            nativeID="event-chat-composer"
            className="min-h-[44px] flex-1 rounded-[22px] bg-card px-4 py-3 text-base text-foreground"
            placeholder="Skriv ett meddelande…"
            placeholderTextColor={APP_COLORS.textMuted}
            value={body}
            onChangeText={setBody}
            multiline
            maxLength={2000}
            enablesReturnKeyAutomatically
            enterKeyHint="enter"
            returnKeyType="default"
            submitBehavior="newline"
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
