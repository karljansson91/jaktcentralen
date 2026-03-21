import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { api } from '@/convex/_generated/api';
import { useMutation } from 'convex/react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, ScrollView } from 'react-native';

export default function CreateHuntScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ area: string }>();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [joinCode, setJoinCode] = useState('');

  const createHunt = useMutation(api.hunts.create);

  const handleSubmit = useCallback(async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Title is required');
      return;
    }
    if (!startDate.trim()) {
      Alert.alert('Error', 'Start date is required');
      return;
    }

    const parsedStart = new Date(startDate.trim()).getTime();
    if (isNaN(parsedStart)) {
      Alert.alert('Error', 'Invalid start date format. Use YYYY-MM-DD');
      return;
    }

    let parsedEnd: number | undefined;
    if (endDate.trim()) {
      parsedEnd = new Date(endDate.trim()).getTime();
      if (isNaN(parsedEnd)) {
        Alert.alert('Error', 'Invalid end date format. Use YYYY-MM-DD');
        return;
      }
    }

    const polygonPoints: [number, number][] = params.area ? JSON.parse(params.area) : [];
    const area = polygonPoints.map(([lng, lat]) => ({
      latitude: lat,
      longitude: lng,
    }));

    try {
      await createHunt({
        title: title.trim(),
        description: description.trim() || undefined,
        area,
        startDate: parsedStart,
        endDate: parsedEnd,
        joinCode: joinCode.trim() || undefined,
      });
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to create hunt');
    }
  }, [title, description, startDate, endDate, joinCode, params.area, createHunt, router]);

  return (
    <ScrollView className="flex-1 bg-background p-6" keyboardShouldPersistTaps="handled">
      <Text variant="h3" className="mb-6">
        Create Hunt
      </Text>

      <Text className="mb-1 font-medium">Title *</Text>
      <Input
        value={title}
        onChangeText={setTitle}
        placeholder="Hunt title"
        className="mb-4"
      />

      <Text className="mb-1 font-medium">Description</Text>
      <Input
        value={description}
        onChangeText={setDescription}
        placeholder="Optional description"
        multiline
        numberOfLines={3}
        className="mb-4 h-20"
        textAlignVertical="top"
      />

      <Text className="mb-1 font-medium">Start Date *</Text>
      <Input
        value={startDate}
        onChangeText={setStartDate}
        placeholder="YYYY-MM-DD"
        className="mb-4"
      />

      <Text className="mb-1 font-medium">End Date</Text>
      <Input
        value={endDate}
        onChangeText={setEndDate}
        placeholder="YYYY-MM-DD"
        className="mb-4"
      />

      <Text className="mb-1 font-medium">Join Code</Text>
      <Input
        value={joinCode}
        onChangeText={(t) => setJoinCode(t.toLowerCase())}
        placeholder="Optional join code"
        autoCapitalize="none"
        className="mb-6"
      />

      <Button onPress={handleSubmit} className="mb-3">
        <Text>Create Hunt</Text>
      </Button>

      <Button variant="outline" onPress={() => router.back()}>
        <Text>Cancel</Text>
      </Button>
    </ScrollView>
  );
}
