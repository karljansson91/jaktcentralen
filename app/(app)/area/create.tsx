import { LngLat, PolygonDrawer } from '@/components/PolygonDrawer';
import {
  clearAreaCreateDraft,
  getAreaCreateDraft,
  saveAreaCreateDraft,
} from '@/lib/area-create-draft-store';
import { Stack, useRouter } from 'expo-router';
import { useRef, useState } from 'react';

export default function CreateAreaScreen() {
  const { back, push } = useRouter();
  const draftIdRef = useRef<string | null>(null);
  const [polygonPoints, setPolygonPoints] = useState<LngLat[]>([]);

  const handlePolygonComplete = (points: LngLat[]) => {
    setPolygonPoints(points);
    const currentDraftId = draftIdRef.current ?? undefined;
    const currentDraft = currentDraftId ? getAreaCreateDraft(currentDraftId) : undefined;
    const draftId = saveAreaCreateDraft(
      {
        name: currentDraft?.name ?? '',
        polygon: points,
      },
      currentDraftId
    );
    draftIdRef.current = draftId;
    push(`/area/create-details?draftId=${draftId}`);
  };

  const handleCancel = () => {
    if (draftIdRef.current) {
      clearAreaCreateDraft(draftIdRef.current);
    }
    back();
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <PolygonDrawer
        initialPoints={polygonPoints.length >= 3 ? polygonPoints : undefined}
        onComplete={handlePolygonComplete}
        onCancel={handleCancel}
      />
    </>
  );
}
