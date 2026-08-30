import {
  EditShotReportSection,
  FollowUpActions,
  SupplementShotReportSection,
} from '@/components/event/shot-report-actions';
import { ShotReportActivityList } from '@/components/event/shot-report-activity-list';
import { Button, Text } from '@/components/ui';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { useCurrentTime } from '@/hooks/use-current-time';
import { withLoadingState } from '@/lib/async-state';
import {
  getFollowUpResolutionLabel,
  getFollowUpStatusLabel,
  getShotReportResultColor,
  getShotReportResultLabel,
} from '@/lib/shot-reports';
import { APP_COLORS } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery } from 'convex/react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const STALE_POSITION_MS = 5 * 60_000;

function formatDateTime(timestamp: number) {
  return new Date(timestamp).toLocaleString('sv-SE', {
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
  });
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-start justify-between gap-4 border-b border-border/70 py-2.5 last:border-b-0">
      <Text className="text-sm text-muted-foreground">{label}</Text>
      <Text className="min-w-0 flex-1 text-right text-sm font-semibold">{value}</Text>
    </View>
  );
}

export default function ShotReportDetailsScreen() {
  const { reportId } = useLocalSearchParams<{
    reportId?: string;
  }>();
  const { back } = useRouter();
  const insets = useSafeAreaInsets();
  const currentTime = useCurrentTime();
  const [markingFalse, setMarkingFalse] = useState(false);
  const details = useQuery(
    api.shotReports.getDetails,
    reportId
      ? { currentTime, reportId: reportId as Id<'shotReports'> }
      : 'skip'
  );
  const event = useQuery(
    api.events.get,
    details ? { eventId: details.report.eventId } : 'skip'
  );
  const members = useQuery(
    api.eventMembers.listMembers,
    details?.canPlanFollowUp ? { eventId: details.report.eventId } : 'skip'
  );
  const markFalseReport = useMutation(api.shotReports.markFalseReport);

  const handleMarkFalse = () => {
    if (!details) return;
    Alert.alert(
      'Markera felrapporterad',
      'Rapporten ligger kvar i tidslinjen men markeras som fel.',
      [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: 'Markera',
          style: 'destructive',
          onPress: () => {
            void withLoadingState(setMarkingFalse, async () => {
              try {
                await markFalseReport({ reportId: details.report._id });
              } catch (error) {
                Alert.alert(
                  'Kunde inte ändra rapporten',
                  error instanceof Error ? error.message : 'Försök igen om en stund.'
                );
              }
            });
          },
        },
      ]
    );
  };

  if (details === undefined || event === undefined) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color={APP_COLORS.primary} />
      </View>
    );
  }

  if (!details || !event) {
    return (
      <View className="flex-1 items-center justify-center bg-background p-6">
        <Text variant="h3">Skottrapporten hittades inte</Text>
      </View>
    );
  }

  const { followUp, report } = details;
  const shooterPositionLabel = report.shooterPosition
    ? `${formatDateTime(report.shooterPosition.timestamp)}${
        report.reportedAt - report.shooterPosition.timestamp > STALE_POSITION_MS
          ? ' · Äldre position – kan vara inaktuell'
          : ''
      }`
    : 'Skyttposition saknas';
  const acceptedMembers = members ?? [];
  const activityRows = details.activities.map((activity) => ({
    ...activity,
    report,
  }));

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        contentContainerStyle={{
          gap: 18,
          paddingHorizontal: 20,
          paddingTop: 14,
        }}>
        <View className="flex-row items-start justify-between gap-4">
          <View className="min-w-0 flex-1 gap-1">
            <Text variant="h2">{report.speciesLabel}</Text>
            <View className="flex-row items-center gap-2">
              <View
                className="size-3 rounded-full"
                style={{ backgroundColor: getShotReportResultColor(report.result) }}
              />
              <Text className="font-semibold text-muted-foreground">
                {report.status === 'false_report'
                  ? 'Felrapporterat'
                  : getShotReportResultLabel(report.result)}
              </Text>
            </View>
          </View>
          <Pressable
            accessibilityLabel="Stäng"
            accessibilityRole="button"
            className="size-10 items-center justify-center rounded-full bg-muted active:bg-accent"
            onPress={() => back()}>
            <Ionicons name="close" color={APP_COLORS.text} size={22} />
          </Pressable>
        </View>

        {details.eventEnded ? (
          <View className="flex-row items-center gap-2 rounded-2xl bg-muted px-4 py-3">
            <Ionicons name="lock-closed-outline" color={APP_COLORS.textMuted} size={18} />
            <Text className="text-sm font-semibold text-muted-foreground">
              Avslutad jakt · skrivskyddad
            </Text>
          </View>
        ) : null}

        <View className="rounded-3xl border border-border bg-card px-4 py-2">
          <SummaryRow label="Rapporterad" value={formatDateTime(report.reportedAt)} />
          <SummaryRow label="Rapportör" value={details.reporter?.name?.trim() || 'Okänd'} />
          <SummaryRow label="Skyttposition" value={shooterPositionLabel} />
          {followUp ? (
            <>
              <SummaryRow label="Eftersök" value={getFollowUpStatusLabel(followUp.status)} />
              {followUp.assignedUser ? (
                <SummaryRow
                  label="Ansvarig"
                  value={followUp.assignedUser.name?.trim() || 'Okänd'}
                />
              ) : null}
              {followUp.instruction ? (
                <SummaryRow label="Instruktion" value={followUp.instruction} />
              ) : null}
              {followUp.resolution ? (
                <SummaryRow
                  label="Utfall"
                  value={getFollowUpResolutionLabel(followUp.resolution)}
                />
              ) : null}
              {followUp.resolutionNote ? (
                <SummaryRow label="Anteckning" value={followUp.resolutionNote} />
              ) : null}
            </>
          ) : null}
        </View>

        {details.canSupplement ? (
          <SupplementShotReportSection reportId={report._id} />
        ) : null}

        {followUp && followUp.status !== 'completed' && followUp.status !== 'false_report' ? (
          <FollowUpActions
            key={`${followUp.status}-${followUp.updatedAt}`}
            canManage={details.canManageFollowUp}
            canPlan={details.canPlanFollowUp}
            followUp={followUp}
            members={acceptedMembers}
            reportId={report._id}
          />
        ) : null}

        {details.canEdit ? (
          <EditShotReportSection
            key={`${report.updatedAt}`}
            allowedGame={event.allowedGame}
            report={report}
          />
        ) : null}

        {details.canEdit ? (
          <Button
            disabled={markingFalse}
            variant="destructive"
            onPress={handleMarkFalse}>
            {markingFalse ? (
              <ActivityIndicator color={APP_COLORS.surface} />
            ) : (
              <Text>Markera felrapporterad</Text>
            )}
          </Button>
        ) : null}

        <View className="gap-3">
          <Text className="text-lg font-semibold">Tidslinje</Text>
          <ShotReportActivityList activities={activityRows} />
        </View>
        <View style={{ height: Math.max(insets.bottom, 16) + 28 }} />
      </ScrollView>
    </View>
  );
}
