import { Button, Card, CardContent, Text } from '@/components/ui';
import type { api } from '@/convex/_generated/api';
import { formatEventDateRange } from '@/lib/event-dates';
import { APP_COLORS } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import type { FunctionReturnType } from 'convex/server';
import { View } from 'react-native';

type HuntInvitation = FunctionReturnType<
  typeof api.eventMembers.listMyInvitations
>[number];

type HuntInvitationCardProps = {
  disabled: boolean;
  invitation: HuntInvitation;
  onAccept: () => void;
  onDecline: () => void;
  pendingAction: 'accept' | 'decline' | null;
};

export function HuntInvitationCard({
  disabled,
  invitation,
  onAccept,
  onDecline,
  pendingAction,
}: HuntInvitationCardProps) {
  return (
    <Card className="border-border/70 bg-card py-0">
      <CardContent className="gap-4 p-5">
        <View className="flex-row items-start gap-3">
          <View className="size-11 items-center justify-center rounded-2xl bg-secondary">
            <Ionicons name="compass-outline" size={22} color={APP_COLORS.primary} />
          </View>
          <View className="min-w-0 flex-1 gap-1">
            <Text className="text-base font-semibold text-foreground" numberOfLines={2}>
              {invitation.event.title}
            </Text>
            <Text className="text-sm text-muted-foreground">{invitation.areaName}</Text>
            <Text className="text-sm text-muted-foreground">
              {formatEventDateRange(invitation.event.startDate, invitation.event.endDate)}
            </Text>
          </View>
        </View>
        <View className="flex-row gap-2">
          <Button className="h-11 flex-1 rounded-xl" disabled={disabled} onPress={onAccept}>
            <Text>{pendingAction === 'accept' ? 'Accepterar…' : 'Acceptera'}</Text>
          </Button>
          <Button
            variant="outline"
            className="h-11 flex-1 rounded-xl bg-background/70"
            disabled={disabled}
            onPress={onDecline}
          >
            <Text>{pendingAction === 'decline' ? 'Avböjer…' : 'Avböj'}</Text>
          </Button>
        </View>
      </CardContent>
    </Card>
  );
}
