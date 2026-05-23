import { GlassSurface } from '@/components/glass/glass-surface';
import { APP_COLORS } from '@/lib/theme';
import { cn } from '@/lib/utils';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

type GlassIconButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  className?: string;
  color?: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconSize?: number;
  surfaceClassName?: string;
  style?: StyleProp<ViewStyle>;
  tone?: 'light' | 'dark';
};

export function GlassIconButton({
  className,
  color,
  disabled,
  icon,
  iconSize = 22,
  surfaceClassName,
  style,
  tone = 'light',
  ...props
}: GlassIconButtonProps) {
  const iconColor = color ?? (tone === 'dark' ? APP_COLORS.surface : APP_COLORS.text);

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      hitSlop={8}
      className={cn(disabled && 'opacity-50', className)}
      {...props}>
      {({ pressed }) => (
        <GlassSurface
          interactive={!disabled}
          tone={tone}
          className={cn('h-12 w-12 rounded-full', surfaceClassName)}
          contentClassName="h-full w-full items-center justify-center"
          style={[
            pressed && !disabled ? { transform: [{ scale: 1.07 }] } : null,
            style,
          ]}>
          <Ionicons name={icon} size={iconSize} color={iconColor} />
        </GlassSurface>
      )}
    </Pressable>
  );
}

export function GlassFloatingButton({ surfaceClassName, ...props }: GlassIconButtonProps) {
  return (
    <GlassIconButton
      iconSize={24}
      surfaceClassName={cn('h-14 w-14', surfaceClassName)}
      {...props}
    />
  );
}
