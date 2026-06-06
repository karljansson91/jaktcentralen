import { Text } from '@/components/ui';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from 'convex/react';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ChatViewerImage = {
  fileId: Id<'_storage'>;
  url: string;
};

function parseInitialIndex(value?: string) {
  const parsed = Number.parseInt(value ?? '0', 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

export default function ChatImageViewerScreen() {
  const { eventId, index, messageId } = useLocalSearchParams<{
    eventId: string;
    index?: string;
    messageId?: string;
  }>();
  const { back, canGoBack, replace } = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const requestedIndex = useMemo(() => parseInitialIndex(index), [index]);
  const message = useQuery(
    api.messages.getImageMessage,
    messageId
      ? {
          eventId: eventId as Id<'events'>,
          messageId: messageId as Id<'messages'>,
        }
      : 'skip'
  );
  const images = message?.images ?? [];
  const initialIndex = Math.min(requestedIndex, Math.max(images.length - 1, 0));
  const [activeIndex, setActiveIndex] = useState(requestedIndex);
  const displayedIndex = Math.min(activeIndex, Math.max(images.length - 1, 0));
  const flatListRef = useRef<FlatList<ChatViewerImage>>(null);

  function closeViewer() {
    if (canGoBack()) {
      back();
      return;
    }

    replace(`/event/${eventId}/chat`);
  }

  return (
    <View className="flex-1 bg-black">
      <View
        className="absolute left-0 right-0 z-10 flex-row items-center justify-between px-4"
        style={{ paddingTop: Math.max(insets.top, 14) }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Stäng bild"
          className="size-10 items-center justify-center rounded-full bg-black/55"
          onPress={closeViewer}>
          <Ionicons name="close" size={24} color="white" />
        </Pressable>

        {images.length > 0 ? (
          <View className="rounded-full bg-black/55 px-3 py-1.5">
            <Text className="text-xs font-medium text-white">
              {displayedIndex + 1}/{images.length}
            </Text>
          </View>
        ) : null}
      </View>

      {message === undefined ? (
        <View className="flex-1 items-center justify-center gap-3">
          <ActivityIndicator size="small" color="white" />
          <Text className="text-sm text-white/75">Laddar bild…</Text>
        </View>
      ) : images.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-center text-sm text-white/75">
            Bilden kunde inte visas.
          </Text>
        </View>
      ) : (
        <>
          <FlatList
            ref={flatListRef}
            data={images}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.fileId}
            initialScrollIndex={initialIndex}
            getItemLayout={(_, itemIndex) => ({
              index: itemIndex,
              length: width,
              offset: width * itemIndex,
            })}
            onMomentumScrollEnd={(event) => {
              const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width);
              setActiveIndex(Math.min(Math.max(nextIndex, 0), images.length - 1));
            }}
            onScrollToIndexFailed={({ index: failedIndex }) => {
              requestAnimationFrame(() => {
                flatListRef.current?.scrollToIndex({
                  animated: false,
                  index: Math.min(failedIndex, images.length - 1),
                });
              });
            }}
            renderItem={({ item }) => (
              <View
                className="items-center justify-center"
                style={{ width }}>
                <Image
                  source={{ uri: item.url }}
                  contentFit="contain"
                  style={{
                    backgroundColor: '#000000',
                    height: '100%',
                    width,
                  }}
                />
              </View>
            )}
          />

          {message.body.trim() ? (
            <View
              className="absolute bottom-0 left-0 right-0 bg-black/45 px-5"
              style={{ paddingBottom: Math.max(insets.bottom, 18), paddingTop: 12 }}>
              <Text className="text-center text-sm leading-5 text-white">
                {message.body}
              </Text>
            </View>
          ) : null}
        </>
      )}
    </View>
  );
}
