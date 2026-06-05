import { Button, Text } from '@/components/ui';
import { Id } from '@/convex/_generated/dataModel';
import { AreaFeatureImage } from '@/lib/area-features';
import { APP_COLORS } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, View } from 'react-native';
import { MAX_MARKER_IMAGES } from './marker-form-constants';

type ImageGridProps = {
  images: AreaFeatureImage[];
  isUploading: boolean;
  onAdd: () => void;
  onRemove: (fileId: Id<'_storage'>) => void;
};

export function ImageGrid({ images, isUploading, onAdd, onRemove }: ImageGridProps) {
  const canAdd = images.length < MAX_MARKER_IMAGES;
  const [primaryImage, ...secondaryImages] = images;

  return (
    <>
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="font-medium">Bilder</Text>
        <Text className="text-sm text-muted-foreground">
          {images.length}/{MAX_MARKER_IMAGES}
        </Text>
      </View>

      {primaryImage ? (
        <View className="relative mb-3 overflow-hidden rounded-2xl bg-muted">
          <Image
            source={{ uri: primaryImage.url }}
            contentFit="cover"
            style={{
              aspectRatio: 4 / 3,
              backgroundColor: APP_COLORS.border,
              width: '100%',
            }}
          />
          <Pressable
            onPress={() => onRemove(primaryImage.fileId)}
            className="absolute right-2 top-2 rounded-full bg-black/65 p-1.5">
            <Ionicons name="close" size={16} color="white" />
          </Pressable>
        </View>
      ) : null}

      {secondaryImages.length > 0 ? (
        <View className="mb-4 flex-row flex-wrap gap-3">
          {secondaryImages.map((image) => (
            <View key={image.fileId} className="relative size-24">
              <Image
                source={{ uri: image.url }}
                contentFit="cover"
                style={{
                  backgroundColor: APP_COLORS.border,
                  borderRadius: 12,
                  height: 96,
                  width: 96,
                }}
              />
              <Pressable
                onPress={() => onRemove(image.fileId)}
                className="absolute right-1 top-1 rounded-full bg-black/65 p-1">
                <Ionicons name="close" size={14} color="white" />
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      {canAdd ? (
        <Button
          variant="outline"
          onPress={onAdd}
          disabled={isUploading}
          size="xl"
          className="mb-4 rounded-2xl border-dashed bg-card">
          <Ionicons name="image-outline" size={18} color="#35523b" />
          <Text>{isUploading ? 'Laddar upp…' : 'Lägg till bild'}</Text>
        </Button>
      ) : null}
    </>
  );
}
