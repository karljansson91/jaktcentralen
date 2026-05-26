import { Text } from '@/components/ui';
import type { AnimalSightingMapItem } from '@/lib/animal-sightings';
import { formatAnimalSightingMapLabel } from '@/lib/animal-sightings';
import { APP_COLORS } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type AnimalSightingActionSheetProps = {
  currentTime: number;
  onClose: () => void;
  onHide: (sighting: AnimalSightingMapItem) => Promise<void>;
  sighting: AnimalSightingMapItem | null;
};

export function AnimalSightingActionSheet({
  currentTime,
  onClose,
  onHide,
  sighting,
}: AnimalSightingActionSheetProps) {
  const insets = useSafeAreaInsets();
  const [isHiding, setIsHiding] = useState(false);
  const visible = sighting !== null;
  const label = sighting ? formatAnimalSightingMapLabel(sighting, currentTime) : '';
  const reporter = sighting?.user?.name?.trim() || 'Okänd jägare';

  async function handleHide() {
    if (!sighting || isHiding) {
      return;
    }

    setIsHiding(true);
    try {
      await onHide(sighting);
    } finally {
      setIsHiding(false);
    }
  }

  return (
    <Modal
      animationType="slide"
      onRequestClose={isHiding ? undefined : onClose}
      transparent
      visible={visible}>
      <View style={styles.modalRoot}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Stäng observation"
          disabled={isHiding}
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
        <View
          className="rounded-t-[30px] bg-background px-5 pt-4"
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 12 }]}>
          <View className="mb-4 h-1.5 w-12 self-center rounded-full bg-border" />
          <View className="gap-1">
            <Text variant="h3" numberOfLines={1}>
              {label || 'Observation'}
            </Text>
            <Text className="text-sm text-muted-foreground" numberOfLines={2}>
              {reporter} markerade observationen på kartan.
            </Text>
          </View>

          {sighting ? (
            <View className="mt-5">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Dölj observationen på kartan"
                disabled={isHiding}
                onPress={() => {
                  void handleHide();
                }}
                className="min-h-[60px] flex-row items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 active:bg-accent"
                style={{ opacity: isHiding ? 0.7 : 1 }}>
                <View className="size-10 items-center justify-center rounded-full bg-primary/10">
                  <Ionicons name="eye-off-outline" size={20} color={APP_COLORS.primary} />
                </View>
                <View className="min-w-0 flex-1">
                  <Text className="text-base font-semibold">Dölj på kartan</Text>
                  <Text className="text-sm text-muted-foreground">
                    Döljer bara för dig i den live-kartan.
                  </Text>
                </View>
                {isHiding ? (
                  <ActivityIndicator size="small" color={APP_COLORS.primary} />
                ) : (
                  <Ionicons name="chevron-forward" size={18} color={APP_COLORS.textMuted} />
                )}
              </Pressable>
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
