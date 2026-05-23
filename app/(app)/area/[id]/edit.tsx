import { EditAreaForm } from '@/components/area/edit-area-form';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { Text } from '@/components/ui';
import { useQuery } from 'convex/react';
import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

export default function EditAreaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const area = useQuery(api.areas.get, { areaId: id as Id<'areas'> });

  if (area === undefined) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="small" color="#2c4b31" />
      </View>
    );
  }

  if (area === null) {
    return (
      <View className="flex-1 items-center justify-center bg-background p-6">
        <Text>Området hittades inte.</Text>
      </View>
    );
  }

  return <EditAreaForm key={area._id} area={area} />;
}
