import { AreaUnavailableState } from '@/components/area/area-unavailable-state';
import { LngLat, PolygonDrawer } from '@/components/PolygonDrawer';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useMutation, useQuery } from 'convex/react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, Alert, View } from 'react-native';

export default function RedrawAreaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { back } = useRouter();
  const area = useQuery(api.areas.get, { areaId: id as Id<'areas'> });
  const updateArea = useMutation(api.areas.update);

  const handleComplete = useCallback(
    async (points: LngLat[]) => {
      if (points.length < 3) {
        Alert.alert('Fel', 'Området måste ha minst 3 punkter');
        return;
      }

      try {
        await updateArea({
          areaId: id as Id<'areas'>,
          polygon: points.map(([longitude, latitude]) => ({ latitude, longitude })),
        });
        back();
      } catch (error: any) {
        Alert.alert('Fel', error.message ?? 'Kunde inte uppdatera området');
      }
    },
    [back, id, updateArea]
  );

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

  return (
    <PolygonDrawer
      initialPoints={area.polygon.map((point) => [
        point.longitude,
        point.latitude,
      ])}
      onComplete={handleComplete}
      onCancel={() => back()}
    />
  );
}
