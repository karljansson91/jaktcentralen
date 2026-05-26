import { GlassMenuButton } from '@/components/glass/glass-menu-button';
import { Id } from '@/convex/_generated/dataModel';
import { useMapStylePicker } from '@/hooks/use-map-style-picker';
import { type MenuAction, type NativeActionEvent } from '@expo/ui/community/menu';
import { useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';

const ACTION_CREATE_HUNT = 'create-hunt';
const ACTION_REDRAW_AREA = 'redraw-area';
const ACTION_EDIT_AREA = 'edit-area';
const ACTION_MAP_STYLE = 'map-style';

const FLOATING_HEADER_TINT = 'rgba(42, 108, 55, 0.84)';
const FLOATING_HEADER_OVERLAY = 'rgba(29, 95, 43, 0.22)';

type AreaActionsMenuProps = {
  areaId: Id<'areas'>;
};

export function AreaActionsMenu({ areaId }: AreaActionsMenuProps) {
  const { push } = useRouter();
  const handleSelectMapStyle = useMapStylePicker();

  const actions = useMemo<MenuAction[]>(
    () => [
      {
        id: ACTION_CREATE_HUNT,
        image: 'plus.circle',
        title: 'Skapa jakt',
      },
      {
        id: ACTION_REDRAW_AREA,
        image: 'pencil.and.outline',
        title: 'Rita om area',
      },
      {
        id: ACTION_EDIT_AREA,
        image: 'gearshape',
        title: 'Uppdatera info',
      },
      {
        id: ACTION_MAP_STYLE,
        image: 'map',
        title: 'Ändra kartvy',
      },
    ],
    []
  );

  const handlePressAction = useCallback(
    (event: NativeActionEvent) => {
      switch (event.nativeEvent.event) {
        case ACTION_CREATE_HUNT:
          push(`/area/${areaId}/event/create`);
          break;
        case ACTION_REDRAW_AREA:
          push(`/area/${areaId}/redraw`);
          break;
        case ACTION_EDIT_AREA:
          push(`/area/${areaId}/edit`);
          break;
        case ACTION_MAP_STYLE:
          handleSelectMapStyle();
          break;
      }
    },
    [areaId, handleSelectMapStyle, push]
  );

  return (
    <GlassMenuButton
      accessibilityLabel="Områdesåtgärder"
      actions={actions}
      icon="ellipsis-horizontal"
      onPressAction={handlePressAction}
      overlayColor={FLOATING_HEADER_OVERLAY}
      tintColor={FLOATING_HEADER_TINT}
      title="Områdesåtgärder"
      tone="dark"
    />
  );
}
