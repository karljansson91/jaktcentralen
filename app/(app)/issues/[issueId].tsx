import { IssueForm, type IssueFormValues } from '@/components/issues/issue-form';
import { Button, Text } from '@/components/ui';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { APP_COLORS } from '@/lib/theme';
import { useMutation, useQuery } from 'convex/react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, View } from 'react-native';

export default function IssueDetailsScreen() {
  const { issueId } = useLocalSearchParams<{ issueId?: string }>();
  const { back } = useRouter();
  const issue = useQuery(
    api.issues.get,
    issueId ? { issueId: issueId as Id<'issues'> } : 'skip'
  );
  const updateIssue = useMutation(api.issues.update);
  const removeIssue = useMutation(api.issues.remove);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleSubmit(values: IssueFormValues) {
    if (!issueId) {
      return;
    }

    setIsSaving(true);
    try {
      await updateIssue({
        description: values.description,
        issueId: issueId as Id<'issues'>,
        status: values.status,
        title: values.title,
        type: values.type,
      });
      back();
    } catch (error) {
      Alert.alert(
        'Kunde inte spara ärende',
        error instanceof Error ? error.message : 'Försök igen om en stund.'
      );
      setIsSaving(false);
    }
  }

  function confirmDelete() {
    Alert.alert('Ta bort ärende?', undefined, [
      { text: 'Avbryt', style: 'cancel' },
      {
        text: 'Ta bort',
        style: 'destructive',
        onPress: () => {
          void handleDelete();
        },
      },
    ]);
  }

  async function handleDelete() {
    if (!issueId) {
      return;
    }

    setIsDeleting(true);
    try {
      await removeIssue({ issueId: issueId as Id<'issues'> });
      back();
    } catch (error) {
      Alert.alert(
        'Kunde inte ta bort ärende',
        error instanceof Error ? error.message : 'Försök igen om en stund.'
      );
      setIsDeleting(false);
    }
  }

  if (issue === undefined) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="small" color={APP_COLORS.primary} />
      </View>
    );
  }

  if (!issue) {
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-background px-6">
        <Text className="text-center text-muted-foreground">Ärendet kunde inte laddas.</Text>
        <Button variant="outline" className="h-11 rounded-xl bg-background" onPress={() => back()}>
          <Text>Tillbaka</Text>
        </Button>
      </View>
    );
  }

  return (
    <IssueForm
      initialValues={{
        description: issue.description,
        status: issue.status,
        title: issue.title,
        type: issue.type,
      }}
      isDeleting={isDeleting}
      isSaving={isSaving}
      onCancel={() => back()}
      onDelete={confirmDelete}
      onSubmit={(values) => void handleSubmit(values)}
      screenshotUrl={issue.screenshotUrl}
      showStatusEditor
      submitLabel="Spara"
      title="Ärende"
    />
  );
}
