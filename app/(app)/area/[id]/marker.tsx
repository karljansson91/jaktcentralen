import { Button, Input, Text } from '@/components/ui';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import {
  AREA_FEATURE_CATEGORY_LABELS,
  AREA_FEATURE_COLOR_PALETTE,
  AreaFeatureCategory,
  AreaFeatureGeometryType,
  AreaFeatureImage,
  LatLngPoint,
  getDefaultColorForCategory,
} from '@/lib/area-features';
import {
  clearAreaFeatureDraft,
  getAreaFeatureDraft,
  saveAreaFeatureDraft,
} from '@/lib/area-feature-draft-store';
import { Ionicons } from '@expo/vector-icons';
import { useForm } from '@tanstack/react-form';
import { useMutation } from 'convex/react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  View,
} from 'react-native';

const MAX_IMAGES = 5;

type MarkerFormValues = {
  name: string;
  description: string;
  category: AreaFeatureCategory;
  geometryType: AreaFeatureGeometryType;
  color: string;
  point?: LatLngPoint;
  polygon?: LatLngPoint[];
  images: AreaFeatureImage[];
};

function ChoiceChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-full border px-4 py-2 ${
        selected ? 'border-primary bg-primary/10' : 'border-border bg-background'
      }`}>
      <Text>{label}</Text>
    </Pressable>
  );
}

function ColorSwatch({
  color,
  selected,
  onPress,
}: {
  color: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`h-10 w-10 items-center justify-center rounded-full border ${
        selected ? 'border-foreground' : 'border-border'
      }`}
      style={{ backgroundColor: color }}>
      {selected && <Ionicons name="checkmark" size={18} color="white" />}
    </Pressable>
  );
}

function ImageGrid({
  images,
  onRemove,
}: {
  images: AreaFeatureImage[];
  onRemove: (fileId: Id<'_storage'>) => void;
}) {
  return (
    <>
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="font-medium">Bilder</Text>
        <Text className="text-sm text-muted-foreground">
          {images.length}/{MAX_IMAGES}
        </Text>
      </View>

      <View className="mb-4 flex-row flex-wrap gap-3">
        {images.map((image) => (
          <View key={image.fileId} className="relative">
            <Image source={{ uri: image.url }} className="h-24 w-24 rounded-xl bg-muted" />
            <Pressable
              onPress={() => onRemove(image.fileId)}
              className="absolute right-1 top-1 rounded-full bg-black/65 p-1">
              <Ionicons name="close" size={14} color="white" />
            </Pressable>
          </View>
        ))}
      </View>

      <View className="mb-4 rounded-xl border border-dashed border-border bg-card px-4 py-3">
        <Text className="text-sm text-muted-foreground">
          Bilduppladdning är tillfälligt avstängd medan markörflödet testas.
        </Text>
      </View>
    </>
  );
}

function getPlacementSummary(
  geometryType: AreaFeatureGeometryType,
  point?: LatLngPoint,
  polygon?: LatLngPoint[]
) {
  if (geometryType === 'point') {
    if (!point) {
      return 'Ingen punkt vald';
    }
    return `${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)}`;
  }

  return polygon ? `${polygon.length} polygonpunkter` : 'Ingen polygon vald';
}

function getGeometryButtonLabel(geometryType: AreaFeatureGeometryType) {
  return geometryType === 'point' ? 'Byt till område på kartan' : 'Redigera område';
}

function getPointFallback(point?: LatLngPoint, polygon?: LatLngPoint[]) {
  return point ?? polygon?.[0];
}

function getPolygonFallback(polygon?: LatLngPoint[], point?: LatLngPoint) {
  return polygon ?? (point ? [point] : undefined);
}

export default function MarkerFormScreen() {
  const { id, draftId } = useLocalSearchParams<{ id: string; draftId?: string }>();
  const router = useRouter();

  const saveFeature = useMutation(api.areaFeatures.save);
  const removeFeature = useMutation(api.areaFeatures.remove);

  const preserveDraftRef = useRef(false);
  const draft = draftId ? getAreaFeatureDraft(draftId) : undefined;

  useEffect(() => {
    return () => {
      if (draftId && !preserveDraftRef.current) {
        clearAreaFeatureDraft(draftId);
      }
    };
  }, [draftId]);

  const form = useForm({
    defaultValues: {
      name: draft?.name ?? '',
      description: draft?.description ?? '',
      category: draft?.category ?? 'tower',
      geometryType: draft?.geometryType ?? 'point',
      color: draft?.color ?? getDefaultColorForCategory(draft?.category ?? 'tower'),
      point: draft?.point,
      polygon: draft?.polygon,
      images: draft?.images ?? [],
    } satisfies MarkerFormValues,
    onSubmit: async ({ value }: { value: MarkerFormValues }) => {
      const name = value.name.trim();
      const description = value.description.trim();

      if (!name) {
        Alert.alert('Fel', 'Namn krävs');
        return;
      }

      try {
        await submitFeature(value, { name, description });
        completeAndClose();
      } catch (error: any) {
        Alert.alert('Fel', error.message ?? 'Kunde inte spara markör');
      }
    },
  });

  if (!draftId || !draft) {
    return (
      <View className="flex-1 items-center justify-center bg-background p-6">
        <Text className="mb-4">Markörutkastet kunde inte hittas.</Text>
        <Button variant="outline" onPress={() => router.back()}>
          <Text>Tillbaka</Text>
        </Button>
      </View>
    );
  }

  const activeDraft = draft;
  const activeDraftId = draftId;

  function persistDraft() {
    saveAreaFeatureDraft(
      {
        ...activeDraft,
        ...form.state.values,
      },
      activeDraftId
    );
  }

  function completeAndClose() {
    clearAreaFeatureDraft(activeDraftId);
    preserveDraftRef.current = true;
    router.back();
  }

  function discardAndClose() {
    clearAreaFeatureDraft(activeDraftId);
    preserveDraftRef.current = true;
    router.back();
  }

  async function submitFeature(
    values: MarkerFormValues,
    textValues: Pick<MarkerFormValues, 'name' | 'description'>
  ) {
    const selectedPoint = getPointFallback(values.point, values.polygon);
    const imageFileIds = values.images.map((image) => image.fileId);

    if (values.geometryType === 'point' && !selectedPoint) {
      throw new Error('Placera en punkt för markören.');
    }
    if (values.geometryType === 'polygon' && (!values.polygon || values.polygon.length < 3)) {
      throw new Error('Rita ett område med minst tre punkter.');
    }

    await saveFeature({
      name: textValues.name,
      description: textValues.description,
      category: values.category,
      color: values.color,
      geometryType: values.geometryType,
      imageFileIds,
      ...(activeDraft.mode === 'create' ? { areaId: id as Id<'areas'> } : {}),
      ...(activeDraft.mode === 'edit' && activeDraft.featureId
        ? { featureId: activeDraft.featureId }
        : {}),
      ...(activeDraft.mode === 'legacy' && activeDraft.legacyPointId
        ? { legacyPointId: activeDraft.legacyPointId }
        : {}),
      ...(values.geometryType === 'point' && selectedPoint ? { point: selectedPoint } : {}),
      ...(values.geometryType === 'polygon' && values.polygon ? { polygon: values.polygon } : {}),
    });
  }

  async function deleteFeatureByMode() {
    if (activeDraft.mode === 'create') {
      return;
    }

    await removeFeature(
      activeDraft.mode === 'edit' && activeDraft.featureId
        ? { featureId: activeDraft.featureId }
        : { legacyPointId: activeDraft.legacyPointId! }
    );
  }

  function handleCategoryChange(nextCategory: AreaFeatureCategory) {
    form.setFieldValue('category', nextCategory);
    form.setFieldValue('color', getDefaultColorForCategory(nextCategory));

    if (nextCategory !== 'custom') {
      form.setFieldValue('geometryType', 'point');
      form.setFieldValue('point', (current) =>
        getPointFallback(current, form.state.values.polygon)
      );
    }
  }

  function handleGeometryTypeChange(nextGeometryType: AreaFeatureGeometryType) {
    form.setFieldValue('geometryType', nextGeometryType);

    if (nextGeometryType === 'point') {
      form.setFieldValue('point', (current) =>
        getPointFallback(current, form.state.values.polygon)
      );
      return;
    }

    form.setFieldValue('polygon', (current) =>
      getPolygonFallback(current, form.state.values.point)
    );
  }

  async function handleDelete() {
    try {
      await deleteFeatureByMode();
      completeAndClose();
    } catch (error: any) {
      Alert.alert('Fel', error.message ?? 'Kunde inte ta bort markören');
    }
  }

  function confirmDelete() {
    Alert.alert('Ta bort markör', 'Vill du verkligen ta bort markören?', [
      { text: 'Avbryt', style: 'cancel' },
      { text: 'Ta bort', style: 'destructive', onPress: () => void handleDelete() },
    ]);
  }

  function openGeometryEditor() {
    preserveDraftRef.current = true;
    persistDraft();
    router.push(`/area/${id}/marker-geometry?draftId=${activeDraftId}`);
  }

  return (
    <form.Subscribe selector={(state) => ({ values: state.values, isSubmitting: state.isSubmitting })}>
      {({ values, isSubmitting }) => {
        const isCustomCategory = values.category === 'custom';
        const canDelete = activeDraft.mode !== 'create';
        const isBusy = isSubmitting;

        return (
          <ScrollView className="flex-1 bg-background p-6" keyboardShouldPersistTaps="handled">
            <Text variant="h3" className="mb-2">
              {activeDraft.mode === 'create' ? 'Ny markör' : 'Redigera markör'}
            </Text>
            <Text className="mb-6 text-muted-foreground">
              {values.geometryType === 'point'
                ? 'Punktmarkör på kartan'
                : `${values.polygon?.length ?? 0} punkter i markerat område`}
            </Text>

            <Text className="mb-2 font-medium">Typ</Text>
            <View className="mb-4 flex-row flex-wrap gap-2">
              {(Object.keys(AREA_FEATURE_CATEGORY_LABELS) as AreaFeatureCategory[]).map((option) => (
                <ChoiceChip
                  key={option}
                  label={AREA_FEATURE_CATEGORY_LABELS[option]}
                  selected={values.category === option}
                  onPress={() => handleCategoryChange(option)}
                />
              ))}
            </View>

            {isCustomCategory && (
              <>
                <Text className="mb-2 font-medium">Geometri</Text>
                <View className="mb-4 flex-row gap-2">
                  {(['point', 'polygon'] as const).map((option) => (
                    <ChoiceChip
                      key={option}
                      label={option === 'point' ? 'Punkt' : 'Område'}
                      selected={values.geometryType === option}
                      onPress={() => handleGeometryTypeChange(option)}
                    />
                  ))}
                </View>
              </>
            )}

            <Text className="mb-2 font-medium">Placering</Text>
            <View className="mb-4 rounded-xl border border-border bg-card px-4 py-3">
              <Text className="text-sm text-muted-foreground">
                {getPlacementSummary(values.geometryType, values.point, values.polygon)}
              </Text>
              {isCustomCategory && (
                <Button variant="outline" className="mt-3 self-start" onPress={openGeometryEditor}>
                  <Text>{getGeometryButtonLabel(values.geometryType)}</Text>
                </Button>
              )}
            </View>

            <form.Field
              name="name"
              validators={{
                onSubmit: ({ value }) => (!value.trim() ? 'Namn krävs' : undefined),
              }}>
              {(field) => (
                <View className="mb-4">
                  <Text className="mb-1 font-medium">Namn *</Text>
                  <Input
                    value={field.state.value}
                    onChangeText={(value) => field.handleChange(value)}
                    onBlur={() => field.handleBlur()}
                    placeholder="Namn på markören"
                    autoFocus
                  />
                  {field.state.meta.errors.length > 0 && (
                    <Text className="mt-1 text-sm text-destructive">{field.state.meta.errors[0]}</Text>
                  )}
                </View>
              )}
            </form.Field>

            <form.Field name="description">
              {(field) => (
                <View className="mb-4">
                  <Text className="mb-1 font-medium">Beskrivning</Text>
                  <Input
                    value={field.state.value}
                    onChangeText={(value) => field.handleChange(value)}
                    onBlur={() => field.handleBlur()}
                    placeholder="Valfri beskrivning"
                    multiline
                    numberOfLines={4}
                    className="h-24"
                    textAlignVertical="top"
                  />
                </View>
              )}
            </form.Field>

            <Text className="mb-2 font-medium">Färg</Text>
            <View className="mb-6 flex-row flex-wrap gap-3">
              {AREA_FEATURE_COLOR_PALETTE.map((option) => (
                <ColorSwatch
                  key={option}
                  color={option}
                  selected={values.color === option}
                  onPress={() => form.setFieldValue('color', option)}
                />
              ))}
            </View>

            <ImageGrid
              images={values.images}
              onRemove={(fileId) =>
                form.setFieldValue('images', (current) =>
                  current.filter((image) => image.fileId !== fileId)
                )
              }
            />

            <Button className="mb-3" onPress={() => form.handleSubmit()} disabled={isBusy}>
              <Text>{isSubmitting ? 'Sparar...' : 'Spara markör'}</Text>
            </Button>

            {canDelete && (
              <Button
                variant="destructive"
                className="mb-3"
                onPress={confirmDelete}
                disabled={isBusy}>
                <Text>Ta bort markör</Text>
              </Button>
            )}

            <Button variant="outline" onPress={discardAndClose} disabled={isBusy}>
              <Text>Avbryt</Text>
            </Button>

            <View className="h-10" />
          </ScrollView>
        );
      }}
    </form.Subscribe>
  );
}
