import { GlassSurface } from '@/components/glass/glass-surface';
import { APP_COLORS } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { MenuView, type MenuAction, type NativeActionEvent } from '@expo/ui/community/menu';
import { useCallback, useMemo } from 'react';
import { View } from 'react-native';

const ACTION_LOCATE = 'locate';
const ACTION_TOGGLE_ROUTE = 'toggle-route';
const ACTION_TOGGLE_OTHER_POSITIONS = 'toggle-other-positions';
const ACTION_TOGGLE_OWN_SHARING = 'toggle-own-sharing';
const ACTION_MARK_IN_POSITION = 'mark-in-position';
const ACTION_CLEAR_IN_POSITION = 'clear-in-position';

type HuntMapToolsMenuProps = {
  inPosition: {
    available: boolean;
    marked: boolean;
    onClear: () => void;
    onMark: () => void;
  };
  onLocate: () => void;
  positions: {
    onToggleOthers: () => void;
    onToggleOwnSharing: () => void;
    ownSharingEnabled: boolean;
    showOthers: boolean;
  };
  route: {
    available: boolean;
    onToggle: () => void;
    visible: boolean;
  };
};

export function HuntMapToolsMenu({
  inPosition,
  onLocate,
  positions,
  route,
}: HuntMapToolsMenuProps) {
  const {
    available: inPositionAvailable,
    marked: inPositionMarked,
    onClear,
    onMark,
  } = inPosition;
  const {
    onToggleOthers,
    onToggleOwnSharing,
    ownSharingEnabled,
    showOthers,
  } = positions;
  const { available: routeAvailable, onToggle: onToggleRoute, visible: routeVisible } = route;

  const actions = useMemo<MenuAction[]>(
    () => [
      {
        id: ACTION_LOCATE,
        image: 'location',
        title: 'Centrera på mig',
      },
      {
        attributes: { hidden: !routeAvailable },
        id: ACTION_TOGGLE_ROUTE,
        image: 'point.topleft.down.curvedto.point.bottomright.up',
        state: routeVisible ? 'on' : 'off',
        title: 'Visa väg till pass',
      },
      {
        id: ACTION_TOGGLE_OTHER_POSITIONS,
        image: 'person.2',
        state: showOthers ? 'on' : 'off',
        title: 'Visa andras positioner',
      },
      {
        id: ACTION_TOGGLE_OWN_SHARING,
        image: ownSharingEnabled ? 'location.fill' : 'location.slash',
        state: ownSharingEnabled ? 'on' : 'off',
        title: 'Dela min position',
      },
      {
        attributes: { hidden: !inPositionAvailable },
        id: inPositionMarked ? ACTION_CLEAR_IN_POSITION : ACTION_MARK_IN_POSITION,
        image: inPositionMarked ? 'xmark.circle' : 'checkmark.circle',
        title: inPositionMarked ? 'Ta bort på plats' : 'Markera mig på plats',
      },
    ],
    [
      inPositionAvailable,
      inPositionMarked,
      ownSharingEnabled,
      routeAvailable,
      routeVisible,
      showOthers,
    ]
  );

  const handlePressAction = useCallback(
    (event: NativeActionEvent) => {
      switch (event.nativeEvent.event) {
        case ACTION_LOCATE:
          onLocate();
          break;
        case ACTION_TOGGLE_ROUTE:
          onToggleRoute();
          break;
        case ACTION_TOGGLE_OTHER_POSITIONS:
          onToggleOthers();
          break;
        case ACTION_TOGGLE_OWN_SHARING:
          onToggleOwnSharing();
          break;
        case ACTION_MARK_IN_POSITION:
          onMark();
          break;
        case ACTION_CLEAR_IN_POSITION:
          onClear();
          break;
      }
    },
    [
      onLocate,
      onClear,
      onMark,
      onToggleOthers,
      onToggleOwnSharing,
      onToggleRoute,
    ]
  );

  return (
    <MenuView
      actions={actions}
      onPressAction={handlePressAction}
      shouldOpenOnLongPress={false}
      title="Kartverktyg">
      <View
        accessibilityLabel="Kartverktyg"
        accessibilityRole="button"
        accessible
        className="size-14">
        <GlassSurface
          tone="dark"
          className="size-14 rounded-full"
          contentClassName="h-full w-full items-center justify-center">
          <Ionicons name="locate" size={24} color={APP_COLORS.surface} />
        </GlassSurface>
      </View>
    </MenuView>
  );
}
