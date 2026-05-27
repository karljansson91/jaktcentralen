import { AreaUnavailableState } from '@/components/area/area-unavailable-state';
import { Button, Input, Text } from '@/components/ui';
import { AllowedGameEditor } from '@/components/event/allowed-game-editor';
import { EventDatePickerField } from '@/components/event/event-date-picker-field';
import { UserAvatar } from '@/components/user-avatar';
import { api } from '@/convex/_generated/api';
import type { Doc, Id } from '@/convex/_generated/dataModel';
import type { AllowedGameRule } from '@/lib/allowed-game';
import { isValidEventDate, normalizeEventDate } from '@/lib/event-dates';
import { getUserContactLine, getUserDisplayName } from '@/lib/user-profile';
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
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type FriendInviteRowProps = {
  disabled?: boolean;
  isSelected: boolean;
  onPress: () => void;
  user: Doc<'users'>;
};

function FriendInviteRow({ disabled, isSelected, onPress, user }: FriendInviteRowProps) {
  const contactLine = getUserContactLine(user);

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: isSelected, disabled }}
      disabled={disabled}
      onPress={onPress}
      className={`min-h-14 flex-row items-center gap-3 rounded-2xl border px-3 py-2 ${
        isSelected ? 'border-primary bg-primary/5' : 'border-border bg-card'
      } ${disabled ? 'opacity-60' : 'active:bg-accent'}`}>
      <UserAvatar imageUrl={user.imageUrl} name={user.name} size={36} />
      <View className="min-w-0 flex-1">
        <Text className="text-base font-semibold text-foreground" numberOfLines={1}>
          {getUserDisplayName(user)}
        </Text>
        {contactLine ? (
          <Text className="text-sm text-muted-foreground" numberOfLines={1}>
            {contactLine}
          </Text>
        ) : null}
      </View>
      <View
        className={`size-7 items-center justify-center rounded-full border ${
          isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/30 bg-background'
        }`}>
        {isSelected ? <Ionicons name="checkmark" size={16} color="white" /> : null}
      </View>
    </Pressable>
  );
}

export default function CreateEventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { back } = useRouter();
  const insets = useSafeAreaInsets();

  const [selectedFriends, setSelectedFriends] = useState<Set<Id<'users'>>>(new Set());
  const [allowedGame, setAllowedGame] = useState<AllowedGameRule[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const area = useQuery(api.areas.get, { areaId: id as Id<'areas'> });
  const friends = useQuery(api.friends.listFriends, area ? {} : 'skip');
  const createEvent = useMutation(api.events.create);
  const inviteMember = useMutation(api.eventMembers.invite);

  const form = useForm({
    defaultValues: {
      title: '',
      description: '',
      startDate: normalizeEventDate(new Date()),
      endDate: normalizeEventDate(new Date()),
      joinCode: '',
    },
    onSubmit: async ({ value }) => {
      if (!isValidEventDate(value.startDate)) {
        Alert.alert('Fel', 'Välj ett startdatum.');
        return;
      }
      if (!isValidEventDate(value.endDate)) {
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
          allowedGame,
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

  if (area === undefined) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="small" color="#2c4b31" />
      </View>
    );
  }

  if (area === null) {
    return <AreaUnavailableState message="Det går inte att skapa en jakt från ett borttaget område." />;
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        className="flex-1 bg-background"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          paddingBottom: 40,
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
            onSubmit: ({ value }) => (!isValidEventDate(value) ? 'Startdatum krävs' : undefined),
          }}>
          {(field) => (
            <>
              <EventDatePickerField
                label="Startdatum"
                required
                value={field.state.value}
                onValueChange={(date) => field.handleChange(normalizeEventDate(date))}
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
            onSubmit: ({ value }) => (!isValidEventDate(value) ? 'Slutdatum krävs' : undefined),
          }}>
          {(field) => (
            <>
              <EventDatePickerField
                label="Slutdatum"
                required
                value={field.state.value}
                onValueChange={(date) => field.handleChange(normalizeEventDate(date))}
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

        <View className="mb-6 gap-3">
          <View className="gap-1">
            <Text className="font-medium">Tillåtet vilt</Text>
            <Text className="text-sm leading-5 text-muted-foreground">
              Valfritt. Välj arter och eventuella urval för den här jakten.
            </Text>
          </View>
          <AllowedGameEditor value={allowedGame} onChange={setAllowedGame} disabled={isSubmitting} />
        </View>

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
              const friendUser = f.user;
              const isSelected = selectedFriends.has(friendUser._id);

              return (
                <FriendInviteRow
                  key={friendUser._id}
                  disabled={isSubmitting}
                  isSelected={isSelected}
                  user={friendUser}
                  onPress={() => toggleFriend(friendUser._id)}
                />
              );
            })}
          </View>
        )}

      </ScrollView>

      <View
        className="border-t border-border bg-background px-6 pt-3"
        style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
        <View className="flex-row items-center gap-3">
          <Button
            variant="ghost"
            className="h-12 flex-1 rounded-xl"
            onPress={() => back()}
            disabled={isSubmitting}>
            <Text className="text-muted-foreground">Avbryt</Text>
          </Button>

          <Button
            onPress={() => form.handleSubmit()}
            className="h-12 flex-1 rounded-xl"
            disabled={isSubmitting}>
            <Text>{isSubmitting ? 'Skapar…' : 'Skapa jakt'}</Text>
          </Button>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
