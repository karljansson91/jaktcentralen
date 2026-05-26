import { HomeHuntCard } from '@/components/home/hunt-card';
import { Badge, Text } from '@/components/ui';
import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  FadeOutUp,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

type EndedHuntsDropdownEvent = {
  _id: string;
  endDate: number;
  endedAt?: number | null;
  startDate: number;
  title: string;
};

type EndedHuntsDropdownProps = {
  endedEvents: EndedHuntsDropdownEvent[];
  expanded: boolean;
  onOpenEvent: (eventId: string) => void;
  onToggle: () => void;
};

const dropdownLayout = LinearTransition.duration(220).easing(Easing.out(Easing.cubic));
const cardsEntering = FadeInDown.duration(200).easing(Easing.out(Easing.cubic));
const cardsExiting = FadeOutUp.duration(160).easing(Easing.out(Easing.cubic));

export function EndedHuntsDropdown({
  endedEvents,
  expanded,
  onOpenEvent,
  onToggle,
}: EndedHuntsDropdownProps) {
  const rotation = useSharedValue(expanded ? 1 : 0);

  useEffect(() => {
    rotation.value = withTiming(expanded ? 1 : 0, {
      duration: 200,
      easing: Easing.out(Easing.cubic),
    });
  }, [expanded, rotation]);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value * 180}deg` }],
  }));

  if (endedEvents.length === 0) {
    return null;
  }

  return (
    <Animated.View className="gap-2 pt-1" layout={dropdownLayout}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={expanded ? 'Dölj avslutade jakter' : 'Visa avslutade jakter'}
        accessibilityState={{ expanded }}
        onPress={onToggle}
        className="flex-row items-center justify-between rounded-2xl px-1 py-2">
        <View className="flex-row items-center gap-2">
          <Text className="text-sm font-semibold text-muted-foreground">Avslutade</Text>
          <Badge variant="muted">
            <Text>{endedEvents.length}</Text>
          </Badge>
        </View>
        <Animated.View style={chevronStyle}>
          <Ionicons name="chevron-down" size={18} color="#8b948d" />
        </Animated.View>
      </Pressable>

      {expanded ? (
        <Animated.View
          className="gap-2"
          entering={cardsEntering}
          exiting={cardsExiting}
          layout={dropdownLayout}>
          {endedEvents.map((event) => (
            <HomeHuntCard
              key={event._id}
              event={event}
              lifecycle="ended"
              onPress={() => onOpenEvent(event._id)}
            />
          ))}
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}
