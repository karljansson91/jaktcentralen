import { GlassIconButton } from '@/components/glass/glass-icon-button';
import { GlassSurface } from '@/components/glass/glass-surface';
import { Text } from '@/components/ui';
import { cn } from '@/lib/utils';
import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { View, type TextStyle, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const GLASS_NAV_HEIGHT = 44;
const GLASS_NAV_TOP_GAP = 6;
const GLASS_NAV_HORIZONTAL_GAP = 8;
const GLASS_SCREEN_HEADER_BOTTOM_GAP = 14;
const FLOATING_HEADER_TINT = 'rgba(42, 108, 55, 0.84)';
const FLOATING_HEADER_OVERLAY = 'rgba(29, 95, 43, 0.22)';

type GlassTopNavProps = {
  appearance?: 'screen' | 'floating';
  className?: string;
  leftAccessibilityLabel?: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  onBack?: () => void;
  onRightPress?: () => void;
  rightAccessibilityLabel?: string;
  rightAccessory?: ReactNode;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  renderRightAccessory?: () => ReactNode;
  title: string;
  titleBackground?: boolean;
};

function getGlassHeaderTop(topInset: number) {
  return Math.max(topInset, 8) + GLASS_NAV_TOP_GAP;
}

export function useGlassHeaderSpacing() {
  const insets = useSafeAreaInsets();

  return {
    headerTop: getGlassHeaderTop(insets.top),
    insets,
  };
}

export function GlassTopNav({
  appearance = 'screen',
  className,
  leftAccessibilityLabel = 'Gå tillbaka',
  leftIcon = 'chevron-back',
  onBack,
  onRightPress,
  rightAccessibilityLabel = 'Fler alternativ',
  rightAccessory,
  rightIcon = 'ellipsis-horizontal',
  renderRightAccessory,
  title,
  titleBackground,
}: GlassTopNavProps) {
  const isFloating = appearance === 'floating';
  const shouldShowTitleBackground = titleBackground ?? isFloating;
  const titleClassName = isFloating ? 'text-white' : 'text-foreground';
  const titleContent = (
    <Text
      className={cn('text-center text-[16px] font-semibold leading-[21px]', titleClassName)}
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.72}
      style={isFloating ? floatingTitleStyle : undefined}>
      {title}
    </Text>
  );

  const rowContent = (
    <>
      {onBack ? (
        <GlassIconButton
          icon={leftIcon}
          iconSize={21}
          onPress={onBack}
          accessibilityLabel={leftAccessibilityLabel}
          surfaceClassName="size-11"
        />
      ) : (
        <View style={{ width: GLASS_NAV_HEIGHT }} />
      )}

      <View className="min-w-0 flex-1 items-center justify-center px-2">
        {shouldShowTitleBackground ? (
          <GlassSurface
            tone={isFloating ? 'dark' : 'light'}
            overlayColor={isFloating ? FLOATING_HEADER_OVERLAY : undefined}
            tintColor={isFloating ? FLOATING_HEADER_TINT : undefined}
            className="h-10 max-w-full rounded-full"
            contentClassName="h-full items-center justify-center px-5">
            {titleContent}
          </GlassSurface>
        ) : (
          titleContent
        )}
      </View>

      {renderRightAccessory ? (
        renderRightAccessory()
      ) : rightAccessory ? (
        rightAccessory
      ) : onRightPress ? (
        <GlassIconButton
          icon={rightIcon}
          iconSize={21}
          onPress={onRightPress}
          accessibilityLabel={rightAccessibilityLabel}
          surfaceClassName="size-11"
        />
      ) : (
        <View style={{ width: GLASS_NAV_HEIGHT }} />
      )}
    </>
  );

  return (
    <View className={cn('w-full', className)}>
      <View style={glassTopNavRowStyle}>{rowContent}</View>
    </View>
  );
}

const glassTopNavRowStyle: ViewStyle = {
  alignItems: 'center',
  flexDirection: 'row',
  gap: GLASS_NAV_HORIZONTAL_GAP,
};

const floatingTitleStyle: TextStyle = {
  textShadowColor: 'rgba(0, 0, 0, 0.42)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 8,
};

type GlassScreenHeaderProps = GlassTopNavProps;

export function GlassScreenHeader(props: GlassScreenHeaderProps) {
  const { headerTop } = useGlassHeaderSpacing();

  return (
    <View
      className="z-20 px-4"
      style={{ paddingBottom: GLASS_SCREEN_HEADER_BOTTOM_GAP, paddingTop: headerTop }}>
      <GlassTopNav {...props} />
    </View>
  );
}
