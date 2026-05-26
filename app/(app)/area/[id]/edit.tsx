import { EditAreaForm } from '@/components/area/edit-area-form';
import { AreaUnavailableState } from '@/components/area/area-unavailable-state';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
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
    return <AreaUnavailableState message="Området kan ha tagits bort från startsidan." />;
  }

  return <EditAreaForm key={area._id} area={area} />;
}
