import { Button, Input, Text } from '@/components/ui';
import {
  CATEGORY_ICONS,
  ChoiceChip,
  ColorSwatch,
  ImageGrid,
  MAX_MARKER_IMAGES,
} from '@/components/area/marker-form-controls';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import {
  AREA_FEATURE_CATEGORY_LABELS,
  AREA_FEATURE_COLOR_PALETTE,
  AreaFeatureCategory,
  AreaFeatureDraft,
  AreaFeatureGeometryType,
  AreaFeatureImage,
  getDefaultColorForCategory,
} from '@/lib/area-features';
import {
  clearAreaFeatureDraft,
  getAreaFeatureDraft,
} from '@/lib/area-feature-draft-store';
import {
  MarkerFormValues,
  buildMarkerFormValues,
  getPlacementSummary,
  getPointFallback,
  getPolygonFallback,
  hasMarkerFormChanges,
} from '@/lib/area-marker-form';
import { APP_COLORS } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { useForm } from '@tanstack/react-form';
import { useMutation } from 'convex/react';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function MarkerFormScreen() {
  const { id, draftId } = useLocalSearchParams<{ id: string; draftId?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const saveFeature = useMutation(api.areaFeatures.save);
  const removeFeature = useMutation(api.areaFeatures.remove);
  const generateUploadUrl = useMutation(api.areaFeatures.generateUploadUrl);
  const [isUploadingImages, setIsUploadingImages] = useState(false);

  const preserveDraftRef = useRef(false);
  const [draft, setDraft] = useState<AreaFeatureDraft | undefined>(() =>
    draftId ? getAreaFeatureDraft(draftId) : undefined
  );
  const initialFormValues = useMemo(() => buildMarkerFormValues(draft), [draft]);

  useEffect(() => {
    return () => {
      if (draftId && !preserveDraftRef.current) {
        clearAreaFeatureDraft(draftId);
      }
    };
  }, [draftId]);

  const form = useForm({
    defaultValues: initialFormValues,
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
  const formRef = useRef(form);

  useEffect(() => {
    formRef.current = form;
  }, [form]);

  useFocusEffect(
    useCallback(() => {
      if (!draftId) {
        return;
      }

      const nextDraft = getAreaFeatureDraft(draftId);
      if (!nextDraft) {
        return;
      }

      const nextValues = buildMarkerFormValues(nextDraft);
      const activeForm = formRef.current;

      activeForm.setFieldValue('name', nextValues.name);
      activeForm.setFieldValue('description', nextValues.description);
      activeForm.setFieldValue('category', nextValues.category);
      activeForm.setFieldValue('geometryType', nextValues.geometryType);
      activeForm.setFieldValue('color', nextValues.color);
      activeForm.setFieldValue('point', nextValues.point);
      activeForm.setFieldValue('polygon', nextValues.polygon);
      activeForm.setFieldValue('images', nextValues.images);
      setDraft(nextDraft);
    }, [draftId])
  );

  if (!draftId || !draft) {
    return (
      <View className="flex-1 items-center justify-center bg-background p-6">
        <Stack.Screen
          options={{
            contentStyle: { backgroundColor: APP_COLORS.background },
            headerBackVisible: false,
            headerLeft: () => null,
            headerRight: () => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Stäng"
                hitSlop={12}
                onPress={() => router.back()}>
                <Ionicons name="close" size={24} color={APP_COLORS.text} />
              </Pressable>
            ),
            headerShadowVisible: false,
            headerShown: true,
            headerStyle: { backgroundColor: APP_COLORS.background },
            headerTitleAlign: 'center',
            title: 'Markör',
          }}
        />
        <Text className="mb-4">Markörutkastet kunde inte hittas.</Text>
      </View>
    );
  }

  const activeDraft = draft;
  const activeDraftId = draftId;

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

  async function uploadImage(asset: ImagePicker.ImagePickerAsset) {
    const uploadUrl = await generateUploadUrl();
    const imageResponse = await fetch(asset.uri);
    const blob = await imageResponse.blob();
    const uploadResponse = await fetch(uploadUrl, {
      body: blob,
      headers: { 'Content-Type': asset.mimeType ?? 'image/jpeg' },
      method: 'POST',
    });

    if (!uploadResponse.ok) {
      throw new Error('Kunde inte ladda upp bilden.');
    }

    const { storageId } = (await uploadResponse.json()) as { storageId: Id<'_storage'> };
    return {
      fileId: storageId,
      url: asset.uri,
    } satisfies AreaFeatureImage;
  }

  async function handleAddImages() {
    const currentImages = form.state.values.images;
    const remainingSlots = MAX_MARKER_IMAGES - currentImages.length;

    if (remainingSlots <= 0) {
      Alert.alert('Max antal bilder', `Du kan lägga till max ${MAX_MARKER_IMAGES} bilder.`);
      return;
    }

    setIsUploadingImages(true);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Behörighet krävs', 'Ge appen åtkomst till bilder för att ladda upp.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsMultipleSelection: remainingSlots > 1,
        mediaTypes: ['images'],
        quality: 0.78,
        selectionLimit: remainingSlots,
      });

      if (result.canceled) {
        return;
      }

      const uploadedImages = await Promise.all(
        result.assets.slice(0, remainingSlots).map((asset) => uploadImage(asset))
      );

      form.setFieldValue('images', (images) =>
        [...images, ...uploadedImages].slice(0, MAX_MARKER_IMAGES)
      );
    } catch (error) {
      Alert.alert(
        'Kunde inte lägga till bild',
        error instanceof Error ? error.message : 'Försök igen om en stund.'
      );
    } finally {
      setIsUploadingImages(false);
    }
  }

  return (
    <form.Subscribe selector={(state) => ({ values: state.values, isSubmitting: state.isSubmitting })}>
      {({ values, isSubmitting }) => {
        const isCustomCategory = values.category === 'custom';
        const canDelete = activeDraft.mode !== 'create';
        const hasChanges =
          Boolean(activeDraft.hasUnsavedChanges) ||
          hasMarkerFormChanges(values, initialFormValues);
        const isBusy = isSubmitting || isUploadingImages;

        const screenTitle = activeDraft.mode === 'create' ? 'Ny markör' : 'Redigera markör';

        return (
          <View className="flex-1 bg-background">
            <Stack.Screen
              options={{
                contentStyle: { backgroundColor: APP_COLORS.background },
                headerBackVisible: false,
                headerLeft: () => null,
                headerRight: () => (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Stäng"
                    hitSlop={12}
                    onPress={discardAndClose}>
                    <Ionicons name="close" size={24} color={APP_COLORS.text} />
                  </Pressable>
                ),
                headerShadowVisible: false,
                headerShown: true,
                headerStyle: { backgroundColor: APP_COLORS.background },
                headerTitleAlign: 'center',
                title: screenTitle,
              }}
            />

            <ScrollView
              className="flex-1 bg-background"
              contentContainerStyle={{
                paddingBottom: Math.max(insets.bottom, 24) + 16,
                paddingHorizontal: 24,
                paddingTop: 24,
              }}
              keyboardShouldPersistTaps="handled">
              <Text className="mb-2 font-medium">Typ</Text>
              <View className="mb-5 flex-row flex-wrap justify-between gap-y-3">
                {(Object.keys(AREA_FEATURE_CATEGORY_LABELS) as AreaFeatureCategory[]).map(
                  (option) => (
                    <ChoiceChip
                      key={option}
                      label={AREA_FEATURE_CATEGORY_LABELS[option]}
                      icon={CATEGORY_ICONS[option]}
                      selected={values.category === option}
                      onPress={() => handleCategoryChange(option)}
                    />
                  )
                )}
              </View>

              {isCustomCategory && (
                <>
                  <Text className="mb-2 font-medium">Geometri</Text>
                  <View className="mb-5 flex-row flex-wrap justify-between gap-y-3">
                    {(['point', 'polygon'] as const).map((option) => (
                      <ChoiceChip
                        key={option}
                        label={option === 'point' ? 'Punkt' : 'Område'}
                        icon={option === 'point' ? 'location-outline' : 'scan-outline'}
                        selected={values.geometryType === option}
                        onPress={() => handleGeometryTypeChange(option)}
                      />
                    ))}
                  </View>
                </>
              )}

              <Text className="mb-2 font-medium">Placering</Text>
              <View className="mb-5 rounded-2xl border border-border bg-card px-4 py-3">
                <View className="min-w-0 flex-1">
                  <Text className="text-sm text-muted-foreground">
                    {getPlacementSummary(values.geometryType, values.point, values.polygon)}
                  </Text>
                </View>
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
                    />
                    {field.state.meta.errors.length > 0 && (
                      <Text className="mt-1 text-sm text-destructive">
                        {field.state.meta.errors[0]}
                      </Text>
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
                isUploading={isUploadingImages}
                onAdd={() => void handleAddImages()}
                onRemove={(fileId) =>
                  form.setFieldValue('images', (current) =>
                    current.filter((image) => image.fileId !== fileId)
                  )
                }
              />

              <Button
                size="xl"
                className="mb-3 rounded-2xl"
                onPress={() => form.handleSubmit()}
                disabled={isBusy || !hasChanges}>
                <Text>{isSubmitting ? 'Sparar...' : 'Spara markör'}</Text>
              </Button>

              {canDelete && (
                <Button
                  variant="destructive"
                  size="xl"
                  className="mb-3 rounded-2xl"
                  onPress={confirmDelete}
                  disabled={isBusy}>
                  <Text>Ta bort markör</Text>
                </Button>
              )}

              <View className="h-10" />
            </ScrollView>
          </View>
        );
      }}
    </form.Subscribe>
  );
}
