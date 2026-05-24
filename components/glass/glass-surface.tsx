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
  overlayColor?: string;
  tone?: 'light' | 'dark';
  tintColor?: string;
};

const canUseLiquidGlass =
  Platform.OS === 'ios' && isLiquidGlassAvailable() && isGlassEffectAPIAvailable();

export function GlassSurface({
  children,
  className,
  contentClassName,
  fallbackIntensity = 72,
  fallbackTint,
  glassEffectStyle = 'regular',
  interactive = false,
  overlayColor,
  style,
  tone = 'light',
  tintColor,
  ...props
}: GlassSurfaceProps) {
  const isDark = tone === 'dark';
  const resolvedFallbackTint =
    fallbackTint ?? (isDark ? 'systemThinMaterialDark' : 'systemThinMaterial');

  if (canUseLiquidGlass) {
    const resolvedTintColor =
      tintColor ?? (isDark ? 'rgba(42, 108, 55, 0.68)' : 'rgba(252, 248, 242, 0.34)');

    return (
      <BetterGlassView
        collapsable={false}
        isInteractive={interactive}
        tintColor={resolvedTintColor}
        colorScheme={isDark ? 'dark' : 'light'}
        glassEffectStyle={glassEffectStyle}
        style={[glassSurfaceStyle, getNativeGlassClassStyle(className), style]}
        {...props}>
        {overlayColor ? (
          <View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, { backgroundColor: overlayColor }]}
          />
        ) : null}
        <View className={cn('relative', contentClassName)}>{children}</View>
      </BetterGlassView>
    );
  }

  return (
    <View
      className={cn(
        'overflow-hidden border',
        isDark
          ? 'border-white/25 bg-primary/80'
          : 'border-white/45 bg-card/65',
        className
      )}
      style={[isDark ? darkSurfaceStyle : lightSurfaceStyle, style]}
      {...props}>
      <BlurView
        pointerEvents="none"
        tint={resolvedFallbackTint}
        intensity={fallbackIntensity}
        style={StyleSheet.absoluteFill}
      />
      {overlayColor ? (
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: overlayColor }]}
        />
      ) : null}
      <View className={cn('relative', contentClassName)}>{children}</View>
    </View>
  );
}

const glassSurfaceStyle: ViewStyle = {
  overflow: 'hidden',
  position: 'relative',
};

type GlassViewNativeShapeProps = GlassViewProps & {
  borderBottomLeftRadius?: number;
  borderBottomRightRadius?: number;
  borderBottomStartRadius?: number;
  borderBottomEndRadius?: number;
  borderCurve?: string;
  borderRadius?: number;
  borderTopLeftRadius?: number;
  borderTopRightRadius?: number;
  borderTopStartRadius?: number;
  borderTopEndRadius?: number;
};

function BetterGlassView({ style, tintColor, ...props }: GlassViewProps) {
  const flattenedStyle = StyleSheet.flatten(style) as ViewStyle | undefined;

  if (!flattenedStyle) {
    return <GlassView tintColor={tintColor} style={style} {...props} />;
  }

  const {
    backgroundColor,
    borderBottomEndRadius,
    borderBottomLeftRadius,
    borderBottomRightRadius,
    borderBottomStartRadius,
    borderCurve,
    borderRadius,
    borderTopEndRadius,
    borderTopLeftRadius,
    borderTopRightRadius,
    borderTopStartRadius,
    ...styleWithoutMovedProps
  } = flattenedStyle;

  const shapeProps: GlassViewNativeShapeProps = {
    borderBottomEndRadius: getNumericStyleValue(borderBottomEndRadius),
    borderBottomLeftRadius: getNumericStyleValue(borderBottomLeftRadius),
    borderBottomRightRadius: getNumericStyleValue(borderBottomRightRadius),
    borderBottomStartRadius: getNumericStyleValue(borderBottomStartRadius),
    borderCurve: typeof borderCurve === 'string' ? borderCurve : undefined,
    borderRadius: getNumericStyleValue(borderRadius),
    borderTopEndRadius: getNumericStyleValue(borderTopEndRadius),
    borderTopLeftRadius: getNumericStyleValue(borderTopLeftRadius),
    borderTopRightRadius: getNumericStyleValue(borderTopRightRadius),
    borderTopStartRadius: getNumericStyleValue(borderTopStartRadius),
  };

  return (
    <GlassView
      tintColor={tintColor ?? (typeof backgroundColor === 'string' ? backgroundColor : undefined)}
      style={styleWithoutMovedProps}
      {...shapeProps}
      {...props}
    />
  );
}

function getNumericStyleValue(value: unknown) {
  return typeof value === 'number' ? value : undefined;
}

function getNativeGlassClassStyle(className: string | undefined): ViewStyle | undefined {
  if (!className) {
    return undefined;
  }

  const style: ViewStyle = {};
  const sizeMatch = getLastClassMatch(className, /\bsize-(10|11|12|14|16)\b/g);
  const heightMatch = getLastClassMatch(className, /\bh-(10|11|12|14)\b/g);
  const widthMatch = getLastClassMatch(className, /\bw-(10|11|12|14)\b/g);
  const roundedPixelMatch = className.match(/\brounded-\[(\d+)px\]/);

  if (sizeMatch) {
    const size = Number(sizeMatch[1]) * 4;
    style.height = size;
    style.width = size;
  }
  if (heightMatch) {
    style.height = Number(heightMatch[1]) * 4;
  }
  if (widthMatch) {
    style.width = Number(widthMatch[1]) * 4;
  }
  if (roundedPixelMatch) {
    style.borderRadius = Number(roundedPixelMatch[1]);
  } else if (className.includes('rounded-full')) {
    if (typeof style.height === 'number' && typeof style.width === 'number') {
      style.borderRadius = Math.min(style.height, style.width) / 2;
    } else if (typeof style.height === 'number') {
      style.borderRadius = style.height / 2;
    } else if (typeof style.width === 'number') {
      style.borderRadius = style.width / 2;
    } else {
      style.borderRadius = 9999;
    }
  } else if (className.includes('rounded-xl')) {
    style.borderRadius = 12;
  }

  return Object.keys(style).length > 0 ? style : undefined;
}

function getLastClassMatch(className: string, pattern: RegExp) {
  let lastMatch: RegExpMatchArray | undefined;

  for (const match of className.matchAll(pattern)) {
    lastMatch = match;
  }

  return lastMatch;
}

const lightSurfaceStyle: ViewStyle = {
  backgroundColor: 'rgba(252, 248, 242, 0.52)',
};

const darkSurfaceStyle: ViewStyle = {
  backgroundColor: 'rgba(42, 108, 55, 0.82)',
};
