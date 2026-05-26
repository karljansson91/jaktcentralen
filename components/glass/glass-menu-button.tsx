import { GlassSurface } from '@/components/glass/glass-surface';
import { APP_COLORS } from '@/lib/theme';
import { cn } from '@/lib/utils';
import { Ionicons } from '@expo/vector-icons';
import { MenuView, type MenuAction, type NativeActionEvent } from '@expo/ui/community/menu';
import { View, type StyleProp, type ViewStyle } from 'react-native';

type GlassMenuButtonProps = {
  accessibilityLabel: string;
  actions: MenuAction[];
  className?: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconSize?: number;
  onPressAction?: (event: NativeActionEvent) => void;
  overlayColor?: string;
  shouldOpenOnLongPress?: boolean;
  style?: StyleProp<ViewStyle>;
  surfaceClassName?: string;
  tintColor?: string;
  title: string;
  tone?: 'light' | 'dark';
};

export function GlassMenuButton({
  accessibilityLabel,
  actions,
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
        className={cn('size-11', className)}>
        <GlassSurface
          interactive
          overlayColor={overlayColor}
          tone={tone}
          tintColor={tintColor}
          className={cn('size-11 rounded-full', surfaceClassName)}
          contentClassName="h-full w-full items-center justify-center"
          style={style}>
          <Ionicons name={icon} size={iconSize} color={iconColor} />
        </GlassSurface>
      </View>
    </MenuView>
  );
}
