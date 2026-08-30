import { Text } from '@/components/ui';
import {
  getEscapeDirectionLabel,
  getFollowUpResolutionLabel,
  getShotReportResultLabel,
} from '@/lib/shot-reports';
import { APP_COLORS } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';

export type ShotReportActivityItem = {
  _id: string;
  actor?: { name?: string | null } | null;
  assignedUser?: { name?: string | null } | null;
  escapeDirectionDegrees?: number;
  instruction?: string;
  kind: string;
  nextResult?: string;
  nextSpeciesLabel?: string;
  note?: string;
  report?: {
    _id: string;
    result: string;
    speciesLabel: string;
  };
  reportId: string;
  resolution?: string;
  timestamp: number;
};

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleString('sv-SE', {
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
  });
}

function getActivityIcon(kind: string): keyof typeof Ionicons.glyphMap {
  switch (kind) {
    case 'reported':
      return 'locate-outline';
    case 'supplemented':
      return 'navigate-outline';
    case 'report_updated':
      return 'create-outline';
    case 'follow_up_planned':
      return 'person-add-outline';
    case 'follow_up_started':
      return 'walk-outline';
    case 'follow_up_finished':
      return 'checkmark-circle-outline';
    case 'false_report':
      return 'close-circle-outline';
    default:
      return 'time-outline';
  }
}

function getActivityBody(activity: ShotReportActivityItem) {
  switch (activity.kind) {
    case 'reported':
      return activity.report
        ? `${activity.report.speciesLabel} · ${getShotReportResultLabel(activity.report.result)}`
        : 'Skott rapporterat';
    case 'supplemented': {
      const parts = [
        activity.escapeDirectionDegrees == null
          ? null
          : `Flyktriktning ${getEscapeDirectionLabel(activity.escapeDirectionDegrees)}`,
        activity.note,
      ].filter(Boolean);
      return parts.join(' · ');
    }
    case 'report_updated':
      return `${activity.nextSpeciesLabel ?? 'Vilt'} · ${getShotReportResultLabel(
        activity.nextResult ?? ''
      )}`;
    case 'follow_up_planned':
      return [
        `Tilldelat ${activity.assignedUser?.name?.trim() || 'deltagare'}`,
        activity.instruction,
      ]
        .filter(Boolean)
        .join(' · ');
    case 'follow_up_started':
      return 'Eftersök startat';
    case 'follow_up_finished':
      return [
        `Eftersök avslutat · ${getFollowUpResolutionLabel(activity.resolution ?? '')}`,
        activity.note,
      ]
        .filter(Boolean)
        .join(' · ');
    case 'false_report':
      return 'Markerad som felrapporterad';
    default:
      return 'Rapporten ändrades';
  }
}

export function ShotReportActivityList({
  activities,
  onPressReport,
}: {
  activities: ShotReportActivityItem[];
  onPressReport?: (reportId: string) => void;
}) {
  return (
    <View className="gap-2">
      {activities.map((activity) => {
        const content = (
          <>
            <View className="mt-0.5 size-9 items-center justify-center rounded-full bg-primary/10">
              <Ionicons
                color={activity.kind === 'false_report' ? APP_COLORS.textMuted : APP_COLORS.primary}
                name={getActivityIcon(activity.kind)}
                size={18}
              />
            </View>
            <View className="min-w-0 flex-1 gap-0.5">
              <Text className="font-semibold leading-5">{getActivityBody(activity)}</Text>
              <Text className="text-xs text-muted-foreground">
                {activity.actor?.name?.trim() || 'Okänd'} · {formatTime(activity.timestamp)}
              </Text>
            </View>
            {onPressReport ? (
              <Ionicons name="chevron-forward" color={APP_COLORS.textMuted} size={17} />
            ) : null}
          </>
        );

        if (onPressReport) {
          return (
            <Pressable
              key={activity._id}
              accessibilityRole="button"
              className="flex-row items-start gap-3 rounded-2xl border border-border bg-card px-3 py-3 active:bg-accent"
              onPress={() => onPressReport(activity.reportId)}>
              {content}
            </Pressable>
          );
        }

        return (
          <View
            key={activity._id}
            className="flex-row items-start gap-3 rounded-2xl border border-border bg-card px-3 py-3">
            {content}
          </View>
        );
      })}
    </View>
  );
}
