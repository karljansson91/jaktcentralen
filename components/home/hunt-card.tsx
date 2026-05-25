import { Badge, Card, CardContent, Text } from '@/components/ui';
import type { EventLifecycle } from '@/lib/event-lifecycle';
import { APP_COLORS } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';

type HomeHuntCardEvent = {
  _id: string;
  endDate: number;
  endedAt?: number | null;
  startDate: number;
  title: string;
};

type HomeHuntCardProps = {
  event: HomeHuntCardEvent;
  lifecycle: EventLifecycle;
  onPress: () => void;
};

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('sv-SE');
}

function getHuntDateLabel(event: HomeHuntCardEvent, lifecycle: EventLifecycle) {
  if (lifecycle === 'active') {
    return `Startade ${formatDate(event.startDate)}`;
  }

  if (lifecycle === 'ended') {
    return event.endedAt ? `Avslutad ${formatDate(event.endedAt)}` : formatDate(event.endDate);
  }

  return `Startar ${formatDate(event.startDate)}`;
}

export function HomeHuntCard({ event, lifecycle, onPress }: HomeHuntCardProps) {
  const isActive = lifecycle === 'active';
  const isEnded = lifecycle === 'ended';

  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      <Card className={`border-border/70 py-0 ${isEnded ? 'bg-card/80' : ''}`}>
        <CardContent className="px-5 py-4">
          <View className="flex-row items-center gap-4">
            <View
              className={`size-12 items-center justify-center rounded-2xl ${
                isActive ? 'bg-primary/15' : isEnded ? 'bg-secondary' : 'bg-primary/10'
              }`}>
              <Ionicons
                name={isEnded ? 'archive-outline' : 'compass-outline'}
                size={22}
                color={APP_COLORS.primary}
              />
            </View>
            <View className="min-w-0 flex-1 gap-1">
              <View className="flex-row items-center justify-between gap-3">
                <Text className="min-w-0 flex-1 text-base font-semibold text-foreground" numberOfLines={1}>
                  {event.title}
                </Text>
                <Badge variant={isActive ? 'default' : isEnded ? 'muted' : 'secondary'}>
                  <Text>{isActive ? 'Pågår' : isEnded ? 'Avslutad' : 'Kommande'}</Text>
                </Badge>
              </View>
              <Text className="text-sm text-muted-foreground" numberOfLines={1}>
                {getHuntDateLabel(event, lifecycle)}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#8b948d" />
          </View>
        </CardContent>
      </Card>
    </Pressable>
  );
}
