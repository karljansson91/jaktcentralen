import { Text } from '@/components/ui';
import { APP_COLORS } from '@/lib/theme';
import type { LatLngPoint } from '@/lib/geo';
import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type HuntMapLongPressActionSheetProps = {
  canMeasureFromUser: boolean;
  coordinate: LatLngPoint | null;
  onAddMeasurementPoint: (coordinate: LatLngPoint) => void;
  onClose: () => void;
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
  onClose,
  onMarkAnimalSighting,
  onMeasureToPoint,
}: HuntMapLongPressActionSheetProps) {
  const insets = useSafeAreaInsets();
  const visible = coordinate !== null;

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible={visible}>
      <View style={styles.modalRoot}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Stäng kartåtgärder"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
        <View
          className="rounded-t-[30px] bg-background px-5 pt-4"
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 12 }]}>
          <View className="mb-4 h-1.5 w-12 self-center rounded-full bg-border" />
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
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    backgroundColor: 'rgba(49, 52, 68, 0.28)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    boxShadow: '0 -14px 34px rgba(49, 52, 68, 0.16)',
  },
});
