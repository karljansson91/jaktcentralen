import { Button, Card, CardHeader, CardTitle, Input, Text } from '@/components/ui';
import { EventDatePickerField } from '@/components/event/event-date-picker-field';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import {
  createJoinCodeSuggestions,
  formatJoinCodeInput,
  validateJoinCode,
} from '@/lib/join-code';
import { Ionicons } from '@expo/vector-icons';
import { useForm } from '@tanstack/react-form';
import { useMutation, useQuery } from 'convex/react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function normalizeDate(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isValidDate(date: Date | undefined): date is Date {
  return date instanceof Date && !Number.isNaN(date.getTime());
}

export default function CreateEventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { back } = useRouter();
  const insets = useSafeAreaInsets();

  const [selectedFriends, setSelectedFriends] = useState<Set<Id<'users'>>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const area = useQuery(api.areas.get, { areaId: id as Id<'areas'> });
  const friends = useQuery(api.friends.listFriends);
  const createEvent = useMutation(api.events.create);
  const inviteMember = useMutation(api.eventMembers.invite);

  const form = useForm({
    defaultValues: {
      title: '',
      description: '',
      startDate: normalizeDate(new Date()),
      endDate: normalizeDate(new Date()),
      joinCode: '',
    },
    onSubmit: async ({ value }) => {
      if (!isValidDate(value.startDate)) {
        Alert.alert('Fel', 'Välj ett startdatum.');
        return;
      }
      if (!isValidDate(value.endDate)) {
        Alert.alert('Fel', 'Välj ett slutdatum.');
        return;
      }
      if (value.endDate.getTime() < value.startDate.getTime()) {
        Alert.alert('Fel', 'Slutdatum kan inte vara före startdatum.');
        return;
      }
      const joinCodeError = validateJoinCode(value.joinCode);
      if (joinCodeError) {
        Alert.alert('Fel', joinCodeError);
        return;
      }

      setIsSubmitting(true);
      try {
        const eventId = await createEvent({
          areaId: id as Id<'areas'>,
          title: value.title.trim(),
          description: value.description.trim() || undefined,
          startDate: value.startDate.getTime(),
          endDate: value.endDate.getTime(),
          joinCode: value.joinCode.trim() || undefined,
        });

        await Promise.all(
          [...selectedFriends].map(async (friendUserId) => {
            try {
              await inviteMember({ eventId, userId: friendUserId });
            } catch {
              // Skip if invite fails
            }
          })
        );

        back();
      } catch (e: any) {
        Alert.alert('Fel', e.message ?? 'Kunde inte skapa jakt');
      }
      setIsSubmitting(false);
    },
  });

  const toggleFriend = useCallback((userId: Id<'users'>) => {
    setSelectedFriends((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  }, []);

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        className="flex-1 bg-background"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          paddingBottom: 24,
          paddingHorizontal: 24,
          paddingTop: 24,
        }}
        keyboardShouldPersistTaps="handled">
        {/* Title */}
        <form.Field
          name="title"
          validators={{
            onSubmit: ({ value }) => (!value.trim() ? 'Titel krävs' : undefined),
          }}>
          {(field) => (
            <View className="mb-4">
              <Text className="mb-1 font-medium">Titel *</Text>
              <Input
                value={field.state.value}
                onChangeText={(val) => field.handleChange(val)}
                onBlur={() => field.handleBlur()}
                placeholder="Jaktens titel"
              />
              {field.state.meta.errors.length > 0 && (
                <Text className="mt-1 text-sm text-destructive">
                  {field.state.meta.errors[0]}
                </Text>
              )}
            </View>
          )}
        </form.Field>

        {/* Description */}
        <form.Field name="description">
          {(field) => (
            <View className="mb-4">
              <Text className="mb-1 font-medium">Beskrivning</Text>
              <Input
                value={field.state.value}
                onChangeText={(val) => field.handleChange(val)}
                onBlur={() => field.handleBlur()}
                placeholder="Valfri beskrivning"
                multiline
                numberOfLines={3}
                className="h-20"
                textAlignVertical="top"
              />
            </View>
          )}
        </form.Field>

        {/* Start date */}
        <form.Field
          name="startDate"
          validators={{
            onSubmit: ({ value }) => (!isValidDate(value) ? 'Startdatum krävs' : undefined),
          }}>
          {(field) => (
            <>
              <EventDatePickerField
                label="Startdatum"
                required
                value={field.state.value}
                onValueChange={(date) => field.handleChange(normalizeDate(date))}
              />
              {field.state.meta.errors.length > 0 && (
                <Text className="mt-1 text-sm text-destructive">
                  {field.state.meta.errors[0]}
                </Text>
              )}
            </>
          )}
        </form.Field>

        {/* End date */}
        <form.Field
          name="endDate"
          validators={{
            onSubmit: ({ value }) => (!isValidDate(value) ? 'Slutdatum krävs' : undefined),
          }}>
          {(field) => (
            <>
              <EventDatePickerField
                label="Slutdatum"
                required
                value={field.state.value}
                onValueChange={(date) => field.handleChange(normalizeDate(date))}
              />
              {field.state.meta.errors.length > 0 && (
                <Text className="mt-1 text-sm text-destructive">
                  {field.state.meta.errors[0]}
                </Text>
              )}
            </>
          )}
        </form.Field>

        {/* Join code */}
        <form.Field
          name="joinCode"
          validators={{
            onSubmit: ({ value }) => validateJoinCode(value),
          }}>
          {(field) => (
            <View className="mb-6">
              <Text className="mb-1 font-medium">Anslutningskod</Text>
              <Input
                value={field.state.value}
                onChangeText={(val) => field.handleChange(formatJoinCodeInput(val))}
                onBlur={() => field.handleBlur()}
                placeholder="Valfri kod för att gå med"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Text className="mt-2 text-sm text-muted-foreground">
                Dela koden med deltagare som ska kunna gå med själva.
              </Text>
              <form.Subscribe
                selector={(state) => ({
                  joinCode: state.values.joinCode,
                  startDate: state.values.startDate,
                })}>
                {({ joinCode, startDate }) => {
                  const suggestions = createJoinCodeSuggestions(area?.name, startDate);

                  return (
                    <View className="mt-3 flex-row flex-wrap gap-2">
                      {suggestions.map((suggestion) => {
                        const isSelected = joinCode.trim() === suggestion;

                        return (
                          <Pressable
                            key={suggestion}
                            onPress={() => field.handleChange(suggestion)}
                            className={`rounded-full border px-3 py-2 ${
                              isSelected
                                ? 'border-primary bg-primary'
                                : 'border-border bg-card'
                            }`}>
                            <Text
                              className={`text-sm font-medium ${
                                isSelected ? 'text-primary-foreground' : 'text-foreground'
                              }`}>
                              {suggestion}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  );
                }}
              </form.Subscribe>
              {field.state.meta.errors.length > 0 && (
                <Text className="mt-2 text-sm text-destructive">
                  {field.state.meta.errors[0]}
                </Text>
              )}
            </View>
          )}
        </form.Field>

        {/* Friends list */}
        <Text className="mb-3 font-medium">Bjud in vänner</Text>
        {friends === undefined ? (
          <Text className="mb-4 text-muted-foreground">Laddar…</Text>
        ) : friends.length === 0 ? (
          <Text className="mb-4 text-muted-foreground">Inga vänner att bjuda in</Text>
        ) : (
          <View className="mb-6 gap-2">
            {friends.map((f) => {
              if (!f.user) return null;
              const isSelected = selectedFriends.has(f.user._id);

              return (
                <Pressable key={f.user._id} onPress={() => toggleFriend(f.user!._id)}>
                  <Card className={isSelected ? 'border-primary' : ''}>
                    <CardHeader className="flex-row items-center gap-3 py-3">
                      <View
                        className={`size-6 items-center justify-center rounded ${
                          isSelected ? 'bg-primary' : 'border border-muted-foreground/30'
                        }`}>
                        {isSelected && <Ionicons name="checkmark" size={16} color="white" />}
                      </View>
                      <CardTitle className="text-base">{f.user.name}</CardTitle>
                    </CardHeader>
                  </Card>
                </Pressable>
              );
            })}
          </View>
        )}

      </ScrollView>

      <View
        className="flex-row gap-3 border-t border-border bg-background px-6 pt-3"
        style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
        <Button
          variant="outline"
          className="flex-1"
          onPress={() => back()}
          disabled={isSubmitting}>
          <Text>Avbryt</Text>
        </Button>

        <Button onPress={() => form.handleSubmit()} className="flex-1" disabled={isSubmitting}>
          <Text>{isSubmitting ? 'Skapar…' : 'Skapa jakt'}</Text>
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}
