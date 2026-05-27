import { Text } from '@/components/ui';
import { APP_COLORS } from '@/lib/theme';
import type { LatLngPoint } from '@/lib/geo';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type HuntMapLongPressActionSheetProps = {
  canMeasureFromUser: boolean;
  coordinate: LatLngPoint | null;
  onAddMeasurementPoint: (coordinate: LatLngPoint) => void;
  onMarkAnimalSighting: (coordinate: LatLngPoint) => void;
  onMeasureToPoint: (coordinate: LatLngPoint) => void;
};

type ActionRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  subtitle: string;
};

function ActionRow({ icon, label, onPress, subtitle }: ActionRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="min-h-[64px] flex-row items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 active:bg-accent">
      <View className="size-10 items-center justify-center rounded-full bg-primary/10">
        <Ionicons name={icon} size={20} color={APP_COLORS.primary} />
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-base font-semibold" numberOfLines={1}>
          {label}
        </Text>
        <Text className="text-sm text-muted-foreground" numberOfLines={2}>
          {subtitle}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={APP_COLORS.textMuted} />
    </Pressable>
  );
}

export function HuntMapLongPressActionSheet({
  canMeasureFromUser,
  coordinate,
  onAddMeasurementPoint,
  onMarkAnimalSighting,
  onMeasureToPoint,
}: HuntMapLongPressActionSheetProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-1 bg-background px-5 pt-3"
      style={{ paddingBottom: Math.max(insets.bottom, 16) + 12 }}>
      <View className="gap-1">
        <Text variant="h3">Kartpunkt</Text>
        <Text className="text-sm text-muted-foreground">
          Välj vad du vill göra vid den markerade platsen.
        </Text>
      </View>

      {coordinate ? (
        <View className="mt-5 gap-3">
          <ActionRow
            icon="navigate-outline"
            label="Mät avstånd hit"
            subtitle={
              canMeasureFromUser
                ? 'Från din aktuella position till punkten.'
                : 'Plats saknas'
            }
            onPress={() => onMeasureToPoint(coordinate)}
          />
          <ActionRow
            icon="add-circle-outline"
            label="Lägg till mätpunkt"
            subtitle="Bygg en lokal mätsträcka med flera punkter."
            onPress={() => onAddMeasurementPoint(coordinate)}
          />
          <ActionRow
            icon="eye-outline"
            label="Markera observation"
            subtitle="Välj djur och skicka observationen till jakten."
            onPress={() => onMarkAnimalSighting(coordinate)}
          />
        </View>
      ) : (
        <View className="mt-8 items-center justify-center rounded-2xl border border-border bg-card p-5">
          <ActivityIndicator size="small" color={APP_COLORS.primary} />
          <Text className="mt-3 text-sm text-muted-foreground">Kartpunkten saknas</Text>
        </View>
      )}
    </View>
  );
}
