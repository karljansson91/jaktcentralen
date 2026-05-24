import { cn } from '@/lib/utils';
import { BlurView, type BlurViewProps } from 'expo-blur';
import {
  GlassView,
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
  type GlassViewProps,
} from 'expo-glass-effect';
import { Platform, StyleSheet, View, type ViewProps, type ViewStyle } from 'react-native';

type GlassSurfaceProps = ViewProps & {
  className?: string;
  contentClassName?: string;
  fallbackIntensity?: BlurViewProps['intensity'];
  fallbackTint?: BlurViewProps['tint'];
  glassEffectStyle?: GlassViewProps['glassEffectStyle'];
  interactive?: boolean;
  tone?: 'light' | 'dark';
  tintColor?: string;
};

const canUseLiquidGlass =
  Platform.OS === 'ios' && isLiquidGlassAvailable() && isGlassEffectAPIAvailable();

export { canUseLiquidGlass };

export function GlassSurface({
  children,
  className,
  contentClassName,
  fallbackIntensity = 72,
  fallbackTint,
  glassEffectStyle = 'regular',
  interactive = false,
  style,
  tone = 'light',
  tintColor,
  ...props
}: GlassSurfaceProps) {
  const isDark = tone === 'dark';
  const resolvedFallbackTint =
    fallbackTint ?? (isDark ? 'systemThinMaterialDark' : 'systemThinMaterial');
  const resolvedTintColor =
    tintColor ?? (isDark ? 'rgba(26, 28, 38, 0.62)' : 'rgba(252, 248, 242, 0.68)');

  return (
    <View
      className={cn(
        'overflow-hidden border',
        isDark
          ? 'border-white/15 bg-[#1A1C26]/60'
          : 'border-white/45 bg-card/65',
        className
      )}
      style={[isDark ? darkSurfaceStyle : lightSurfaceStyle, style]}
      {...props}>
      {canUseLiquidGlass ? (
        <GlassView
          pointerEvents="none"
          isInteractive={interactive}
          tintColor={resolvedTintColor}
          glassEffectStyle={glassEffectStyle}
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <BlurView
          pointerEvents="none"
          tint={resolvedFallbackTint}
          intensity={fallbackIntensity}
          style={StyleSheet.absoluteFill}
        />
      )}
      <View className={cn('relative', contentClassName)}>{children}</View>
    </View>
  );
}

const lightSurfaceStyle: ViewStyle = {
  backgroundColor: 'rgba(252, 248, 242, 0.52)',
};

const darkSurfaceStyle: ViewStyle = {
  backgroundColor: 'rgba(26, 28, 38, 0.72)',
};
