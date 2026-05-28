import { Button, Input, Text } from '@/components/ui';
import {
  ISSUE_STATUS_OPTIONS,
  ISSUE_TYPE_OPTIONS,
  canSaveIssue,
  getIssueStatusLabel,
  type IssueStatus,
  type IssueType,
} from '@/lib/issues';
import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IssueChip } from './issue-chip';

export type IssueFormValues = {
  description: string;
  status: IssueStatus;
  title: string;
  type: IssueType;
};

type IssueFormProps = {
  initialValues?: IssueFormValues;
  isDeleting?: boolean;
  isSaving: boolean;
  onCancel: () => void;
  onDelete?: () => void;
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

export function IssueForm({
  initialValues,
  isDeleting,
  isSaving,
  onCancel,
  onDelete,
  onSubmit,
  screenshotUrl,
  showStatusEditor = false,
  submitLabel,
  title,
}: IssueFormProps) {
  const insets = useSafeAreaInsets();
  const startingValues = useMemo(() => initialValues ?? DEFAULT_VALUES, [initialValues]);
  const [values, setValues] = useState<IssueFormValues>(startingValues);
  const canSubmit = canSaveIssue(values.title, values.description) && !isSaving && !isDeleting;
  const bottomContentInset = Math.max(insets.bottom, 16);

  function updateValue<Key extends keyof IssueFormValues>(key: Key, value: IssueFormValues[Key]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  return (
    <ScrollView
      className="bg-background"
      contentContainerClassName="gap-5 px-5 pt-5"
      contentContainerStyle={{ paddingBottom: 16 }}
      contentInset={{ bottom: bottomContentInset }}
      keyboardShouldPersistTaps="handled"
      scrollIndicatorInsets={{ bottom: bottomContentInset }}
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

      <View className="flex-row gap-3 pt-2">
        <Button
          variant="outline"
          className="h-12 flex-1 rounded-xl bg-background"
          disabled={isSaving || isDeleting}
          onPress={onCancel}>
          <Text>Avbryt</Text>
        </Button>
        <Button
          className="h-12 flex-1 rounded-xl"
          disabled={!canSubmit}
          onPress={() => onSubmit(values)}>
          {isSaving ? <ActivityIndicator size="small" color="#fff" /> : <Text>{submitLabel}</Text>}
        </Button>
      </View>

      {onDelete ? (
        <Button
          variant="destructive"
          className="h-12 rounded-xl"
          disabled={isSaving || isDeleting}
          onPress={onDelete}>
          <Text>{isDeleting ? 'Tar bort...' : 'Ta bort feedback'}</Text>
        </Button>
      ) : null}
    </ScrollView>
  );
}
