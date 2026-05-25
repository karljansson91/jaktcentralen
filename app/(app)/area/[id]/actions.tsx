import { Button, ButtonProps, Text } from '@/components/ui';
import { DEFAULT_MAP_STYLE, getSavedMapStyle } from '@/lib/map-styles';
import { showMapStylePicker } from '@/lib/map-style-picker';
import { APP_COLORS } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { Href, Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function ActionIcon({ name, color }: { name: keyof typeof Ionicons.glyphMap; color: string }) {
  return <Ionicons name={name} size={20} color={color} />;
}

type AreaActionButtonProps = Pick<ButtonProps, 'variant' | 'onPress' | 'accessibilityLabel'> & {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  label: string;
};

function AreaActionButton({
  variant,
  onPress,
  accessibilityLabel,
  icon,
  iconColor,
  label,
}: AreaActionButtonProps) {
  return (
    <Button
      variant={variant}
      size="xl"
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      className="h-auto min-h-12 rounded-xl px-4 py-3"
      style={{ height: 'auto', minHeight: 48 }}>
      <ActionIcon name={icon} color={iconColor} />
      <Text className="flex-1 text-center text-base leading-5" numberOfLines={2}>
        {label}
      </Text>
      <View style={{ width: 20 }} />
    </Button>
  );
}

export default function AreaActionsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { back, push } = useRouter();
  const insets = useSafeAreaInsets();
  const selectedMapStyleIdRef = useRef(DEFAULT_MAP_STYLE.id);

  useEffect(() => {
    let cancelled = false;

    void getSavedMapStyle().then((style) => {
      if (!cancelled) {
        selectedMapStyleIdRef.current = style.id;
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  function closeAndNavigate(path: Href) {
    back();
    setTimeout(() => push(path), 100);
  }

  const handleSelectMapStyle = useCallback(() => {
    showMapStylePicker({
      message: 'Gäller både områden och jakter.',
      onSelect: (savedStyle) => {
        selectedMapStyleIdRef.current = savedStyle.id;
      },
      selectedMapStyleId: selectedMapStyleIdRef.current,
    });
  }, []);

  return (
    <View
      className="flex-1 items-center bg-background"
      style={{
        backgroundColor: APP_COLORS.background,
        paddingBottom: Math.max(insets.bottom, 24),
        paddingHorizontal: 20,
        paddingTop: 20,
      }}>
      <Stack.Screen
        options={{
          contentStyle: { backgroundColor: APP_COLORS.background },
          sheetAllowedDetents: 'fitToContents',
        }}
      />

      <View className="w-full max-w-[560px] gap-3">
        <AreaActionButton
          onPress={() => closeAndNavigate(`/area/${id}/event/create`)}
          accessibilityLabel="Skapa jakt"
          icon="trail-sign-outline"
          iconColor={APP_COLORS.surface}
          label="Skapa jakt"
        />

        <AreaActionButton
          variant="outline"
          onPress={() => closeAndNavigate(`/area/${id}/redraw` as Href)}
          accessibilityLabel="Rita om area"
          icon="shapes-outline"
          iconColor={APP_COLORS.text}
          label="Rita om area"
        />

        <AreaActionButton
          variant="outline"
          onPress={() => closeAndNavigate(`/area/${id}/edit`)}
          accessibilityLabel="Uppdatera info"
          icon="settings-outline"
          iconColor={APP_COLORS.text}
          label="Uppdatera info"
        />

        <AreaActionButton
          variant="outline"
          onPress={handleSelectMapStyle}
          accessibilityLabel="Ändra kartvy"
          icon="map-outline"
          iconColor={APP_COLORS.text}
          label="Ändra kartvy"
        />
      </View>
    </View>
  );
}
