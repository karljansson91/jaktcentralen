import { IssueForm, type IssueFormValues } from '@/components/issues/issue-form';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import {
  clearPendingIssueReportDraft,
  getPendingIssueReportDraft,
} from '@/lib/issue-report-draft';
import { useMutation } from 'convex/react';
import { Href, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert } from 'react-native';

async function uploadScreenshot(uploadUrl: string, screenshotUri: string) {
  const image = await fetch(screenshotUri);
  const blob = await image.blob();
  const response = await fetch(uploadUrl, {
    body: blob,
    headers: { 'Content-Type': blob.type || 'image/jpeg' },
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error('Upload failed');
  }

  const result = (await response.json()) as { storageId: Id<'_storage'> };
  return result.storageId;
}

export default function IssueReportScreen() {
  const { back, replace } = useRouter();
  const createIssue = useMutation(api.issues.create);
  const generateUploadUrl = useMutation(api.issues.generateScreenshotUploadUrl);
  const [isSaving, setIsSaving] = useState(false);
  const draft = useMemo(() => getPendingIssueReportDraft(), []);

  async function handleSubmit(values: IssueFormValues) {
    setIsSaving(true);
    try {
      let screenshotFileId: Id<'_storage'> | undefined;
      if (draft?.screenshotUri) {
        const uploadUrl = await generateUploadUrl();
        screenshotFileId = await uploadScreenshot(uploadUrl, draft.screenshotUri);
      }

      await createIssue({
        description: values.description,
        screenPath: draft?.screenPath,
        screenshotFileId,
        title: values.title,
        type: values.type,
      });
      clearPendingIssueReportDraft();
      replace('/issues' as Href);
    } catch (error) {
      Alert.alert(
        'Kunde inte skapa feedback',
        error instanceof Error ? error.message : 'Försök igen om en stund.'
      );
      setIsSaving(false);
    }
  }

  return (
    <IssueForm
      isSaving={isSaving}
      onCancel={() => back()}
      onSubmit={(values) => void handleSubmit(values)}
      screenshotUrl={draft?.screenshotUri}
      submitLabel="Skapa"
      title="Ny feedback"
    />
  );
}
