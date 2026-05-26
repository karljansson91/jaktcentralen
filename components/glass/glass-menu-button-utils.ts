import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

export function resolveGlassMenuButtonSize(
  buttonSize: number | undefined,
  style: StyleProp<ViewStyle>
) {
  const flattenedStyle = StyleSheet.flatten(style);
  const styleWidth = typeof flattenedStyle?.width === 'number' ? flattenedStyle.width : null;
  const styleHeight = typeof flattenedStyle?.height === 'number' ? flattenedStyle.height : null;

  return buttonSize ?? (Math.max(styleWidth ?? 0, styleHeight ?? 0) || 44);
}
