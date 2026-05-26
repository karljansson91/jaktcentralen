import { Text } from '@/components/ui';
import type { AssignmentRouteStatus } from '@/hooks/use-assignment-route';
import {
  formatTrailDistance,
  formatTrailDuration,
  type AssignmentRoute,
  type AssignmentTrailMode,
} from '@/lib/hunt-navigation';
import { APP_COLORS } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

export type AssignmentRouteSummaryProps = {
  contextLabel?: string;
  emptyLabel?: string;
  error: string | null;
  label?: string;
  mode: AssignmentTrailMode;
  onToggleMode: () => void;
  route: AssignmentRoute | null;
  status: AssignmentRouteStatus;
};

export function AssignmentRouteSummary({
  contextLabel = 'till pass',
  emptyLabel = 'Ingen väg',
  error,
  label,
  mode,
  onToggleMode,
  route,
  status,
}: AssignmentRouteSummaryProps) {
  const modeLabel = mode === 'walking' ? 'Gångväg' : 'Riktning';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        mode === 'walking'
          ? `Byt till riktning ${contextLabel}`
          : `Byt till gångväg ${contextLabel}`
      }
      onPress={onToggleMode}
      style={styles.trailSummaryRow}>
      <Ionicons
        name={mode === 'walking' ? 'walk' : 'navigate'}
        size={16}
        color={APP_COLORS.surface}
      />
      {status === 'loading' ? (
        <>
          <ActivityIndicator size="small" color={APP_COLORS.surface} />
          <Text className="text-xs font-semibold text-white">Beräknar…</Text>
        </>
      ) : route ? (
        <Text className="text-xs font-semibold text-white" numberOfLines={1}>
          {label ? `${label} · ` : ''}
          {modeLabel} · {formatTrailDistance(route.distanceMeters)} ·{' '}
          {formatTrailDuration(route.durationSeconds)}
        </Text>
      ) : (
        <Text className="text-xs font-semibold text-white" numberOfLines={1}>
          {label ? `${label} · ` : ''}
          {error ?? emptyLabel}
        </Text>
      )}
      <Ionicons name="swap-horizontal" size={14} color="rgba(255, 255, 255, 0.78)" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  trailSummaryRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 28,
    paddingHorizontal: 6,
  },
});
