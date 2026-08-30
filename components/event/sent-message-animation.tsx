import { APP_COLORS } from '@/lib/theme';
import { useEffect, useState, type PropsWithChildren } from 'react';
import Animated, {
  Easing,
  interpolate,
  interpolateColor,
  Keyframe,
  LinearTransition,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from 'react-native-reanimated';

const conversationLayoutTransition = LinearTransition.duration(300).easing(
  Easing.bezier(0.22, 1, 0.36, 1)
);

const sentMessageEntering = new Keyframe({
  0: {
    opacity: 0.7,
    transform: [
      { translateX: 14 },
      { translateY: 76 },
      { scaleX: 0.84 },
      { scaleY: 0.92 }
    ]
  },
  72: {
    easing: Easing.out(Easing.cubic),
    opacity: 1,
    transform: [
      { translateX: -1 },
      { translateY: -2 },
      { scaleX: 1.015 },
      { scaleY: 1.01 }
    ]
  },
  100: {
    opacity: 1,
    transform: [
      { translateX: 0 },
      { translateY: 0 },
      { scaleX: 1 },
      { scaleY: 1 }
    ]
  }
}).duration(300);

type SentMessageAnimationProps = PropsWithChildren<{
  active: boolean;
}>;

export function SentMessageAnimation({
  active,
  children
}: SentMessageAnimationProps) {
  return (
    <Animated.View
      entering={active ? sentMessageEntering : undefined}
      layout={conversationLayoutTransition}
      style={{ transformOrigin: 'right bottom' }}
    >
      {children}
    </Animated.View>
  );
}

type OutgoingMessageFlightProps = {
  body: string;
  left: number;
  maxBubbleWidth: number;
  time: string;
  top: number;
  travelWidth: number;
};

export function OutgoingMessageFlight({
  body,
  left,
  maxBubbleWidth,
  time,
  top,
  travelWidth
}: OutgoingMessageFlightProps) {
  const [bubbleSize, setBubbleSize] = useState({ height: 0, width: 0 });
  const flightProgress = useSharedValue(0);

  useEffect(() => {
    if (bubbleSize.width <= 0) return;

    flightProgress.value = withTiming(1, {
      duration: 280,
      easing: Easing.bezier(0.2, 0.9, 0.2, 1),
      reduceMotion: ReduceMotion.System
    });
  }, [bubbleSize.width, flightProgress]);

  const bubbleStyle = useAnimatedStyle(() => {
    const initialOffsetX =
      bubbleSize.width > 0 ? -(travelWidth - bubbleSize.width) : 0;
    const targetOffsetY = -(bubbleSize.height + 28);

    return {
      backgroundColor: interpolateColor(
        flightProgress.value,
        [0, 0.22, 1],
        ['rgba(57, 128, 72, 0)', APP_COLORS.primary, APP_COLORS.primary]
      ),
      opacity: bubbleSize.width > 0 ? 1 : 0,
      transform: [
        {
          translateX: interpolate(
            flightProgress.value,
            [0, 1],
            [initialOffsetX, 0]
          )
        },
        {
          translateY: interpolate(
            flightProgress.value,
            [0, 1],
            [0, targetOffsetY]
          )
        },
        {
          scale: interpolate(
            flightProgress.value,
            [0, 0.72, 1],
            [0.98, 1.015, 1]
          )
        }
      ]
    };
  });

  const textStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      flightProgress.value,
      [0, 0.28, 1],
      [APP_COLORS.text, APP_COLORS.surface, APP_COLORS.surface]
    )
  }));

  const timeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(flightProgress.value, [0, 0.35, 0.75, 1], [0, 0, 1, 1])
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        left,
        position: 'absolute',
        top,
        width: travelWidth,
        zIndex: 20
      }}
    >
      <Animated.View
        onLayout={(event) => {
          const { height, width } = event.nativeEvent.layout;
          if (bubbleSize.width > 0 || width <= 0 || height <= 0) return;

          setBubbleSize({ height, width });
        }}
        style={[
          {
            alignSelf: 'flex-end',
            borderCurve: 'continuous',
            borderRadius: 26,
            maxWidth: maxBubbleWidth,
            paddingHorizontal: 16,
            paddingVertical: 12
          },
          bubbleStyle
        ]}
      >
        <Animated.Text style={[{ fontSize: 16, lineHeight: 20 }, textStyle]}>
          {body}
        </Animated.Text>
        <Animated.Text
          style={[
            {
              color: 'rgba(254, 253, 251, 0.7)',
              fontSize: 11,
              fontVariant: ['tabular-nums'],
              lineHeight: 14,
              marginTop: 4,
              textAlign: 'right'
            },
            timeStyle
          ]}
        >
          {time}
        </Animated.Text>
      </Animated.View>
    </Animated.View>
  );
}
