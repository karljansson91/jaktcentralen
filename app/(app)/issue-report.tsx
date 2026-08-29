import { IssueForm, type IssueFormValues } from '@/components/issues/issue-form';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { withLoadingState } from '@/lib/async-state';
import { clearPendingIssueReportDraft, getPendingIssueReportDraft } from '@/lib/issue-report-draft';
import { useMutation } from 'convex/react';
import { File, UploadType } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Href, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';

const MAX_ISSUE_IMAGES = 4;

type PendingIssueImage = {
  id: string;
  mimeType?: string;
  uri: string;
};

function getFileMimeType(file: File) {
  if (file.type) {
    return file.type;
  }

  if (file.extension.toLowerCase() === '.png') {
    return 'image/png';
  }

  return 'image/jpeg';
}

async function uploadIssueImage(uploadUrl: string, imageUri: string, fallbackMimeType?: string) {
  const file = new File(imageUri);
  const mimeType = fallbackMimeType ?? getFileMimeType(file);

  const uploadResponse = await file.upload(uploadUrl, {
    headers: { 'Content-Type': mimeType },
    httpMethod: 'POST',
    sessionType: 'foreground',
    uploadType: UploadType.BINARY_CONTENT,
  });

  if (uploadResponse.status < 200 || uploadResponse.status >= 300) {
    throw new Error('Upload failed');
  }

  const result = JSON.parse(uploadResponse.body) as { storageId: Id<'_storage'> };
  return result.storageId;
}

export default function IssueReportScreen() {
  const { back, replace } = useRouter();
  const createIssue = useMutation(api.issues.create);
  const generateUploadUrl = useMutation(api.issues.generateUploadUrl);
  const [isSaving, setIsSaving] = useState(false);
  const [isAddingAttachments, setIsAddingAttachments] = useState(false);
  const [attachments, setAttachments] = useState<PendingIssueImage[]>([]);
  const draft = getPendingIssueReportDraft();
  const attachmentImages = attachments.map((image) => ({ id: image.id, url: image.uri }));

  useEffect(() => {
    return () => {
      clearPendingIssueReportDraft();
    };
  }, []);

  async function handleAddAttachments() {
    const remainingSlots = MAX_ISSUE_IMAGES - attachments.length;

    if (remainingSlots <= 0) {
      Alert.alert('Max antal bilder', `Du kan lägga till max ${MAX_ISSUE_IMAGES} bilder.`);
      return;
    }

    setIsAddingAttachments(true);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Behörighet krävs', 'Ge appen åtkomst till bilder för att lägga till dem.');
        setIsAddingAttachments(false);
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
        setIsAddingAttachments(false);
        return;
      }

      const pickedAt = Date.now();
      const nextImages = result.assets.slice(0, remainingSlots).map((asset, index) => ({
        id: `${asset.assetId ?? asset.uri}-${pickedAt}-${index}`,
        mimeType: asset.mimeType,
        uri: asset.uri,
      }));

      setAttachments((current) => [...current, ...nextImages].slice(0, MAX_ISSUE_IMAGES));
    } catch (error) {
      Alert.alert(
        'Kunde inte lägga till bild',
        error instanceof Error ? error.message : 'Försök igen om en stund.'
      );
      setIsAddingAttachments(false);
      return;
    }
    setIsAddingAttachments(false);
  }

  function handleRemoveAttachment(imageId: string) {
    setAttachments((current) => current.filter((image) => image.id !== imageId));
  }

  function handleCancel() {
    clearPendingIssueReportDraft();
    setAttachments([]);
    back();
  }

  async function handleSubmit(values: IssueFormValues) {
    await withLoadingState(setIsSaving, async () => {
      try {
        let screenshotFileId: Id<'_storage'> | undefined;
        if (draft?.screenshotUri) {
          const uploadUrl = await generateUploadUrl();
          screenshotFileId = await uploadIssueImage(uploadUrl, draft.screenshotUri);
        }
        const imageFileIds =
          attachments.length > 0
            ? await Promise.all(
                attachments.map(async (image) => {
                  const uploadUrl = await generateUploadUrl();
                  return await uploadIssueImage(uploadUrl, image.uri, image.mimeType);
                })
              )
            : undefined;

        await createIssue({
          description: values.description,
          imageFileIds,
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
      }
    });
  }

  return (
    <IssueForm
      attachmentImages={attachmentImages}
      busyState={isSaving ? 'saving' : isAddingAttachments ? 'addingAttachment' : 'idle'}
      maxAttachmentImages={MAX_ISSUE_IMAGES}
      onAddAttachment={() => void handleAddAttachments()}
      onCancel={handleCancel}
      onRemoveAttachment={handleRemoveAttachment}
      onSubmit={(values) => void handleSubmit(values)}
      screenshotUrl={draft?.screenshotUri}
      submitLabel="Skapa"
      title="Ny feedback"
    />
  );
}
