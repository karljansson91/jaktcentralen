import { GlassIconButton } from '@/components/glass/glass-icon-button';
import { GlassSurface } from '@/components/glass/glass-surface';
import { Text } from '@/components/ui';
import { cn } from '@/lib/utils';
import { Ionicons } from '@expo/vector-icons';
import { GlassContainer } from 'expo-glass-effect';
import { View, type TextStyle, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const GLASS_NAV_HEIGHT = 44;
const GLASS_NAV_TOP_GAP = 6;
const GLASS_NAV_HORIZONTAL_GAP = 8;
const GLASS_SCREEN_HEADER_BOTTOM_GAP = 14;

type GlassTopNavProps = {
  appearance?: 'screen' | 'floating';
  className?: string;
  leftAccessibilityLabel?: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  onBack?: () => void;
  onRightPress?: () => void;
  rightAccessibilityLabel?: string;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  title: string;
  titleBackground?: boolean;
};

export function getGlassHeaderTop(topInset: number) {
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
  rightIcon = 'ellipsis-horizontal',
  title,
  titleBackground = false,
}: GlassTopNavProps) {
  const isFloating = appearance === 'floating';
  const buttonTone = isFloating ? 'dark' : 'light';
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

  return (
    <View className={cn('w-full', className)}>
      <GlassContainer spacing={GLASS_NAV_HORIZONTAL_GAP} style={glassTopNavRowStyle}>
        {onBack ? (
          <GlassIconButton
            icon={leftIcon}
            iconSize={21}
            onPress={onBack}
            accessibilityLabel={leftAccessibilityLabel}
            surfaceClassName="h-11 w-11"
            tone={buttonTone}
          />
        ) : (
          <View style={{ width: GLASS_NAV_HEIGHT }} />
        )}

        <View className="min-w-0 flex-1 items-center justify-center px-2">
          {titleBackground ? (
            <GlassSurface
              tone={buttonTone}
              className="h-10 max-w-full rounded-full"
              contentClassName="h-full items-center justify-center px-5">
              {titleContent}
            </GlassSurface>
          ) : (
            titleContent
          )}
        </View>

        {onRightPress ? (
          <GlassIconButton
            icon={rightIcon}
            iconSize={21}
            onPress={onRightPress}
            accessibilityLabel={rightAccessibilityLabel}
            surfaceClassName="h-11 w-11"
            tone={buttonTone}
          />
        ) : (
          <View style={{ width: GLASS_NAV_HEIGHT }} />
        )}
      </GlassContainer>
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
