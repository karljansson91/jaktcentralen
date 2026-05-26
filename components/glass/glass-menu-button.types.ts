import type Ionicons from '@expo/vector-icons/Ionicons';
import type { MenuAction, NativeActionEvent } from '@expo/ui/community/menu';
import type { ComponentProps } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

export type GlassMenuButtonIcon = ComponentProps<typeof Ionicons>['name'];

export type GlassMenuButtonProps = {
  accessibilityLabel: string;
  actions: MenuAction[];
  buttonSize?: number;
  className?: string;
  icon: GlassMenuButtonIcon;
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
