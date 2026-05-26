import { GlassSurface } from '@/components/glass/glass-surface';
import type { GlassMenuButtonProps } from '@/components/glass/glass-menu-button.types';
import { APP_COLORS } from '@/lib/theme';
import { cn } from '@/lib/utils';
import { Ionicons } from '@expo/vector-icons';
import { MenuView } from '@expo/ui/community/menu';
import { View } from 'react-native';

export function GlassMenuButton({
  accessibilityLabel,
  actions,
  buttonSize,
  className,
  icon,
  iconSize = 21,
  onPressAction,
  overlayColor,
  shouldOpenOnLongPress = false,
  style,
  surfaceClassName,
  tintColor,
  title,
  tone = 'light',
}: GlassMenuButtonProps) {
  const iconColor = tone === 'dark' ? APP_COLORS.surface : APP_COLORS.text;
  const buttonSizeStyle = buttonSize ? { height: buttonSize, width: buttonSize } : undefined;

  return (
    <MenuView
      actions={actions}
      onPressAction={onPressAction}
      shouldOpenOnLongPress={shouldOpenOnLongPress}
      title={title}>
      <View
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        accessible
        className={cn(buttonSize ? undefined : 'size-11', className)}
        style={buttonSizeStyle}>
        <GlassSurface
          interactive
          overlayColor={overlayColor}
          tone={tone}
          tintColor={tintColor}
          className={cn(buttonSize ? 'rounded-full' : 'size-11 rounded-full', surfaceClassName)}
          contentClassName="h-full w-full items-center justify-center"
          style={buttonSizeStyle ? [buttonSizeStyle, style] : style}>
          <Ionicons name={icon} size={iconSize} color={iconColor} />
        </GlassSurface>
      </View>
    </MenuView>
  );
}
