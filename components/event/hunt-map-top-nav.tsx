import { GlassIconButton } from '@/components/glass/glass-icon-button';
import { GlassSurface } from '@/components/glass/glass-surface';
import { Text } from '@/components/ui';
import {
  AssignmentRouteSummary,
  type AssignmentRouteSummaryProps,
} from '@/components/event/assignment-route-summary';
import { formatTrailDistance } from '@/lib/hunt-navigation';
import { normalizeMapHeading } from '@/lib/map-heading';
import { normalizeDegrees } from '@/lib/wind-direction';
import { Ionicons } from '@expo/vector-icons';
import { useState, type ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  LinearTransition,
} from 'react-native-reanimated';

const GLASS_NAV_HEIGHT = 44;
const GLASS_NAV_HORIZONTAL_GAP = 8;
const FLOATING_HEADER_TINT = 'rgba(42, 108, 55, 0.84)';
const FLOATING_HEADER_OVERLAY = 'rgba(29, 95, 43, 0.22)';
const COMPASS_TICKS = Array.from({ length: 24 }, (_, index) => index * 15);
const HEADING_LABELS = ['N', 'NO', 'O', 'SO', 'S', 'SV', 'V', 'NV'] as const;
const TITLE_BASE_WIDTH = 96;
const TITLE_CHAR_WIDTH = 8.8;
const TITLE_DETAIL_BASE_WIDTH = 76;
const TITLE_DETAIL_CHAR_WIDTH = 7.2;
const TITLE_SIDE_CONTENT_WIDTH = 42;
const TITLE_MIN_WIDTH = 136;
const TITLE_SIDE_CONTENT_MIN_WIDTH = 188;
const TITLE_ROUTE_MIN_WIDTH = 278;
const MEASUREMENT_ROUTE_WIDTH = 232;
const HEADER_HORIZONTAL_SPACE = 136;
const MEASUREMENT_HEADER_HORIZONTAL_SPACE = 72;
const MEASUREMENT_HEADER_HEIGHT = 44;
const headerSurfaceLayout = LinearTransition.duration(190).easing(Easing.out(Easing.cubic));
const headerDetailsEntering = FadeIn.duration(130).easing(Easing.out(Easing.cubic));
const headerDetailsExiting = FadeOut.duration(90).easing(Easing.out(Easing.cubic));

type HuntMapTopNavProps = {
  allowedGameLabel?: string | null;
  actionsMenu?: ReactNode;
  compassHeading?: number;
  forceDetailsVisible?: boolean;
  onBack: () => void;
  onCompassPress?: () => void;
  measurementOnly?: boolean;
  onMore?: () => void;
  positionSharingEnabled?: boolean;
  readinessLabel?: string | null;
  renderActionsMenu?: () => ReactNode;
  routeSummary?: AssignmentRouteSummaryProps | null;
  satLabel?: string | null;
  title: string;
  windDirectionDegrees?: number | null;
};

function getHeadingLabel(heading: number) {
  return HEADING_LABELS[Math.round(normalizeMapHeading(heading) / 45) % HEADING_LABELS.length];
}

function getTextWidthEstimate(value: string | null | undefined, charWidth: number) {
  if (!value) {
    return 0;
  }

  return value.trim().length * charWidth;
}

function getTitleSurfaceWidth({
  allowedGameLabel,
  detailsExpanded,
  hasRouteSummary,
  maxWidth,
  title,
  hasSideContent,
  readinessLabel,
  satLabel,
}: {
  allowedGameLabel?: string | null;
  detailsExpanded: boolean;
  hasRouteSummary: boolean;
  maxWidth: number;
  title: string;
  hasSideContent: boolean;
  readinessLabel?: string | null;
  satLabel?: string | null;
}) {
  const trimmedTitleLength = Math.max(title.trim().length, 4);
  const minimumWidth = hasSideContent
    ? TITLE_SIDE_CONTENT_MIN_WIDTH
    : TITLE_MIN_WIDTH;
  const titleWidth = Math.ceil(
    TITLE_BASE_WIDTH +
      trimmedTitleLength * TITLE_CHAR_WIDTH +
      (hasSideContent ? TITLE_SIDE_CONTENT_WIDTH : 0)
  );
  const detailsWidth = detailsExpanded
    ? Math.max(
        getTextWidthEstimate(readinessLabel, TITLE_DETAIL_CHAR_WIDTH),
        getTextWidthEstimate(allowedGameLabel, TITLE_DETAIL_CHAR_WIDTH),
        getTextWidthEstimate(satLabel, TITLE_DETAIL_CHAR_WIDTH)
      ) + TITLE_DETAIL_BASE_WIDTH
    : 0;
  const routeWidth = detailsExpanded && hasRouteSummary ? TITLE_ROUTE_MIN_WIDTH : 0;
  const desiredWidth = Math.ceil(Math.max(titleWidth, detailsWidth, routeWidth));

  return Math.min(maxWidth, Math.max(minimumWidth, desiredWidth));
}

function getTitleSurfaceHeight({
  detailsExpanded,
  hasRouteSummary,
  hasWindDirection,
  subtitleCount,
}: {
  detailsExpanded: boolean;
  hasRouteSummary: boolean;
  hasWindDirection: boolean;
  subtitleCount: number;
}) {
  if (!detailsExpanded) {
    return hasWindDirection ? 48 : 40;
  }

  if (hasRouteSummary) {
    return subtitleCount > 0 ? 104 : 76;
  }

  if (subtitleCount > 1) {
    return 78;
  }

  if (subtitleCount === 1) {
    return 58;
  }

  return hasWindDirection ? 48 : 40;
}

function getMeasurementSurfaceWidth(maxWidth: number) {
  return Math.min(maxWidth, MEASUREMENT_ROUTE_WIDTH);
}

function MeasurementSummary({ routeSummary }: { routeSummary: AssignmentRouteSummaryProps }) {
  const modeSwitchLabel =
    routeSummary.mode === 'walking' ? 'Byt till riktning' : 'Byt till gångväg';
  const valueLabel =
    routeSummary.status === 'loading'
      ? 'Beräknar'
      : routeSummary.route
        ? formatTrailDistance(routeSummary.route.distanceMeters)
        : routeSummary.error ?? routeSummary.emptyLabel ?? 'Ingen mätning';

  return (
    <Pressable
      accessibilityLabel={`Mätning. ${valueLabel}. ${modeSwitchLabel}`}
      accessibilityRole="button"
      onPress={routeSummary.onToggleMode}
      style={styles.measurementSummaryRow}>
      <Ionicons
        accessibilityElementsHidden
        importantForAccessibility="no"
        name={routeSummary.mode === 'walking' ? 'walk' : 'navigate'}
        size={17}
        color="#FFFFFF"
      />
      <Text
        className="min-w-0 flex-1 text-center text-[13px] font-semibold leading-[17px] text-white"
        numberOfLines={1}>
        Mätning · {valueLabel}
      </Text>
      <Ionicons
        accessibilityElementsHidden
        importantForAccessibility="no"
        name="swap-horizontal"
        size={17}
        color="rgba(255, 255, 255, 0.78)"
      />
    </Pressable>
  );
}

function NorthCompassButton({
  heading,
  onPress,
}: {
  heading: number;
  onPress: () => void;
}) {
  const normalizedHeading = normalizeMapHeading(heading);
  const headingLabel = getHeadingLabel(normalizedHeading);

  return (
    <Pressable
      accessibilityLabel={`Norr upp. Riktning ${headingLabel}`}
      accessibilityRole="button"
      hitSlop={8}
      onPress={onPress}
      style={styles.compassButton}>
      <View style={styles.compassDial}>
        {COMPASS_TICKS.map((degrees, index) => (
          <View
            key={degrees}
            style={[styles.compassTickRing, { transform: [{ rotate: `${degrees}deg` }] }]}>
            <View style={index % 6 === 0 ? styles.compassMajorTick : styles.compassTick} />
          </View>
        ))}
        <View
          style={[
            styles.compassNorthNeedle,
            { transform: [{ rotate: `${-normalizedHeading}deg` }] },
          ]}>
          <Ionicons
            accessibilityElementsHidden
            importantForAccessibility="no"
            name="caret-up"
            size={15}
            color="#FF4B4B"
            style={styles.compassNorthNeedleIcon}
          />
        </View>
        <Text style={styles.compassHeadingText}>{headingLabel}</Text>
      </View>
    </Pressable>
  );
}

function WindDirectionIndicator({
  degrees,
  mapHeading = 0,
}: {
  degrees: number;
  mapHeading?: number;
}) {
  const screenDegrees = normalizeDegrees(degrees - normalizeMapHeading(mapHeading));

  return (
    <View style={styles.windIndicator}>
      <Ionicons
        accessibilityElementsHidden
        importantForAccessibility="no"
        name="arrow-up"
        size={19}
        color="#FFFFFF"
        style={{ transform: [{ rotate: `${screenDegrees}deg` }] }}
      />
    </View>
  );
}

export function HuntMapTopNav({
  allowedGameLabel,
  actionsMenu,
  compassHeading,
  forceDetailsVisible = false,
  measurementOnly = false,
  onBack,
  onCompassPress,
  onMore,
  positionSharingEnabled,
  readinessLabel,
  renderActionsMenu,
  routeSummary,
  satLabel,
  title,
  windDirectionDegrees,
}: HuntMapTopNavProps) {
  const [detailsVisible, setDetailsVisible] = useState(false);
  const { width } = useWindowDimensions();
  const hasWindDirection = windDirectionDegrees != null;
  const hasTitleSideContent = hasWindDirection || positionSharingEnabled != null;
  const hasDetails = Boolean(readinessLabel || allowedGameLabel || routeSummary || satLabel);
  const detailsExpanded = hasDetails && (detailsVisible || forceDetailsVisible);
  const canToggleDetails = hasDetails && !forceDetailsVisible;
  const subtitleCount =
    Number(Boolean(satLabel)) + Number(Boolean(readinessLabel)) + Number(Boolean(allowedGameLabel));
  const titleSurfaceFrameStyle = {
    height: getTitleSurfaceHeight({
      detailsExpanded,
      hasRouteSummary: Boolean(routeSummary),
      hasWindDirection,
      subtitleCount,
    }),
    width: getTitleSurfaceWidth({
      allowedGameLabel,
      detailsExpanded,
      hasRouteSummary: Boolean(routeSummary),
      hasSideContent: hasTitleSideContent,
      maxWidth: Math.max(TITLE_MIN_WIDTH, width - HEADER_HORIZONTAL_SPACE),
      readinessLabel,
      satLabel,
      title,
    }),
  };
  const positionSharingLabel =
    positionSharingEnabled == null
      ? null
      : positionSharingEnabled
        ? 'Positionsdelning aktiv'
        : 'Positionsdelning av';
  const toggleDetails = () => {
    setDetailsVisible((visible) => !visible);
  };

  if (measurementOnly) {
    const measurementSurfaceFrameStyle = {
      height: MEASUREMENT_HEADER_HEIGHT,
      width: getMeasurementSurfaceWidth(
        Math.max(TITLE_SIDE_CONTENT_MIN_WIDTH, width - MEASUREMENT_HEADER_HORIZONTAL_SPACE)
      ),
    };

    return (
      <View className="w-full">
        <View style={styles.measurementHeaderRow}>
          <Animated.View
            layout={headerSurfaceLayout}
            style={[styles.titleSurfaceFrame, measurementSurfaceFrameStyle]}>
            <GlassSurface
              tone="dark"
              overlayColor={FLOATING_HEADER_OVERLAY}
              tintColor={FLOATING_HEADER_TINT}
              className="max-w-full rounded-[28px]"
              style={styles.titleSurfaceFill}
              contentClassName="h-full items-center justify-center px-3 py-1">
              {routeSummary ? (
                <MeasurementSummary routeSummary={routeSummary} />
              ) : (
                <Text className="text-center text-[13px] font-semibold text-white">Mätning</Text>
              )}
            </GlassSurface>
          </Animated.View>
        </View>
      </View>
    );
  }

  return (
    <View className="w-full">
      <View style={styles.row}>
        <View style={styles.leftControls}>
          <GlassIconButton
            icon="chevron-back"
            iconSize={21}
            onPress={onBack}
            accessibilityLabel="Gå tillbaka"
            surfaceClassName="size-11"
          />

          {compassHeading != null && onCompassPress ? (
            <NorthCompassButton heading={compassHeading} onPress={onCompassPress} />
          ) : null}
        </View>

        <View className="min-w-0 flex-1 items-center justify-center px-2">
          <Animated.View
            layout={headerSurfaceLayout}
            style={[styles.titleSurfaceFrame, titleSurfaceFrameStyle]}>
            <GlassSurface
              tone="dark"
              overlayColor={FLOATING_HEADER_OVERLAY}
              tintColor={FLOATING_HEADER_TINT}
              className="max-w-full rounded-[28px]"
              style={styles.titleSurfaceFill}
              contentClassName="h-full items-center justify-center px-3 py-1">
              <View style={styles.titleRow}>
                {positionSharingEnabled != null ? (
                  <View style={styles.titleLocationSlot}>
                    <Ionicons
                      accessibilityElementsHidden
                      importantForAccessibility="no"
                      name={positionSharingEnabled ? 'location' : 'location-outline'}
                      size={15}
                      color={positionSharingEnabled ? '#8FE8A5' : 'rgba(255, 255, 255, 0.62)'}
                    />
                  </View>
                ) : null}

                <Pressable
                  accessibilityLabel={[
                    title,
                    positionSharingLabel,
                    windDirectionDegrees == null
                      ? null
                      : `Vind ${Math.round(normalizeDegrees(windDirectionDegrees))} grader`,
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
                  style={styles.titlePressable}>
                  <Text
                    className="min-w-0 text-center text-[16px] font-semibold leading-[21px] text-white"
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.72}
                    style={[styles.floatingTitle, styles.titleText]}>
                    {title}
                  </Text>
                </Pressable>

                {windDirectionDegrees != null ? (
                  <View style={styles.titleWindSlot}>
                    <WindDirectionIndicator
                      degrees={windDirectionDegrees}
                      mapHeading={compassHeading ?? 0}
                    />
                  </View>
                ) : null}
              </View>

              {detailsExpanded ? (
                <Animated.View
                  entering={headerDetailsEntering}
                  exiting={headerDetailsExiting}
                  layout={headerSurfaceLayout}
                  style={styles.titleDetailsStack}>
                  {readinessLabel ? (
                    <Text className="text-center text-[11px] font-semibold leading-[14px] text-white/85">
                      {readinessLabel}
                    </Text>
                  ) : null}
                  {satLabel ? (
                    <Text
                      className="text-center text-[11px] font-semibold leading-[14px] text-white/85"
                      numberOfLines={1}>
                      {satLabel}
                    </Text>
                  ) : null}
                  {allowedGameLabel ? (
                    <Text
                      className="text-center text-[11px] font-semibold leading-[14px] text-white/85"
                      numberOfLines={1}>
                      {allowedGameLabel}
                    </Text>
                  ) : null}
                  {routeSummary ? <AssignmentRouteSummary {...routeSummary} /> : null}
                </Animated.View>
              ) : null}
            </GlassSurface>
          </Animated.View>
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
  compassButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(19, 23, 37, 0.92)',
    borderColor: 'rgba(143, 232, 165, 0.58)',
    borderRadius: 22,
    borderWidth: 1,
    height: GLASS_NAV_HEIGHT,
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    width: GLASS_NAV_HEIGHT,
  } satisfies ViewStyle,
  compassDial: {
    alignItems: 'center',
    backgroundColor: 'rgba(17, 20, 38, 0.98)',
    borderColor: 'rgba(112, 92, 207, 0.7)',
    borderRadius: 19,
    borderWidth: 2,
    height: 38,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 38,
  } satisfies ViewStyle,
  compassHeadingText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 19,
    textShadowColor: 'rgba(0, 0, 0, 0.42)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  } satisfies TextStyle,
  compassMajorTick: {
    backgroundColor: 'rgba(255, 255, 255, 0.68)',
    borderRadius: 999,
    height: 7,
    width: 1.5,
  } satisfies ViewStyle,
  compassNorthNeedle: {
    alignItems: 'center',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  } satisfies ViewStyle,
  compassNorthNeedleIcon: {
    transform: [{ translateY: -2 }],
  } satisfies TextStyle,
  compassTick: {
    backgroundColor: 'rgba(255, 255, 255, 0.32)',
    borderRadius: 999,
    height: 5,
    width: 1,
  } satisfies ViewStyle,
  compassTickRing: {
    alignItems: 'center',
    bottom: 0,
    left: 0,
    paddingTop: 4,
    position: 'absolute',
    right: 0,
    top: 0,
  } satisfies ViewStyle,
  windIndicator: {
    alignItems: 'center',
    backgroundColor: 'rgba(254, 253, 251, 0.18)',
    borderColor: 'rgba(254, 253, 251, 0.28)',
    borderRadius: 15,
    borderWidth: 1,
    flexShrink: 0,
    height: 30,
    justifyContent: 'center',
    width: 30,
  } satisfies ViewStyle,
  floatingTitle: {
    textShadowColor: 'rgba(0, 0, 0, 0.42)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  } satisfies TextStyle,
  leftControls: {
    alignItems: 'center',
    gap: 8,
    width: GLASS_NAV_HEIGHT,
  } satisfies ViewStyle,
  measurementHeaderRow: {
    alignItems: 'center',
    justifyContent: 'center',
  } satisfies ViewStyle,
  measurementSummaryRow: {
    alignItems: 'center',
    alignSelf: 'stretch',
    flexDirection: 'row',
    gap: 8,
    minHeight: 28,
  } satisfies ViewStyle,
  titleLocationSlot: {
    alignItems: 'center',
    height: 30,
    justifyContent: 'center',
    left: 1,
    position: 'absolute',
    width: 30,
    zIndex: 1,
  } satisfies ViewStyle,
  titleDetailsStack: {
    alignItems: 'center',
    alignSelf: 'stretch',
    gap: 2,
    marginTop: 2,
    minWidth: 0,
  } satisfies ViewStyle,
  titlePressable: {
    alignItems: 'center',
    alignSelf: 'stretch',
    flex: 1,
    justifyContent: 'center',
    minWidth: 0,
    paddingHorizontal: 36,
  } satisfies ViewStyle,
  titleRow: {
    alignItems: 'center',
    alignSelf: 'stretch',
    flexDirection: 'row',
    height: 32,
    justifyContent: 'center',
    minWidth: 0,
    position: 'relative',
  } satisfies ViewStyle,
  titleSurfaceFill: {
    height: '100%',
    width: '100%',
  } satisfies ViewStyle,
  titleSurfaceFrame: {
    maxWidth: '100%',
  } satisfies ViewStyle,
  titleText: {
    width: '100%',
  } satisfies TextStyle,
  titleWindSlot: {
    alignItems: 'center',
    height: 32,
    justifyContent: 'center',
    position: 'absolute',
    right: 0,
    width: 32,
    zIndex: 1,
  } satisfies ViewStyle,
  row: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: GLASS_NAV_HORIZONTAL_GAP,
    minHeight: GLASS_NAV_HEIGHT,
  } satisfies ViewStyle,
});
