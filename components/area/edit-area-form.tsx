import { GlassScreenHeader, useGlassHeaderSpacing } from '@/components/glass';
import { Button, Input, Text } from '@/components/ui';
import { api } from '@/convex/_generated/api';
import { Doc, Id } from '@/convex/_generated/dataModel';
import { useMutation } from 'convex/react';
import { useRouter } from 'expo-router';
import { useCallback, useReducer } from 'react';
import { Alert, ScrollView, View } from 'react-native';

type EditAreaFormProps = {
  area: Doc<'areas'>;
};

type EditAreaFormState = {
  name: string;
  description: string;
};

type EditAreaFormAction =
  | { type: 'setName'; value: string }
  | { type: 'setDescription'; value: string };

function createEditAreaFormState(area: Doc<'areas'>): EditAreaFormState {
  return {
    name: area.name,
    description: area.description ?? '',
  };
}

function editAreaFormReducer(
  state: EditAreaFormState,
  action: EditAreaFormAction
): EditAreaFormState {
  switch (action.type) {
    case 'setName':
      return { ...state, name: action.value };
    case 'setDescription':
      return { ...state, description: action.value };
  }
}

export function EditAreaForm({ area }: EditAreaFormProps) {
  const { back, replace } = useRouter();
  const { insets } = useGlassHeaderSpacing();
  const updateArea = useMutation(api.areas.update);
  const [formState, dispatch] = useReducer(
    editAreaFormReducer,
    area,
    createEditAreaFormState
  );

  const handleSubmit = useCallback(async () => {
    if (!formState.name.trim()) {
      Alert.alert('Fel', 'Namn krävs');
      return;
    }

    try {
      await updateArea({
        areaId: area._id as Id<'areas'>,
        name: formState.name.trim(),
        description: formState.description.trim() || undefined,
      });
      back();
    } catch (e: any) {
      Alert.alert('Fel', e.message ?? 'Kunde inte uppdatera område');
    }
  }, [area._id, back, formState.description, formState.name, updateArea]);

  return (
    <View className="flex-1 bg-background">
      <GlassScreenHeader title="Uppdatera info" onBack={() => back()} />

      <ScrollView
        className="flex-1 bg-background"
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 24,
          paddingTop: 0,
        }}
        contentInset={{ bottom: Math.max(insets.bottom, 24) }}
        scrollIndicatorInsets={{ bottom: Math.max(insets.bottom, 24) }}
        keyboardShouldPersistTaps="handled">
        <View className="flex-1">
          <Text className="mb-1 font-medium">Namn *</Text>
          <Input
            value={formState.name}
            onChangeText={(value) => dispatch({ type: 'setName', value })}
            placeholder="Områdesnamn"
            className="mb-4"
          />

          <Text className="mb-1 font-medium">Beskrivning</Text>
          <Input
            value={formState.description}
            onChangeText={(value) => dispatch({ type: 'setDescription', value })}
            placeholder="Valfri beskrivning"
            multiline
            numberOfLines={3}
            className="mb-4 h-20"
            textAlignVertical="top"
          />

          <Button
            variant="outline"
            className="mb-4"
            onPress={() => replace(`/area/${area._id}`)}>
            <Text>Hantera markörer på kartan</Text>
          </Button>

          <View className="flex-1" />

          <View className="gap-3 pt-6">
            <Button onPress={handleSubmit}>
              <Text>Spara ändringar</Text>
            </Button>

            <Button variant="outline" onPress={() => back()}>
              <Text>Avbryt</Text>
            </Button>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
