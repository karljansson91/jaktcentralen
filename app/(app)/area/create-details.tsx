import { GlassIconButton } from '@/components/glass';
import { Button, Input, Text } from '@/components/ui';
import { api } from '@/convex/_generated/api';
import {
  clearAreaCreateDraft,
  getAreaCreateDraft,
  saveAreaCreateDraft,
} from '@/lib/area-create-draft-store';
import { withLoadingState } from '@/lib/async-state';
import { useMutation } from 'convex/react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

function getDraftId(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function CreateAreaDetailsScreen() {
  const params = useLocalSearchParams<{ draftId?: string }>();
  const draftId = getDraftId(params.draftId);
  const { back, dismissAll, push } = useRouter();
  const createArea = useMutation(api.areas.create);
  const [draft] = useState(() => (draftId ? getAreaCreateDraft(draftId) : undefined));
  const [name, setName] = useState(draft?.name ?? '');
  const [errorText, setErrorText] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNameChange = (nextName: string) => {
    setName(nextName);
    if (draftId && draft) {
      saveAreaCreateDraft({ ...draft, name: nextName }, draftId);
    }
  };

  const handleSubmit = async () => {
    if (!draftId || !draft || draft.polygon.length < 3) {
      setErrorText('Ritningen kunde inte hittas.');
      return;
    }
    if (!name.trim()) {
      setErrorText('Namn krävs.');
      return;
    }

    setErrorText(null);
    await withLoadingState(setIsSubmitting, async () => {
      try {
        const areaId = await createArea({
          name: name.trim(),
          polygon: draft.polygon.map(([longitude, latitude]) => ({ latitude, longitude })),
        });
        clearAreaCreateDraft(draftId);
        dismissAll();
        push(`/area/${areaId}`);
      } catch (error) {
        setErrorText(error instanceof Error ? error.message : 'Kunde inte skapa området.');
      }
    });
  };

  if (!draft) {
    return (
      <View className="gap-4 bg-background p-6">
        <Text variant="h3">Ritningen saknas</Text>
        <Text className="text-muted-foreground">Stäng och rita området igen.</Text>
        <Button onPress={back}>
          <Text>Stäng</Text>
        </Button>
      </View>
    );
  }

  return (
    <ScrollView
      className="bg-background"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{
        gap: 18,
        paddingBottom: 28,
        paddingHorizontal: 24,
        paddingTop: 20,
      }}
      keyboardShouldPersistTaps="handled"
    >
      <View className="flex-row items-center justify-between gap-3">
        <Text variant="h3" className="min-w-0 flex-1">
          Namnge område
        </Text>
        <GlassIconButton
          icon="close"
          iconSize={21}
          accessibilityLabel="Tillbaka till ritning"
          onPress={back}
          surfaceClassName="size-10"
        />
      </View>

      <View className="gap-2">
        <Text className="font-medium">Namn *</Text>
        <Input
          autoFocus
          value={name}
          onChangeText={handleNameChange}
          placeholder="Områdesnamn"
          returnKeyType="done"
          onSubmitEditing={() => void handleSubmit()}
        />
      </View>

      {errorText ? (
        <Text selectable className="text-sm text-destructive">
          {errorText}
        </Text>
      ) : null}

      <Button
        size="xl"
        className="rounded-2xl"
        disabled={isSubmitting || !name.trim()}
        onPress={() => void handleSubmit()}
      >
        <Text>{isSubmitting ? 'Skapar…' : 'Skapa område'}</Text>
      </Button>
    </ScrollView>
  );
}
