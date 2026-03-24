import { Text } from '@/components/ui';
import { LngLat, PolygonDrawer } from '@/components/PolygonDrawer';
import { getAreaFeatureDraft, saveAreaFeatureDraft } from '@/lib/area-feature-draft-store';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';

export default function MarkerGeometryScreen() {
  const { id, draftId } = useLocalSearchParams<{ id: string; draftId?: string }>();
  const router = useRouter();

  if (!draftId) {
    return (
      <View className="flex-1 items-center justify-center bg-background p-6">
        <Text>Saknar arbetsutkast för markören.</Text>
      </View>
    );
  }

  const draft = getAreaFeatureDraft(draftId);

  if (!draft) {
    return (
      <View className="flex-1 items-center justify-center bg-background p-6">
        <Text>Markörutkastet kunde inte hittas.</Text>
      </View>
    );
  }

  const initialPoints: LngLat[] | undefined = draft.polygon?.map((point) => [
    point.longitude,
    point.latitude,
  ]);

  return (
    <PolygonDrawer
      initialPoints={initialPoints}
      onComplete={(points) => {
        saveAreaFeatureDraft(
          {
            ...draft,
            geometryType: 'polygon',
            category: 'custom',
            polygon: points.map(([longitude, latitude]) => ({ latitude, longitude })),
          },
          draftId
        );
        router.replace(`/area/${id}/marker?draftId=${draftId}`);
      }}
      onCancel={() => router.back()}
    />
  );
}
