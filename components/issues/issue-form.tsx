import { Button, Input, Text } from '@/components/ui';
import {
  ISSUE_STATUS_OPTIONS,
  ISSUE_TYPE_OPTIONS,
  canSaveIssue,
  getIssueStatusLabel,
  type IssueStatus,
  type IssueType,
} from '@/lib/issues';
import { APP_COLORS } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import {
  KeyboardAwareScrollView,
  KeyboardStickyView,
  useKeyboardState,
} from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IssueChip } from './issue-chip';

export type IssueFormValues = {
  description: string;
  status: IssueStatus;
  title: string;
  type: IssueType;
};

export type IssueFormImage = {
  id: string;
  url: string;
};

type IssueFormBusyState = 'idle' | 'addingAttachment' | 'deleting' | 'saving';

type IssueFormProps = {
  attachmentImages?: IssueFormImage[];
  busyState?: IssueFormBusyState;
  initialValues?: IssueFormValues;
  maxAttachmentImages?: number;
  onAddAttachment?: () => void;
  onCancel: () => void;
  onDelete?: () => void;
  onRemoveAttachment?: (imageId: string) => void;
  onSubmit: (values: IssueFormValues) => void;
  screenshotUrl?: string | null;
  showStatusEditor?: boolean;
  submitLabel: string;
  title: string;
};

const DEFAULT_VALUES: IssueFormValues = {
  description: '',
  status: 'triage',
  title: '',
  type: 'bug',
};

const EMPTY_IMAGES: IssueFormImage[] = [];
const ACTION_FOOTER_FALLBACK_HEIGHT = 96;

export function IssueForm({
  attachmentImages = EMPTY_IMAGES,
  busyState = 'idle',
  initialValues,
  maxAttachmentImages,
  onAddAttachment,
  onCancel,
  onDelete,
  onRemoveAttachment,
  onSubmit,
  screenshotUrl,
  showStatusEditor = false,
  submitLabel,
  title,
}: IssueFormProps) {
  const insets = useSafeAreaInsets();
  const keyboardVisible = useKeyboardState((state) => state.isVisible);
  const startingValues = useMemo(() => initialValues ?? DEFAULT_VALUES, [initialValues]);
  const [values, setValues] = useState<IssueFormValues>(startingValues);
  const [actionFooterHeight, setActionFooterHeight] = useState(ACTION_FOOTER_FALLBACK_HEIGHT);
  const isBusy = busyState !== 'idle';
  const canSubmit = canSaveIssue(values.title, values.description) && !isBusy;
  const bottomContentInset = Math.max(insets.bottom, 16);
  const scrollBottomSpace = actionFooterHeight + 16;
  const canAddAttachment =
    Boolean(onAddAttachment) &&
    (maxAttachmentImages === undefined || attachmentImages.length < maxAttachmentImages);
  const showAttachments = attachmentImages.length > 0 || Boolean(onAddAttachment);

  function updateValue<Key extends keyof IssueFormValues>(key: Key, value: IssueFormValues[Key]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  return (
    <View className="flex-1 bg-background">
      <KeyboardAwareScrollView
        bottomOffset={actionFooterHeight + 12}
        className="min-h-0 flex-1 bg-background"
        contentContainerClassName="gap-5 px-5 pt-5"
        contentContainerStyle={{ paddingBottom: scrollBottomSpace }}
        contentInset={{ bottom: scrollBottomSpace }}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        scrollIndicatorInsets={{ bottom: scrollBottomSpace }}
        showsVerticalScrollIndicator={false}>
        <View className="gap-1">
          <Text className="text-[26px] font-semibold leading-[32px] text-foreground">
            {title}
          </Text>
          {!showStatusEditor ? (
            <Text className="text-sm text-muted-foreground">
              Status: {getIssueStatusLabel('triage')}
            </Text>
          ) : null}
        </View>

        {screenshotUrl ? (
          <View className="overflow-hidden rounded-2xl border border-border bg-card">
            <Image
              source={{ uri: screenshotUrl }}
              contentFit="contain"
              style={{ height: 220, width: '100%' }}
            />
          </View>
        ) : null}

        {showAttachments ? (
          <View className="gap-3">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-medium text-foreground">Bilder</Text>
              {maxAttachmentImages !== undefined ? (
                <Text className="text-xs text-muted-foreground">
                  {attachmentImages.length}/{maxAttachmentImages}
                </Text>
              ) : null}
            </View>

            {attachmentImages.length > 0 ? (
              <View className="flex-row flex-wrap gap-3">
                {attachmentImages.map((image) => (
                  <View
                    key={image.id}
                    className="relative size-24 overflow-hidden rounded-xl border border-border bg-card">
                    <Image
                      source={{ uri: image.url }}
                      contentFit="cover"
                      style={{
                        backgroundColor: APP_COLORS.border,
                        height: 96,
                        width: 96,
                      }}
                    />
                    {onRemoveAttachment ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Ta bort bild"
                        className="absolute right-1 top-1 rounded-full bg-black/65 p-1"
                        hitSlop={8}
                        onPress={() => onRemoveAttachment(image.id)}>
                        <Ionicons name="close" size={14} color="white" />
                      </Pressable>
                    ) : null}
                  </View>
                ))}
              </View>
            ) : null}

            {canAddAttachment ? (
              <Button
                variant="outline"
                className="h-12 rounded-xl border-dashed bg-card"
                disabled={isBusy}
                onPress={onAddAttachment}>
                <Ionicons name="image-outline" size={18} color={APP_COLORS.primary} />
                <Text>{busyState === 'addingAttachment' ? 'Öppnar...' : 'Lägg till bild'}</Text>
              </Button>
            ) : null}
          </View>
        ) : null}

        <View className="gap-2">
          <Text className="text-sm font-medium text-foreground">Typ</Text>
          <View className="flex-row flex-wrap gap-2">
            {ISSUE_TYPE_OPTIONS.map((option) => (
              <IssueChip
                key={option.value}
                label={option.label}
                selected={values.type === option.value}
                value={option.value}
                onPress={(nextType) => updateValue('type', nextType)}
              />
            ))}
          </View>
        </View>

        {showStatusEditor ? (
          <View className="gap-2">
            <Text className="text-sm font-medium text-foreground">Status</Text>
            <View className="flex-row flex-wrap gap-2">
              {ISSUE_STATUS_OPTIONS.map((option) => (
                <IssueChip
                  key={option.value}
                  label={option.label}
                  selected={values.status === option.value}
                  value={option.value}
                  onPress={(nextStatus) => updateValue('status', nextStatus)}
                />
              ))}
            </View>
          </View>
        ) : null}

        <View className="gap-2">
          <Text className="text-sm font-medium text-foreground">Titel</Text>
          <Input
            value={values.title}
            onChangeText={(nextTitle) => updateValue('title', nextTitle)}
            placeholder="Kort titel"
            className="h-12 rounded-xl bg-card"
            maxLength={120}
          />
        </View>

        <View className="gap-2">
          <Text className="text-sm font-medium text-foreground">Beskrivning</Text>
          <Input
            value={values.description}
            onChangeText={(nextDescription) => updateValue('description', nextDescription)}
            placeholder="Vad behöver fixas?"
            className="min-h-32 rounded-xl bg-card py-3"
            maxLength={4000}
            multiline
            style={{ height: 128 }}
            textAlignVertical="top"
          />
        </View>
      </KeyboardAwareScrollView>

      <KeyboardStickyView>
        <View
          className="gap-3 border-t border-border bg-background px-5 pt-3"
          style={{ paddingBottom: keyboardVisible ? 8 : bottomContentInset }}
          onLayout={(event) => {
            const nextHeight = event.nativeEvent.layout.height;
            setActionFooterHeight((currentHeight) =>
              Math.abs(currentHeight - nextHeight) > 1 ? nextHeight : currentHeight
            );
          }}>
          <View className="flex-row gap-3">
            <Button
              variant="outline"
              className="h-12 flex-1 rounded-xl bg-background"
              disabled={isBusy}
              onPress={onCancel}>
              <Text>Avbryt</Text>
            </Button>
            <Button
              className="h-12 flex-1 rounded-xl"
              disabled={!canSubmit}
              onPress={() => onSubmit(values)}>
              {busyState === 'saving' ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text>{submitLabel}</Text>
              )}
            </Button>
          </View>

          {onDelete ? (
            <Button
              variant="destructive"
              className="h-12 rounded-xl"
              disabled={isBusy}
              onPress={onDelete}>
              <Text>{busyState === 'deleting' ? 'Tar bort...' : 'Ta bort feedback'}</Text>
            </Button>
          ) : null}
        </View>
      </KeyboardStickyView>
    </View>
  );
}
