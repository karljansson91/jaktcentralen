import { GlassIconButton } from '@/components/glass/glass-icon-button';
import { GlassSurface } from '@/components/glass/glass-surface';
import { Text } from '@/components/ui';
import {
  AssignmentRouteSummary,
  type AssignmentRouteSummaryProps,
} from '@/components/event/assignment-route-summary';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type TextStyle, type ViewStyle } from 'react-native';

const GLASS_NAV_HEIGHT = 44;
const GLASS_NAV_HORIZONTAL_GAP = 8;
const FLOATING_HEADER_TINT = 'rgba(42, 108, 55, 0.84)';
const FLOATING_HEADER_OVERLAY = 'rgba(29, 95, 43, 0.22)';

type HuntMapTopNavProps = {
  allowedGameLabel?: string | null;
  actionsMenu?: ReactNode;
  onAllowedGamePress?: () => void;
  onBack: () => void;
  onMore?: () => void;
  readinessLabel?: string | null;
  renderActionsMenu?: () => ReactNode;
  routeSummary?: AssignmentRouteSummaryProps | null;
  title: string;
};

export function HuntMapTopNav({
  allowedGameLabel,
  actionsMenu,
  onAllowedGamePress,
  onBack,
  onMore,
  readinessLabel,
  renderActionsMenu,
  routeSummary,
  title,
}: HuntMapTopNavProps) {
  const subtitleCount = Number(Boolean(readinessLabel)) + Number(Boolean(allowedGameLabel));
  const titleSurfaceStyle = routeSummary
    ? styles.expandedTitleSurface
    : subtitleCount > 1
      ? styles.doubleSubtitleTitleSurface
      : subtitleCount === 1
      ? styles.readinessTitleSurface
      : styles.compactTitleSurface;

  return (
    <View className="w-full">
      <View style={styles.row}>
        <GlassIconButton
          icon="chevron-back"
          iconSize={21}
          onPress={onBack}
          accessibilityLabel="Gå tillbaka"
          surfaceClassName="size-11"
          tone="dark"
        />

        <View className="min-w-0 flex-1 items-center justify-center px-2">
          <GlassSurface
            tone="dark"
            overlayColor={FLOATING_HEADER_OVERLAY}
            tintColor={FLOATING_HEADER_TINT}
            className="max-w-full rounded-[28px]"
            style={titleSurfaceStyle}
            contentClassName="h-full items-center justify-center gap-1 px-4 py-2">
            <View className="min-h-6 items-center justify-center">
              <Text
                className={cn('text-center text-[16px] font-semibold leading-[21px] text-white')}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.72}
                style={styles.floatingTitle}>
                {title}
              </Text>
            </View>
            {readinessLabel ? (
              <Text className="text-center text-[11px] font-semibold leading-[14px] text-white/85">
                {readinessLabel}
              </Text>
            ) : null}
            {allowedGameLabel ? (
              <Pressable
                accessibilityRole="button"
                onPress={onAllowedGamePress}
                className="max-w-full">
                <Text
                  className="text-center text-[11px] font-semibold leading-[14px] text-white/85"
                  numberOfLines={1}>
                  {allowedGameLabel}
                </Text>
              </Pressable>
            ) : null}
            {routeSummary ? <AssignmentRouteSummary {...routeSummary} /> : null}
          </GlassSurface>
        </View>

        {renderActionsMenu ? (
          renderActionsMenu()
        ) : actionsMenu ? (
          actionsMenu
        ) : onMore ? (
          <GlassIconButton
            icon="ellipsis-horizontal"
            iconSize={21}
            onPress={onMore}
            accessibilityLabel="Jaktåtgärder"
            overlayColor={FLOATING_HEADER_OVERLAY}
            surfaceClassName="size-11"
            tintColor={FLOATING_HEADER_TINT}
            tone="dark"
          />
        ) : (
          <View style={{ width: GLASS_NAV_HEIGHT }} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  compactTitleSurface: {
    height: 40,
  } satisfies ViewStyle,
  expandedTitleSurface: {
    minHeight: 68,
    width: 278,
  } satisfies ViewStyle,
  doubleSubtitleTitleSurface: {
    height: 70,
    width: 250,
  } satisfies ViewStyle,
  readinessTitleSurface: {
    height: 56,
    width: 230,
  } satisfies ViewStyle,
  floatingTitle: {
    textShadowColor: 'rgba(0, 0, 0, 0.42)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  } satisfies TextStyle,
  row: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: GLASS_NAV_HORIZONTAL_GAP,
    minHeight: GLASS_NAV_HEIGHT,
  } satisfies ViewStyle,
});
