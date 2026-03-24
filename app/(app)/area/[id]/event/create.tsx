import { Button, Card, CardHeader, CardTitle, Input, Text } from '@/components/ui';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { Ionicons } from '@expo/vector-icons';
import { useForm } from '@tanstack/react-form';
import { useMutation, useQuery } from 'convex/react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';

export default function CreateEventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [selectedFriends, setSelectedFriends] = useState<Set<Id<'users'>>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const friends = useQuery(api.friends.listFriends);
  const createEvent = useMutation(api.events.create);
  const inviteMember = useMutation(api.eventMembers.invite);

  const form = useForm({
    defaultValues: {
      title: '',
      description: '',
      startDate: '',
      endDate: '',
      joinCode: '',
    },
    onSubmit: async ({ value }) => {
      const parsedStart = new Date(value.startDate.trim()).getTime();
      if (isNaN(parsedStart)) {
        Alert.alert('Fel', 'Ogiltigt startdatum. Använd ÅÅÅÅ-MM-DD');
        return;
      }
      let parsedEnd: number | undefined;
      if (value.endDate.trim()) {
        parsedEnd = new Date(value.endDate.trim()).getTime();
        if (isNaN(parsedEnd)) {
          Alert.alert('Fel', 'Ogiltigt slutdatum. Använd ÅÅÅÅ-MM-DD');
          return;
        }
      }

      setIsSubmitting(true);
      try {
        const eventId = await createEvent({
          areaId: id as Id<'areas'>,
          title: value.title.trim(),
          description: value.description.trim() || undefined,
          startDate: parsedStart,
          endDate: parsedEnd,
          joinCode: value.joinCode.trim() || undefined,
        });

        for (const friendUserId of selectedFriends) {
          try {
            await inviteMember({ eventId, userId: friendUserId });
          } catch {
            // Skip if invite fails
          }
        }

        router.back();
      } catch (e: any) {
        Alert.alert('Fel', e.message ?? 'Kunde inte skapa jakt');
      } finally {
        setIsSubmitting(false);
      }
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
    <ScrollView className="flex-1 bg-background p-6" keyboardShouldPersistTaps="handled">
      <Text variant="h3" className="mb-6">
        Skapa jakt
      </Text>

      {/* Title */}
      <form.Field
        name="title"
        validators={{
          onSubmit: ({ value }) => (!value.trim() ? 'Titel krävs' : undefined),
        }}
      >
        {(field) => (
          <View className="mb-4">
            <Text className="mb-1 font-medium">Titel *</Text>
            <Input
              value={field.state.value}
              onChangeText={(val) => field.handleChange(val)}
              onBlur={() => field.handleBlur()}
              placeholder="Jaktens titel"
              autoFocus
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
          onSubmit: ({ value }) => (!value.trim() ? 'Startdatum krävs' : undefined),
        }}
      >
        {(field) => (
          <View className="mb-4">
            <Text className="mb-1 font-medium">Startdatum *</Text>
            <Input
              value={field.state.value}
              onChangeText={(val) => field.handleChange(val)}
              onBlur={() => field.handleBlur()}
              placeholder="ÅÅÅÅ-MM-DD"
            />
            {field.state.meta.errors.length > 0 && (
              <Text className="mt-1 text-sm text-destructive">
                {field.state.meta.errors[0]}
              </Text>
            )}
          </View>
        )}
      </form.Field>

      {/* End date */}
      <form.Field name="endDate">
        {(field) => (
          <View className="mb-4">
            <Text className="mb-1 font-medium">Slutdatum</Text>
            <Input
              value={field.state.value}
              onChangeText={(val) => field.handleChange(val)}
              onBlur={() => field.handleBlur()}
              placeholder="ÅÅÅÅ-MM-DD"
            />
          </View>
        )}
      </form.Field>

      {/* Join code */}
      <form.Field name="joinCode">
        {(field) => (
          <View className="mb-6">
            <Text className="mb-1 font-medium">Anslutningskod</Text>
            <Input
              value={field.state.value}
              onChangeText={(val) => field.handleChange(val.toLowerCase())}
              onBlur={() => field.handleBlur()}
              placeholder="Valfri kod för att gå med"
              autoCapitalize="none"
            />
          </View>
        )}
      </form.Field>

      {/* Friends list */}
      <Text className="mb-3 font-medium">Bjud in vänner</Text>
      {friends === undefined ? (
        <Text className="mb-4 text-muted-foreground">Laddar...</Text>
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
                    <View className={`h-6 w-6 items-center justify-center rounded ${isSelected ? 'bg-primary' : 'border border-muted-foreground/30'}`}>
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

      <Button
        onPress={() => form.handleSubmit()}
        className="mb-3"
        disabled={isSubmitting}
      >
        <Text>{isSubmitting ? 'Skapar...' : 'Skapa jakt'}</Text>
      </Button>

      <Button variant="outline" onPress={() => router.back()} disabled={isSubmitting}>
        <Text>Avbryt</Text>
      </Button>

      <View className="h-10" />
    </ScrollView>
  );
}
