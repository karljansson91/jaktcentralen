import { IconButton } from '@/components/ui';
import { bearingFromScreenSwipe } from '@/lib/scent-plume';
import { APP_COLORS } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { PanResponder, StyleSheet, Vibration, View } from 'react-native';

const MIN_SWIPE_DISTANCE = 32;

type TouchPoint = {
  x: number;
  y: number;
};

type ScentDirectionOverlayProps = {
  active: boolean;
  bottomInset: number;
  onCancel: () => void;
  onDirectionSet: (directionDegrees: number) => void;
};

export function ScentDirectionOverlay({
  active,
  bottomInset,
  onCancel,
  onDirectionSet,
}: ScentDirectionOverlayProps) {
  const [touchStart, setTouchStart] = useState<TouchPoint | null>(null);
  const [touchCurrent, setTouchCurrent] = useState<TouchPoint | null>(null);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: () => active,
        onStartShouldSetPanResponder: () => active,
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

          Vibration.vibrate(8);
          onDirectionSet(bearingFromScreenSwipe(gestureState.dx, gestureState.dy));
        },
        onPanResponderTerminate: () => {
          setTouchStart(null);
          setTouchCurrent(null);
        },
      }),
    [active, onDirectionSet]
  );

  if (!active) {
    return null;
  }

  const previewBearing =
    touchStart && touchCurrent
      ? bearingFromScreenSwipe(touchCurrent.x - touchStart.x, touchCurrent.y - touchStart.y)
      : 0;

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <View
        {...panResponder.panHandlers}
        className="bg-primary/5"
        style={StyleSheet.absoluteFill}
      />

      {touchStart ? (
        <View
          pointerEvents="none"
          className="absolute size-5 rounded-full border-2 border-white bg-primary/70"
          style={{
            left: touchStart.x - 10,
            top: touchStart.y - 10,
          }}
        />
      ) : null}

      {touchCurrent && touchStart ? (
        <View
          pointerEvents="none"
          className="absolute size-12 items-center justify-center rounded-full bg-primary/80"
          style={{
            left: touchCurrent.x - 24,
            top: touchCurrent.y - 24,
            transform: [{ rotate: `${previewBearing}deg` }],
          }}>
          <Ionicons name="arrow-up" size={24} color={APP_COLORS.surface} />
        </View>
      ) : null}

      <View
        pointerEvents="box-none"
        className="absolute left-6"
        style={{ bottom: bottomInset + 18 }}>
        <IconButton
          size="lg"
          variant="outline"
          onPress={onCancel}
          accessibilityLabel="Avbryt vindriktning"
          className="size-14 bg-card"
          style={{
            borderColor: 'rgba(254, 253, 251, 0.8)',
            borderWidth: 1,
          }}>
          <Ionicons name="close" size={25} color={APP_COLORS.text} />
        </IconButton>
      </View>
    </View>
  );
}
