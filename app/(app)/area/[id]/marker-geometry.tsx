import { Text } from '@/components/ui';
import { LngLat, PolygonDrawer } from '@/components/PolygonDrawer';
import { PointPlacementDrawer } from '@/components/PointPlacementDrawer';
import { getAreaFeatureDraft, saveAreaFeatureDraft } from '@/lib/area-feature-draft-store';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';

export default function MarkerGeometryScreen() {
  const { draftId } = useLocalSearchParams<{ id: string; draftId?: string }>();
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
  const initialPoint: LngLat | undefined = draft.point
    ? [draft.point.longitude, draft.point.latitude]
    : initialPoints?.[0];

  if (draft.geometryType === 'point') {
    return (
      <PointPlacementDrawer
        initialPoint={initialPoint}
        onComplete={([longitude, latitude]) => {
          saveAreaFeatureDraft(
            {
              ...draft,
              hasUnsavedChanges: true,
              geometryType: 'point',
              point: { latitude, longitude },
              polygon: undefined,
            },
            draftId
          );
          router.back();
        }}
        onCancel={() => router.back()}
      />
    );
  }

  return (
    <PolygonDrawer
      initialPoints={initialPoints}
      onComplete={(points) => {
        saveAreaFeatureDraft(
          {
            ...draft,
            hasUnsavedChanges: true,
            geometryType: 'polygon',
            category: 'custom',
            polygon: points.map(([longitude, latitude]) => ({ latitude, longitude })),
          },
          draftId
        );
        router.back();
      }}
      onCancel={() => router.back()}
    />
  );
}
