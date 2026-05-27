import { Text } from '@/components/ui';
import {
  getCachedMapStyle,
  getSavedMapStyle,
  MAP_STYLE_OPTIONS,
  saveMapStyle,
  subscribeToMapStyleChanges,
} from '@/lib/map-styles';
import { APP_COLORS } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function MapStyleScreen() {
  const { back } = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedStyleId, setSelectedStyleId] = useState(() => getCachedMapStyle().id);
  const [savingStyleId, setSavingStyleId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void getSavedMapStyle().then((style) => {
      if (!cancelled) {
        setSelectedStyleId(style.id);
      }
    });

    const unsubscribe = subscribeToMapStyleChanges((style) => {
      setSelectedStyleId(style.id);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  async function handleSelect(styleId: string) {
    setSavingStyleId(styleId);
    try {
      const savedStyle = await saveMapStyle(styleId);
      setSelectedStyleId(savedStyle.id);
      back();
    } finally {
      setSavingStyleId(null);
    }
  }

  return (
    <View
      className="bg-background"
      style={{
        gap: 8,
        paddingBottom: Math.max(insets.bottom, 16) + 12,
        paddingHorizontal: 20,
        paddingTop: 18,
      }}>
      {MAP_STYLE_OPTIONS.map((option) => {
        const selected = option.id === selectedStyleId;

        return (
          <Pressable
            key={option.id}
            accessibilityRole="button"
            accessibilityState={{ selected, disabled: savingStyleId !== null }}
            disabled={savingStyleId !== null}
            onPress={() => void handleSelect(option.id)}
            className={`min-h-14 flex-row items-center justify-between rounded-2xl border px-4 ${
              selected ? 'border-primary bg-primary/10' : 'border-border bg-card'
            }`}>
            <Text className="text-base font-semibold text-foreground">{option.label}</Text>
            <View className="size-7 items-center justify-center">
              {selected ? (
                <Ionicons name="checkmark" size={18} color={APP_COLORS.primary} />
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
