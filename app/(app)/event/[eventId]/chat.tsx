import { Text } from '@/components/ui';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { APP_COLORS } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, usePaginatedQuery, useQuery } from 'convex/react';
import { Image } from 'expo-image';
import { File, UploadType } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Href, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState, type ElementRef } from 'react';
import {
  ActivityIndicator,
  Alert,
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
const CHAT_IMAGE_GRID_WIDTH = 244;
const CHAT_IMAGE_TILE_SIZE = 118;
const MAX_CHAT_IMAGES = 4;

type ChatMessageImage = {
  fileId: Id<'_storage'>;
  url: string;
};

type PendingChatImage = {
  id: string;
  mimeType?: string;
  uri: string;
};

type ChatMessageItem = {
  _creationTime: number;
  _id: Id<'messages'>;
  body: string;
  images?: ChatMessageImage[];
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

function getFileMimeType(file: File) {
  if (file.type) {
    return file.type;
  }

  if (file.extension.toLowerCase() === '.png') {
    return 'image/png';
  }

  return 'image/jpeg';
}

async function uploadChatImage(uploadUrl: string, image: PendingChatImage) {
  const file = new File(image.uri);
  const mimeType = image.mimeType ?? getFileMimeType(file);
  const uploadResponse = await file.upload(uploadUrl, {
    headers: { 'Content-Type': mimeType },
    httpMethod: 'POST',
    sessionType: 'foreground',
    uploadType: UploadType.BINARY_CONTENT,
  });

  if (uploadResponse.status < 200 || uploadResponse.status >= 300) {
    throw new Error('Kunde inte ladda upp bilden.');
  }

  const result = JSON.parse(uploadResponse.body) as { storageId: Id<'_storage'> };
  return result.storageId;
}

function getChatSendErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return 'Försök igen om en stund.';
  }

  if (error.message.includes('[CONVEX')) {
    return 'Försök igen om en stund.';
  }

  return error.message || 'Försök igen om en stund.';
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
    case 'sat_activated':
      return {
        color: APP_COLORS.primary,
        icon: 'map-outline',
      };
    case 'sat_cleared':
      return {
        color: APP_COLORS.textMuted,
        icon: 'map-outline',
      };
    default:
      return {
        color: APP_COLORS.textMuted,
        icon: 'information-circle-outline',
      };
  }
}

function ChatImageGrid({
  images,
  isMine,
  onImagePress,
}: {
  images: ChatMessageImage[];
  isMine: boolean;
  onImagePress: (index: number) => void;
}) {
  if (images.length === 0) {
    return (
      <View
        className={`rounded-2xl px-3 py-2 ${
          isMine ? 'bg-primary-foreground/15' : 'bg-background'
        }`}>
        <Text
          className={`text-sm ${
            isMine ? 'text-primary-foreground/80' : 'text-muted-foreground'
          }`}>
          Bilden kunde inte visas
        </Text>
      </View>
    );
  }

  if (images.length === 1) {
    return (
      <Pressable
        accessibilityRole="imagebutton"
        accessibilityLabel="Visa bild"
        className="overflow-hidden rounded-[20px]"
        style={{ width: CHAT_IMAGE_GRID_WIDTH }}
        onPress={() => onImagePress(0)}>
        <Image
          source={{ uri: images[0].url }}
          contentFit="cover"
          style={{
            aspectRatio: 4 / 3,
            backgroundColor: APP_COLORS.border,
            width: '100%',
          }}
        />
      </Pressable>
    );
  }

  return (
    <View
      className="flex-row flex-wrap gap-2"
      style={{ width: CHAT_IMAGE_GRID_WIDTH }}>
      {images.map((image, index) => (
        <Pressable
          key={image.fileId}
          accessibilityRole="imagebutton"
          accessibilityLabel={`Visa bild ${index + 1}`}
          className="overflow-hidden rounded-2xl"
          style={{ height: CHAT_IMAGE_TILE_SIZE, width: CHAT_IMAGE_TILE_SIZE }}
          onPress={() => onImagePress(index)}>
          <Image
            source={{ uri: image.url }}
            contentFit="cover"
            style={{
              backgroundColor: APP_COLORS.border,
              height: '100%',
              width: '100%',
            }}
          />
        </Pressable>
      ))}
    </View>
  );
}

function ChatMessageRow({
  currentUserId,
  message,
  onImagePress,
}: {
  currentUserId?: Id<'users'>;
  message: ChatMessageItem;
  onImagePress: (message: ChatMessageItem, imageIndex: number) => void;
}) {
  const messageType = message.type ?? 'text';
  const isImageMessage = messageType === 'image';
  const isSystemMessage = messageType !== 'text' && !isImageMessage;
  const isMine = message.userId === currentUserId;
  const eventIcon = isSystemMessage ? getEventMessageIcon(messageType) : null;
  const hasBody = message.body.trim().length > 0;

  return (
    <View
      className={`max-w-[82%] rounded-[26px] ${
        isImageMessage ? 'p-2' : 'px-4 py-3'
      } ${isMine ? 'self-end bg-primary' : 'self-start bg-muted'}`}>
      {!isMine && (
        <Text
          className={`mb-1 text-xs font-semibold text-muted-foreground ${
            isImageMessage ? 'px-2 pt-1' : ''
          }`}>
          {message.user?.name ?? 'Okänd'}
        </Text>
      )}
      {isImageMessage ? (
        <View className="gap-2">
          <ChatImageGrid
            images={message.images ?? []}
            isMine={isMine}
            onImagePress={(imageIndex) => onImagePress(message, imageIndex)}
          />
          {hasBody ? (
            <Text
              className={`px-2 leading-5 ${
                isMine ? 'text-primary-foreground' : 'text-foreground'
              }`}>
              {message.body}
            </Text>
          ) : null}
        </View>
      ) : null}
      <View className="flex-row items-start gap-2">
        {eventIcon ? (
          <View
            className={`mt-0.5 size-6 items-center justify-center rounded-full ${isMine ? 'bg-primary-foreground/90' : 'bg-background'}`}>
            <Ionicons name={eventIcon.icon} size={15} color={eventIcon.color} />
          </View>
        ) : null}
        {!isImageMessage ? (
          <Text
            className={`shrink leading-5 ${
              isMine ? 'text-primary-foreground' : 'text-foreground'
            }`}>
            {message.body}
          </Text>
        ) : null}
      </View>
      <Text
        className={`mt-1 text-right text-[11px] ${isImageMessage ? 'px-2' : ''} ${
          isMine ? 'text-primary-foreground/70' : 'text-muted-foreground'
        }`}>
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
  const { back, canGoBack, push, replace } = useRouter();
  const insets = useSafeAreaInsets();
  const keyboardVisible = useKeyboardState((state) => state.isVisible);
  const scrollViewRef = useRef<ElementRef<typeof KeyboardChatScrollView>>(null);
  const composerRef = useRef<ElementRef<typeof TextInput>>(null);
  const [body, setBody] = useState('');
  const [composerHeight, setComposerHeight] = useState(COMPOSER_KEYBOARD_OFFSET);
  const [pendingImages, setPendingImages] = useState<PendingChatImage[]>([]);
  const [isAddingImages, setIsAddingImages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const sendMessage = useMutation(api.messages.send);
  const sendImageMessage = useMutation(api.messages.sendImage);
  const generateUploadUrl = useMutation(api.messages.generateUploadUrl);
  const markMessagesRead = useMutation(api.messages.markRead);
  const currentUser = useQuery(api.users.getCurrentUserProfile);
  const isBusy = isAddingImages || isSending;
  const canSend = body.trim().length > 0 || pendingImages.length > 0;

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

  const handlePickImages = useCallback(async () => {
    const remainingSlots = MAX_CHAT_IMAGES - pendingImages.length;
    if (remainingSlots <= 0) {
      Alert.alert('Max antal bilder', `Du kan lägga till max ${MAX_CHAT_IMAGES} bilder.`);
      return;
    }

    setIsAddingImages(true);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Behörighet krävs', 'Ge appen åtkomst till bilder för att skicka dem.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsMultipleSelection: remainingSlots > 1,
        mediaTypes: ['images'],
        preferredAssetRepresentationMode:
          ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
        quality: 0.78,
        selectionLimit: remainingSlots,
      });

      if (result.canceled) {
        return;
      }

      const pickedAt = Date.now();
      const nextImages = result.assets.slice(0, remainingSlots).map((asset, index) => ({
        id: `${asset.assetId ?? asset.uri}-${pickedAt}-${index}`,
        mimeType: asset.mimeType,
        uri: asset.uri,
      }));

      setPendingImages((current) => [...current, ...nextImages].slice(0, MAX_CHAT_IMAGES));
    } catch (error) {
      Alert.alert(
        'Kunde inte lägga till bild',
        error instanceof Error ? error.message : 'Försök igen om en stund.'
      );
    } finally {
      setIsAddingImages(false);
    }
  }, [pendingImages.length]);

  const handleTakePhoto = useCallback(async () => {
    if (pendingImages.length >= MAX_CHAT_IMAGES) {
      Alert.alert('Max antal bilder', `Du kan lägga till max ${MAX_CHAT_IMAGES} bilder.`);
      return;
    }

    setIsAddingImages(true);
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Behörighet krävs', 'Ge appen åtkomst till kameran för att ta en bild.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.78,
      });

      if (result.canceled || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      const pickedAt = Date.now();
      setPendingImages((current) =>
        [
          ...current,
          {
            id: `${asset.assetId ?? asset.uri}-${pickedAt}`,
            mimeType: asset.mimeType,
            uri: asset.uri,
          },
        ].slice(0, MAX_CHAT_IMAGES)
      );
    } catch (error) {
      Alert.alert(
        'Kunde inte ta bild',
        error instanceof Error ? error.message : 'Försök igen om en stund.'
      );
    } finally {
      setIsAddingImages(false);
    }
  }, [pendingImages.length]);

  const handleChooseImageSource = useCallback(() => {
    if (isBusy) return;

    if (pendingImages.length >= MAX_CHAT_IMAGES) {
      Alert.alert('Max antal bilder', `Du kan lägga till max ${MAX_CHAT_IMAGES} bilder.`);
      return;
    }

    Alert.alert('Lägg till bild', undefined, [
      { text: 'Ta bild', onPress: () => void handleTakePhoto() },
      { text: 'Välj från bilder', onPress: () => void handlePickImages() },
      { text: 'Avbryt', style: 'cancel' },
    ]);
  }, [handlePickImages, handleTakePhoto, isBusy, pendingImages.length]);

  const handleRemovePendingImage = useCallback((imageId: string) => {
    setPendingImages((current) => current.filter((image) => image.id !== imageId));
  }, []);

  const handleOpenImage = useCallback(
    (message: ChatMessageItem, imageIndex: number) => {
      push(
        `/event/${eventId}/chat-image-viewer?messageId=${message._id}&index=${imageIndex}` as Href
      );
    },
    [eventId, push]
  );

  const handleSend = useCallback(async () => {
    const trimmed = body.trim();
    if (!trimmed && pendingImages.length === 0) return;
    if (isSending) return;

    setIsSending(true);
    try {
      if (pendingImages.length > 0) {
        const imageFileIds = await Promise.all(
          pendingImages.map(async (image) => {
            const uploadUrl = await generateUploadUrl();
            return await uploadChatImage(uploadUrl, image);
          })
        );

        await sendImageMessage({
          body: trimmed,
          eventId: eventId as Id<'events'>,
          imageFileIds,
        });
        setPendingImages([]);
      } else {
        await sendMessage({ eventId: eventId as Id<'events'>, body: trimmed });
      }

      setBody('');
      scrollToLatestMessage();
    } catch (error) {
      Alert.alert(
        'Kunde inte skicka meddelandet',
        getChatSendErrorMessage(error)
      );
    } finally {
      setIsSending(false);
    }
  }, [
    body,
    eventId,
    generateUploadUrl,
    isSending,
    pendingImages,
    scrollToLatestMessage,
    sendImageMessage,
    sendMessage,
  ]);

  const closeChat = useCallback(() => {
    if (canGoBack()) {
      back();
      return;
    }

    replace(`/event/${eventId}`);
  }, [back, canGoBack, eventId, replace]);

  return (
    <View style={{ flex: 1, backgroundColor: APP_COLORS.background }} collapsable={false}>
      <View className="h-12 shrink-0 flex-row items-center justify-center border-b border-border bg-background px-4">
        <Text className="text-base font-semibold text-foreground">Chat</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Stäng chat"
          className="absolute right-4 size-9 items-center justify-center rounded-full bg-card active:bg-muted"
          onPress={closeChat}>
          <Ionicons name="close" size={22} color={APP_COLORS.text} />
        </Pressable>
      </View>

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
                onImagePress={handleOpenImage}
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
          className="shrink-0 border-t border-border bg-background px-5 pt-3"
          style={{ paddingBottom: keyboardVisible ? 8 : Math.max(insets.bottom, 20) }}
          onLayout={(event) => {
            const nextHeight = event.nativeEvent.layout.height;
            setComposerHeight((currentHeight) =>
              Math.abs(currentHeight - nextHeight) > 1 ? nextHeight : currentHeight
            );
          }}
          collapsable={false}>
          {pendingImages.length > 0 ? (
            <View className="mb-3 gap-2">
              <View className="flex-row items-center justify-between">
                <Text className="text-xs font-medium text-muted-foreground">
                  Bilder {pendingImages.length}/{MAX_CHAT_IMAGES}
                </Text>
              </View>
              <View className="flex-row flex-wrap gap-2">
                {pendingImages.map((image) => (
                  <View
                    key={image.id}
                    className="relative size-14 overflow-hidden rounded-2xl bg-muted">
                    <Image
                      source={{ uri: image.uri }}
                      contentFit="cover"
                      style={{ height: 56, width: 56 }}
                    />
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Ta bort bild"
                      className="absolute right-1 top-1 rounded-full bg-black/65 p-0.5"
                      disabled={isSending}
                      onPress={() => handleRemovePendingImage(image.id)}>
                      <Ionicons name="close" size={12} color="white" />
                    </Pressable>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          <View className="flex-row items-end gap-2">
            <Pressable
              onPress={handleChooseImageSource}
              className={`size-11 items-center justify-center rounded-full ${
                isBusy ? 'bg-muted' : 'bg-card'
              }`}
              disabled={isBusy}
              accessibilityRole="button"
              accessibilityLabel="Lägg till bild">
              {isAddingImages ? (
                <ActivityIndicator size="small" color={APP_COLORS.primary} />
              ) : (
                <Ionicons name="image-outline" size={23} color={APP_COLORS.primary} />
              )}
            </Pressable>
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
              editable={!isSending}
              enablesReturnKeyAutomatically
              enterKeyHint="enter"
              returnKeyType="default"
              submitBehavior="newline"
            />
            <Pressable
              onPress={handleSend}
              className={`size-11 items-center justify-center rounded-full ${
                canSend && !isBusy ? 'bg-primary' : 'bg-muted'
              }`}
              disabled={!canSend || isBusy}
              accessibilityRole="button"
              accessibilityLabel="Skicka meddelande">
              {isSending ? (
                <ActivityIndicator size="small" color={APP_COLORS.surface} />
              ) : (
                <Ionicons
                  name="arrow-up"
                  size={24}
                  color={canSend && !isBusy ? APP_COLORS.surface : APP_COLORS.textMuted}
                />
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardStickyView>
    </View>
  );
}
