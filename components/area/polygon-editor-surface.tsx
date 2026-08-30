import type { PolygonEditorController } from '@/hooks/use-polygon-editor';
import type { ReactNode } from 'react';
import { View } from 'react-native';

type PolygonEditorSurfaceProps = {
  children: ReactNode;
  editor: PolygonEditorController | null;
};

export function PolygonEditorSurface({ children, editor }: PolygonEditorSurfaceProps) {
  const freehandEditor = editor?.isFreehandMode ? editor : null;
  const pointEditor = editor && !editor.isFreehandMode ? editor : null;

  return (
    <View
      style={{ flex: 1 }}
      onMoveShouldSetResponderCapture={freehandEditor?.handleShouldSetResponder}
      onResponderGrant={freehandEditor?.handleTouchStart}
      onResponderMove={freehandEditor?.handleTouchMove}
      onResponderRelease={freehandEditor?.handleTouchEnd}
      onResponderTerminate={freehandEditor?.handleTouchEnd}
      onTouchStart={pointEditor?.handleTouchStart}
      onTouchMove={pointEditor?.handleTouchMove}
      onTouchEnd={pointEditor?.handleTouchEnd}
      onTouchCancel={pointEditor?.handleTouchEnd}
    >
      {children}
    </View>
  );
}
