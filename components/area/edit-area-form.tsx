import { Button, Input, Text } from '@/components/ui';
import { api } from '@/convex/_generated/api';
import { Doc, Id } from '@/convex/_generated/dataModel';
import { useMutation } from 'convex/react';
import { useRouter } from 'expo-router';
import { useCallback, useReducer } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  const { back } = useRouter();
  const insets = useSafeAreaInsets();
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
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        className="flex-1 bg-background"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 24,
          paddingTop: 24,
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
    </KeyboardAvoidingView>
  );
}
