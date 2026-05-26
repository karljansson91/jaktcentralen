import { GlassMenuButton } from '@/components/glass/glass-menu-button';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useMapStylePicker } from '@/hooks/use-map-style-picker';
import { type MenuAction, type NativeActionEvent } from '@expo/ui/community/menu';
import { useMutation } from 'convex/react';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert } from 'react-native';

const ACTION_CREATE_HUNT = 'create-hunt';
const ACTION_REDRAW_AREA = 'redraw-area';
const ACTION_EDIT_AREA = 'edit-area';
const ACTION_MAP_STYLE = 'map-style';
const ACTION_DELETE_AREA = 'delete-area';

type AreaActionsMenuProps = {
  areaId: Id<'areas'>;
};

export function AreaActionsMenu({ areaId }: AreaActionsMenuProps) {
  const { push, replace } = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const removeArea = useMutation(api.areas.remove);
  const handleSelectMapStyle = useMapStylePicker();

  const handleDeleteArea = useCallback(async () => {
    setIsSubmitting(true);
    try {
      await removeArea({ areaId });
      replace('/');
    } catch (error) {
      Alert.alert(
        'Kunde inte ta bort område',
        error instanceof Error ? error.message : 'Försök igen om en stund.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [areaId, removeArea, replace]);

  const confirmDeleteArea = useCallback(() => {
    Alert.alert(
      'Ta bort område',
      'Området tas bort från startsidan, men jakter och historik sparas. Vill du fortsätta?',
      [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: 'Ta bort område',
          style: 'destructive',
          onPress: () => {
            void handleDeleteArea();
          },
        },
      ]
    );
  }, [handleDeleteArea]);

  const actions = useMemo<MenuAction[]>(
    () => [
      {
        attributes: { disabled: isSubmitting },
        id: ACTION_CREATE_HUNT,
        image: 'plus.circle',
        title: 'Skapa jakt',
      },
      {
        attributes: { disabled: isSubmitting },
        id: ACTION_REDRAW_AREA,
        image: 'pencil.and.outline',
        title: 'Rita om area',
      },
      {
        attributes: { disabled: isSubmitting },
        id: ACTION_EDIT_AREA,
        image: 'gearshape',
        title: 'Uppdatera info',
      },
      {
        attributes: { disabled: isSubmitting },
        id: ACTION_MAP_STYLE,
        image: 'map',
        title: 'Ändra kartvy',
      },
      {
        attributes: { destructive: true, disabled: isSubmitting },
        id: ACTION_DELETE_AREA,
        image: 'trash',
        title: 'Ta bort område',
      },
    ],
    [isSubmitting]
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
        case ACTION_DELETE_AREA:
          confirmDeleteArea();
          break;
      }
    },
    [areaId, confirmDeleteArea, handleSelectMapStyle, push]
  );

  return (
    <GlassMenuButton
      accessibilityLabel="Områdesåtgärder"
      actions={actions}
      icon="ellipsis-horizontal"
      onPressAction={handlePressAction}
      title="Områdesåtgärder"
    />
  );
}
