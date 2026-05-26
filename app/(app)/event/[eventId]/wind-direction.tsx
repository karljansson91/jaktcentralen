import { GlassIconButton } from '@/components/glass';
import { Text } from '@/components/ui';
import { publishWindDirectionSelection } from '@/lib/wind-direction-selection';
import { bearingFromScreenSwipe } from '@/lib/scent-plume';
import { getWindDirectionDisplay } from '@/lib/wind-direction';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { PanResponder, StyleSheet, Vibration, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const MIN_SWIPE_DISTANCE = 32;

type TouchPoint = {
  x: number;
  y: number;
};

export default function WindDirectionScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const { back, canGoBack, replace } = useRouter();
  const insets = useSafeAreaInsets();
  const [touchStart, setTouchStart] = useState<TouchPoint | null>(null);
  const [touchCurrent, setTouchCurrent] = useState<TouchPoint | null>(null);

  const close = useCallback(() => {
    if (canGoBack()) {
      back();
      return;
    }

    replace(`/event/${eventId}`);
  }, [back, canGoBack, eventId, replace]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: () => true,
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: (_, gestureState) => {
          const start = {
            x: gestureState.x0,
            y: gestureState.y0,
          };
          setTouchStart(start);
          setTouchCurrent(start);
        },
        onPanResponderMove: (_, gestureState) => {
          setTouchCurrent({
            x: gestureState.x0 + gestureState.dx,
            y: gestureState.y0 + gestureState.dy,
          });
        },
        onPanResponderRelease: (_, gestureState) => {
          const distance = Math.hypot(gestureState.dx, gestureState.dy);
          setTouchStart(null);
          setTouchCurrent(null);

          if (distance < MIN_SWIPE_DISTANCE) {
            return;
          }

          const windSourceDirection = bearingFromScreenSwipe(gestureState.dx, gestureState.dy);
          Vibration.vibrate(8);
          publishWindDirectionSelection(windSourceDirection);
          close();
        },
        onPanResponderTerminate: () => {
          setTouchStart(null);
          setTouchCurrent(null);
        },
      }),
    [close]
  );

  const previewBearing =
    touchStart && touchCurrent
      ? bearingFromScreenSwipe(touchCurrent.x - touchStart.x, touchCurrent.y - touchStart.y)
      : null;
  const preview = previewBearing == null ? null : getWindDirectionDisplay(previewBearing);

  return (
    <View
      className="flex-1 bg-background px-6"
      style={{ paddingBottom: Math.max(insets.bottom, 20), paddingTop: insets.top + 12 }}>
      <View className="flex-row items-center justify-between">
        <View className="min-w-0 flex-1 pr-3">
          <Text variant="h3">Vindriktning</Text>
          <Text className="mt-1 text-sm text-muted-foreground">
            Svep i riktningen vinden kommer ifrån.
          </Text>
        </View>
        <GlassIconButton
          accessibilityLabel="Avbryt vindriktning"
          icon="close"
          onPress={close}
          surfaceClassName="size-11"
        />
      </View>

      <View
        {...panResponder.panHandlers}
        className="mt-8 min-h-0 flex-1 items-center justify-center rounded-[28px] border border-border bg-card px-6"
        style={styles.swipePanel}>
        <View className="items-center gap-3">
          <Text className="text-center text-sm font-semibold uppercase text-muted-foreground">
            {preview ? 'Vind från' : 'Svep här'}
          </Text>
          <Text className="text-[64px] font-black leading-[72px] text-primary">
            {preview?.arrow ?? '↑'}
          </Text>
          <Text className="text-center text-2xl font-bold text-foreground">
            {preview ? preview.label : 'Välj riktning'}
          </Text>
          <Text className="max-w-[260px] text-center text-sm leading-5 text-muted-foreground">
            Exempel: svep uppåt för nordlig vind. Då visas doftplymen söderut på kartan.
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  swipePanel: {
    boxShadow: '0 14px 34px rgba(49, 52, 68, 0.12)',
  },
});
