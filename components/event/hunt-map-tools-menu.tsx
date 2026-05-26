import { GlassSurface } from '@/components/glass/glass-surface';
import { Text } from '@/components/ui';
import { APP_COLORS } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type HuntMapToolsMenuProps = {
  inPosition: {
    available: boolean;
    marked: boolean;
    onClear: () => void;
    onMark: () => void;
  };
  onLocate: () => void;
  positions: {
    onToggleOthers: () => void;
    onToggleOwnSharing: () => void;
    ownSharingEnabled: boolean;
    showOthers: boolean;
  };
  route: {
    available: boolean;
    onToggle: () => void;
    visible: boolean;
  };
  scent: {
    hasDirection: boolean;
    isSetting: boolean;
    onClear: () => void;
    onSet: () => void;
  };
};

type HuntMapToolAction = {
  checked?: boolean;
  hidden?: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  id: string;
  onPress: () => void;
  title: string;
};

export function HuntMapToolsMenu({
  inPosition,
  onLocate,
  positions,
  route,
  scent,
}: HuntMapToolsMenuProps) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);

  const actions = useMemo<HuntMapToolAction[]>(
    () => [
      {
        hidden: !inPosition.available,
        icon: inPosition.marked ? 'close-circle-outline' : 'checkmark-circle-outline',
        id: inPosition.marked ? 'clear-in-position' : 'mark-in-position',
        onPress: inPosition.marked ? inPosition.onClear : inPosition.onMark,
        title: inPosition.marked ? 'Ta bort på plats' : 'Markera mig på plats',
      },
      {
        checked: positions.ownSharingEnabled,
        icon: positions.ownSharingEnabled ? 'navigate' : 'navigate-outline',
        id: 'toggle-own-sharing',
        onPress: positions.onToggleOwnSharing,
        title: 'Dela min position',
      },
      {
        checked: positions.showOthers,
        icon: 'people-outline',
        id: 'toggle-other-positions',
        onPress: positions.onToggleOthers,
        title: 'Visa andras positioner',
      },
      {
        checked: scent.isSetting || scent.hasDirection,
        icon: 'swap-vertical-outline',
        id: 'set-scent-direction',
        onPress: scent.onSet,
        title: scent.hasDirection ? 'Ändra vindriktning' : 'Sätt vindriktning',
      },
      {
        hidden: !scent.hasDirection,
        icon: 'close-circle-outline',
        id: 'clear-scent-direction',
        onPress: scent.onClear,
        title: 'Rensa vindriktning',
      },
      {
        checked: route.visible,
        hidden: !route.available,
        icon: 'git-branch-outline',
        id: 'toggle-route',
        onPress: route.onToggle,
        title: 'Visa väg till pass',
      },
      {
        icon: 'locate-outline',
        id: 'locate',
        onPress: onLocate,
        title: 'Centrera på mig',
      },
    ],
    [inPosition, onLocate, positions, route, scent]
  );

  function handleActionPress(action: HuntMapToolAction) {
    setOpen(false);
    requestAnimationFrame(action.onPress);
  }

  return (
    <>
      <Pressable
        accessibilityLabel="Kartverktyg"
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(true)}>
        <GlassSurface
          interactive
          tone="dark"
          className="size-14 rounded-full"
          contentClassName="h-full w-full items-center justify-center">
          <Ionicons name="map-outline" size={24} color={APP_COLORS.surface} />
        </GlassSurface>
      </Pressable>

      <Modal
        animationType="fade"
        onRequestClose={() => setOpen(false)}
        transparent
        visible={open}>
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <Pressable
            accessibilityLabel="Stäng kartverktyg"
            style={StyleSheet.absoluteFill}
            onPress={() => setOpen(false)}
          />
          <GlassSurface
            tone="light"
            className="rounded-[34px]"
            contentClassName="py-4"
            style={[
              styles.menu,
              {
                bottom: Math.max(insets.bottom, 20) + 88,
              },
            ]}>
            <Text className="px-6 pb-3 text-[17px] font-semibold text-muted-foreground">
              Kartverktyg
            </Text>
            <View className="gap-1">
              {actions.map((action) =>
                action.hidden ? null : (
                  <Pressable
                    key={action.id}
                    accessibilityRole="menuitem"
                    onPress={() => handleActionPress(action)}
                    className="min-h-[52px] flex-row items-center px-5">
                    <View className="w-11 items-center">
                      <Ionicons name={action.icon} size={27} color={APP_COLORS.text} />
                    </View>
                    <Text className="min-w-0 flex-1 text-[22px] leading-[28px] text-foreground">
                      {action.title}
                    </Text>
                    <View className="w-9 items-end">
                      {action.checked ? (
                        <Ionicons name="checkmark" size={25} color={APP_COLORS.text} />
                      ) : null}
                    </View>
                  </Pressable>
                )
              )}
            </View>
          </GlassSurface>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  menu: {
    boxShadow: '0 16px 24px rgba(31, 42, 36, 0.16)',
    left: 24,
    overflow: 'hidden',
    position: 'absolute',
    width: 304,
  },
});
