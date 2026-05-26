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
  onAllowedGamePress?: () => void;
  onBack: () => void;
  onMore?: () => void;
  positionSharingEnabled?: boolean;
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
  positionSharingEnabled,
  readinessLabel,
  renderActionsMenu,
  routeSummary,
  title,
}: HuntMapTopNavProps) {
  const [detailsVisible, setDetailsVisible] = useState(false);
  const hasDetails = Boolean(readinessLabel || allowedGameLabel || routeSummary);
  const detailsExpanded = hasDetails && detailsVisible;
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
          tone="dark"
        />

        <View className="min-w-0 flex-1 items-center justify-center px-2">
          <Pressable
            accessibilityLabel={[
              title,
              positionSharingLabel,
              hasDetails
                ? detailsExpanded
                  ? 'Dölj jaktinfo'
                  : 'Visa jaktinfo'
                : null,
            ]
              .filter(Boolean)
              .join('. ')}
            accessibilityRole={hasDetails ? 'button' : undefined}
            accessibilityState={hasDetails ? { expanded: detailsExpanded } : undefined}
            disabled={!hasDetails}
            hitSlop={8}
            onPress={toggleDetails}
            className="max-w-full">
            {({ pressed }) => (
              <GlassSurface
                interactive={hasDetails}
                tone="dark"
                overlayColor={FLOATING_HEADER_OVERLAY}
                tintColor={FLOATING_HEADER_TINT}
                className="max-w-full rounded-[28px]"
                style={[
                  pressed && hasDetails ? styles.pressedTitleSurface : null,
                  titleSurfaceStyle,
                ]}
                contentClassName="h-full items-center justify-center gap-1 px-4 py-2">
                <View className="min-h-6 max-w-full flex-row items-center justify-center gap-1.5">
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
                </View>
                {detailsExpanded && readinessLabel ? (
                  <Text className="text-center text-[11px] font-semibold leading-[14px] text-white/85">
                    {readinessLabel}
                  </Text>
                ) : null}
                {detailsExpanded && allowedGameLabel ? (
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
                {detailsExpanded && routeSummary ? (
                  <AssignmentRouteSummary {...routeSummary} />
                ) : null}
              </GlassSurface>
            )}
          </Pressable>
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
  pressedTitleSurface: {
    transform: [{ scale: 1.025 }],
  } satisfies ViewStyle,
  row: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: GLASS_NAV_HORIZONTAL_GAP,
    minHeight: GLASS_NAV_HEIGHT,
  } satisfies ViewStyle,
});
