import type {
  GlassMenuButtonIcon,
  GlassMenuButtonProps,
} from '@/components/glass/glass-menu-button.types';
import { APP_COLORS } from '@/lib/theme';
import { type MenuAction, type NativeActionEvent } from '@expo/ui/community/menu';
import { Button, Host, Menu, Section, Toggle } from '@expo/ui/swift-ui';
import {
  accessibilityLabel as accessibilityLabelModifier,
  buttonStyle,
  controlSize,
  disabled as disabledModifier,
  foregroundColor as foregroundColorModifier,
  frame,
  labelStyle,
  tint as tintModifier,
  type ViewModifier,
} from '@expo/ui/swift-ui/modifiers';
import type { ReactNode } from 'react';
import { StyleSheet, type ColorValue, type StyleProp, type ViewStyle } from 'react-native';
import type { SFSymbol } from 'sf-symbols-typescript';

function actionId(action: MenuAction): string {
  return action.id ?? action.title;
}

function makeEvent(action: MenuAction): NativeActionEvent {
  return { nativeEvent: { event: actionId(action) } };
}

function colorValueToString(color: ColorValue): string | undefined {
  return typeof color === 'string' ? color : undefined;
}

function renderAction(
  action: MenuAction,
  onPressAction: GlassMenuButtonProps['onPressAction']
): ReactNode {
  if (action.attributes?.hidden) {
    return null;
  }

  const { subactions, displayInline, state, attributes, image, imageColor, title } = action;
  const key = actionId(action);
  const systemImage = typeof image === 'string' ? image : undefined;
  const tintColor = imageColor ? colorValueToString(imageColor) : undefined;
  const fire = () => onPressAction?.(makeEvent(action));

  if (subactions && subactions.length > 0) {
    const children = subactions.map((subaction) => renderAction(subaction, onPressAction));

    if (displayInline) {
      return (
        <Section key={key} title={title}>
          {children}
        </Section>
      );
    }

    return (
      <Menu key={key} label={title} systemImage={systemImage}>
        {children}
      </Menu>
    );
  }

  const modifiers: ViewModifier[] = [];
  if (attributes?.disabled) {
    modifiers.push(disabledModifier(true));
  }

  if (state === 'on' || state === 'off') {
    if (tintColor) {
      modifiers.push(tintModifier(tintColor));
    }

    return (
      <Toggle
        key={key}
        label={title}
        systemImage={systemImage}
        isOn={state === 'on'}
        onIsOnChange={fire}
        modifiers={modifiers.length > 0 ? modifiers : undefined}
      />
    );
  }

  if (tintColor && !attributes?.destructive) {
    modifiers.push(foregroundColorModifier(tintColor));
  }

  return (
    <Button
      key={key}
      label={title}
      systemImage={systemImage}
      role={attributes?.destructive ? 'destructive' : undefined}
      modifiers={modifiers.length > 0 ? modifiers : undefined}
      onPress={fire}
    />
  );
}

const ICON_TO_SF_SYMBOL: Partial<Record<GlassMenuButtonIcon, SFSymbol>> = {
  'ellipsis-horizontal': 'ellipsis',
  'ellipsis-vertical': 'ellipsis',
  'map-outline': 'map',
};

function resolvedButtonSize(buttonSize: number | undefined, style: StyleProp<ViewStyle>) {
  const flattenedStyle = StyleSheet.flatten(style);
  const styleWidth = typeof flattenedStyle?.width === 'number' ? flattenedStyle.width : null;
  const styleHeight = typeof flattenedStyle?.height === 'number' ? flattenedStyle.height : null;

  return buttonSize ?? (Math.max(styleWidth ?? 0, styleHeight ?? 0) || 44);
}

export function GlassMenuButton({
  accessibilityLabel,
  actions,
  buttonSize: explicitButtonSize,
  className: _className,
  icon,
  iconSize = 21,
  onPressAction,
  overlayColor: _overlayColor,
  shouldOpenOnLongPress: _shouldOpenOnLongPress = false,
  style,
  surfaceClassName: _surfaceClassName,
  tintColor,
  title,
  tone = 'light',
}: GlassMenuButtonProps) {
  const size = resolvedButtonSize(explicitButtonSize, style);
  const systemImage = ICON_TO_SF_SYMBOL[icon] ?? 'ellipsis';
  const iconTint = tintColor ?? (tone === 'dark' ? APP_COLORS.surface : APP_COLORS.text);
  const control = iconSize >= 24 || size >= 56 ? 'large' : 'regular';
  const items = actions.map((action) => renderAction(action, onPressAction));
  const body = title ? <Section title={title}>{items}</Section> : items;

  return (
    <Host matchContents style={[{ height: size, width: size }, style]}>
      <Menu
        label={accessibilityLabel}
        systemImage={systemImage}
        modifiers={[
          buttonStyle('glass'),
          controlSize(control),
          labelStyle('iconOnly'),
          frame({ height: size, width: size }),
          tintModifier(iconTint),
          accessibilityLabelModifier(accessibilityLabel),
        ]}>
        {body}
      </Menu>
    </Host>
  );
}
