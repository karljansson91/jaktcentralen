import { GlassIconButton } from '@/components/glass/glass-icon-button';
import { GlassSurface } from '@/components/glass/glass-surface';
import { Text } from '@/components/ui';
import {
  AssignmentRouteSummary,
  type AssignmentRouteSummaryProps,
} from '@/components/event/assignment-route-summary';
import { Ionicons } from '@expo/vector-icons';
import { useState, type ReactNode } from 'react';
import {
  LayoutAnimation,
  Pressable,
  StyleSheet,
  View,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

const GLASS_NAV_HEIGHT = 44;
const GLASS_NAV_HORIZONTAL_GAP = 8;
const FLOATING_HEADER_TINT = 'rgba(42, 108, 55, 0.84)';
const FLOATING_HEADER_OVERLAY = 'rgba(29, 95, 43, 0.22)';
const HEADER_DETAILS_ANIMATION = {
  create: {
    property: LayoutAnimation.Properties.opacity,
    type: LayoutAnimation.Types.easeInEaseOut,
  },
  delete: {
    property: LayoutAnimation.Properties.opacity,
    type: LayoutAnimation.Types.easeInEaseOut,
  },
  duration: 260,
  update: {
    springDamping: 0.82,
    type: LayoutAnimation.Types.spring,
  },
};

type HuntMapTopNavProps = {
  allowedGameLabel?: string | null;
  actionsMenu?: ReactNode;
  forceDetailsVisible?: boolean;
  onBack: () => void;
  onMore?: () => void;
  positionSharingEnabled?: boolean;
  readinessLabel?: string | null;
  renderActionsMenu?: () => ReactNode;
  routeSummary?: AssignmentRouteSummaryProps | null;
  title: string;
  windDirectionLabel?: string | null;
};

export function HuntMapTopNav({
  allowedGameLabel,
  actionsMenu,
  forceDetailsVisible = false,
  onBack,
  onMore,
  positionSharingEnabled,
  readinessLabel,
  renderActionsMenu,
  routeSummary,
  title,
  windDirectionLabel,
}: HuntMapTopNavProps) {
  const [detailsVisible, setDetailsVisible] = useState(false);
  const hasDetails = Boolean(readinessLabel || allowedGameLabel || routeSummary);
  const detailsExpanded = hasDetails && (detailsVisible || forceDetailsVisible);
  const canToggleDetails = hasDetails && !forceDetailsVisible;
  const subtitleCount = Number(Boolean(readinessLabel)) + Number(Boolean(allowedGameLabel));
  const expandedTitleSurfaceStyle = routeSummary
    ? styles.expandedTitleSurface
    : subtitleCount > 1
      ? styles.doubleSubtitleTitleSurface
      : subtitleCount === 1
      ? styles.readinessTitleSurface
      : styles.compactTitleSurface;
  const titleSurfaceStyle = detailsExpanded
    ? expandedTitleSurfaceStyle
    : styles.compactTitleSurface;
  const positionSharingLabel =
    positionSharingEnabled == null
      ? null
      : positionSharingEnabled
        ? 'Positionsdelning aktiv'
        : 'Positionsdelning av';
  const toggleDetails = () => {
    LayoutAnimation.configureNext(HEADER_DETAILS_ANIMATION);
    setDetailsVisible((visible) => !visible);
  };

  return (
    <View className="w-full">
      <View style={styles.row}>
        <GlassIconButton
          icon="chevron-back"
          iconSize={21}
          onPress={onBack}
          accessibilityLabel="Gå tillbaka"
          surfaceClassName="size-11"
        />

        <View className="min-w-0 flex-1 items-center justify-center px-2">
          <GlassSurface
            tone="dark"
            overlayColor={FLOATING_HEADER_OVERLAY}
            tintColor={FLOATING_HEADER_TINT}
            className="max-w-full rounded-[28px]"
            style={titleSurfaceStyle}
            contentClassName="h-full items-center justify-center gap-1 px-4 py-2">
            <Pressable
              accessibilityLabel={[
                title,
                positionSharingLabel,
                windDirectionLabel,
                canToggleDetails
                  ? detailsExpanded
                    ? 'Dölj jaktinfo'
                    : 'Visa jaktinfo'
                  : null,
              ]
                .filter(Boolean)
                .join('. ')}
              accessibilityRole={canToggleDetails ? 'button' : undefined}
              accessibilityState={canToggleDetails ? { expanded: detailsExpanded } : undefined}
              disabled={!canToggleDetails}
              hitSlop={8}
              onPress={toggleDetails}
              className="min-h-6 max-w-full flex-row items-center justify-center gap-1.5">
              <Text
                className="min-w-0 shrink text-center text-[16px] font-semibold leading-[21px] text-white"
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.72}
                style={styles.floatingTitle}>
                {title}
              </Text>
              {positionSharingEnabled != null ? (
                <Ionicons
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                  name={positionSharingEnabled ? 'navigate' : 'navigate-outline'}
                  size={14}
                  color={positionSharingEnabled ? '#8FE8A5' : 'rgba(255, 255, 255, 0.62)'}
                />
              ) : null}
              {windDirectionLabel ? (
                <Text
                  className="text-[11px] font-bold leading-[14px] text-white/85"
                  numberOfLines={1}>
                  {windDirectionLabel}
                </Text>
              ) : null}
            </Pressable>
            {detailsExpanded && readinessLabel ? (
              <Text className="text-center text-[11px] font-semibold leading-[14px] text-white/85">
                {readinessLabel}
              </Text>
            ) : null}
            {detailsExpanded && allowedGameLabel ? (
              <Text
                className="text-center text-[11px] font-semibold leading-[14px] text-white/85"
                numberOfLines={1}>
                {allowedGameLabel}
              </Text>
            ) : null}
            {detailsExpanded && routeSummary ? (
              <AssignmentRouteSummary {...routeSummary} />
            ) : null}
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
            surfaceClassName="size-11"
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
