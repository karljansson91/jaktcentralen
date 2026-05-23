import { Button, Text } from "@/components/ui";
import { Id } from "@/convex/_generated/dataModel";
import { AreaFeatureCategory, AreaFeatureImage } from "@/lib/area-features";
import { APP_COLORS } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { Image, Pressable, View } from "react-native";

export const MAX_MARKER_IMAGES = 5;

export const CATEGORY_ICONS: Record<
  AreaFeatureCategory,
  keyof typeof Ionicons.glyphMap
> = {
  tower: "trail-sign-outline",
  parking: "car-outline",
  meeting: "people-outline",
  custom: "sparkles-outline",
};

export function ChoiceChip({
  label,
  selected,
  onPress,
  icon,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`relative min-h-12 items-center justify-center rounded-2xl border px-3 py-3 ${
        selected ? "border-primary bg-primary" : "border-border bg-card"
      }`}
      style={{ width: "48%" }}
    >
      {icon ? (
        <View className="absolute left-3">
          <Ionicons
            name={icon}
            size={17}
            color={selected ? "#ffffff" : APP_COLORS.textMuted}
          />
        </View>
      ) : null}
      <Text
        className={`w-full px-5 text-center text-sm font-semibold ${
          selected ? "text-primary-foreground" : "text-foreground"
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function ColorSwatch({
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
      className={`h-11 w-11 items-center justify-center rounded-full border-2 ${
        selected ? "border-foreground bg-card" : "border-transparent"
      }`}
      style={{ boxShadow: selected ? "0 5px 12px rgba(49, 52, 68, 0.12)" : undefined }}
    >
      <View
        className="h-9 w-9 items-center justify-center rounded-full"
        style={{ backgroundColor: color }}
      >
        {selected && <Ionicons name="checkmark" size={18} color="white" />}
      </View>
    </Pressable>
  );
}

export function ImageGrid({
  images,
  isUploading,
  onAdd,
  onRemove,
}: {
  images: AreaFeatureImage[];
  isUploading: boolean;
  onAdd: () => void;
  onRemove: (fileId: Id<"_storage">) => void;
}) {
  const canAdd = images.length < MAX_MARKER_IMAGES;

  return (
    <>
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="font-medium">Bilder</Text>
        <Text className="text-sm text-muted-foreground">
          {images.length}/{MAX_MARKER_IMAGES}
        </Text>
      </View>

      <View className="mb-4 flex-row flex-wrap gap-3">
        {images.map((image) => (
          <View key={image.fileId} className="relative">
            <Image source={{ uri: image.url }} className="h-24 w-24 rounded-xl bg-muted" />
            <Pressable
              onPress={() => onRemove(image.fileId)}
              className="absolute right-1 top-1 rounded-full bg-black/65 p-1"
            >
              <Ionicons name="close" size={14} color="white" />
            </Pressable>
          </View>
        ))}
      </View>

      {canAdd ? (
        <Button
          variant="outline"
          onPress={onAdd}
          disabled={isUploading}
          size="xl"
          className="mb-4 rounded-2xl border-dashed bg-card"
        >
          <Ionicons name="image-outline" size={18} color="#35523b" />
          <Text>{isUploading ? "Laddar upp..." : "Lägg till bild"}</Text>
        </Button>
      ) : null}
    </>
  );
}
