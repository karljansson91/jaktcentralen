import { GlassMenuButton } from '@/components/glass/glass-menu-button';
import { type MenuAction, type NativeActionEvent } from '@expo/ui/community/menu';
import { useCallback, useMemo } from 'react';

const ACTION_MARK_IN_POSITION = 'mark-in-position';
const ACTION_CLEAR_IN_POSITION = 'clear-in-position';
const ACTION_TOGGLE_OWN_SHARING = 'toggle-own-sharing';
const ACTION_TOGGLE_OTHER_POSITIONS = 'toggle-other-positions';
const ACTION_SET_SCENT_DIRECTION = 'set-scent-direction';
const ACTION_CLEAR_SCENT_DIRECTION = 'clear-scent-direction';
const ACTION_TOGGLE_ROUTE = 'toggle-route';
const ACTION_LOCATE = 'locate';

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
  scent: {
    hasDirection: boolean;
    isSetting: boolean;
    onClear: () => void;
    onSet: () => void;
  };
};

export function HuntMapToolsMenu({
  inPosition,
  onLocate,
  positions,
  route,
  scent,
}: HuntMapToolsMenuProps) {
  const actions = useMemo<MenuAction[]>(
    () => [
      {
        attributes: { hidden: !inPosition.available },
        id: inPosition.marked ? ACTION_CLEAR_IN_POSITION : ACTION_MARK_IN_POSITION,
        image: inPosition.marked ? 'xmark.circle' : 'checkmark.circle',
        title: inPosition.marked ? 'Ta bort på plats' : 'Markera mig på plats',
      },
      {
        id: ACTION_TOGGLE_OWN_SHARING,
        image: positions.ownSharingEnabled ? 'location.north.fill' : 'location.north',
        state: positions.ownSharingEnabled ? 'on' : 'off',
        title: 'Dela min position',
      },
      {
        id: ACTION_TOGGLE_OTHER_POSITIONS,
        image: 'person.2',
        state: positions.showOthers ? 'on' : 'off',
        title: 'Visa andras positioner',
      },
      {
        id: ACTION_SET_SCENT_DIRECTION,
        image: 'wind',
        state: scent.isSetting || scent.hasDirection ? 'on' : 'off',
        title: scent.hasDirection ? 'Ändra vindriktning' : 'Sätt vindriktning',
      },
      {
        attributes: { hidden: !scent.hasDirection },
        id: ACTION_CLEAR_SCENT_DIRECTION,
        image: 'xmark.circle',
        title: 'Rensa vindriktning',
      },
      {
        attributes: { hidden: !route.available },
        id: ACTION_TOGGLE_ROUTE,
        image: 'figure.walk',
        state: route.visible ? 'on' : 'off',
        title: 'Visa väg till pass',
      },
      {
        id: ACTION_LOCATE,
        image: 'scope',
        title: 'Centrera på mig',
      },
    ],
    [
      inPosition.available,
      inPosition.marked,
      positions.ownSharingEnabled,
      positions.showOthers,
      route.available,
      route.visible,
      scent.hasDirection,
      scent.isSetting,
    ],
  );

  const handlePressAction = useCallback(
    (event: NativeActionEvent) => {
      switch (event.nativeEvent.event) {
        case ACTION_MARK_IN_POSITION:
          requestAnimationFrame(inPosition.onMark);
          break;
        case ACTION_CLEAR_IN_POSITION:
          requestAnimationFrame(inPosition.onClear);
          break;
        case ACTION_TOGGLE_OWN_SHARING:
          requestAnimationFrame(positions.onToggleOwnSharing);
          break;
        case ACTION_TOGGLE_OTHER_POSITIONS:
          requestAnimationFrame(positions.onToggleOthers);
          break;
        case ACTION_SET_SCENT_DIRECTION:
          requestAnimationFrame(scent.onSet);
          break;
        case ACTION_CLEAR_SCENT_DIRECTION:
          requestAnimationFrame(scent.onClear);
          break;
        case ACTION_TOGGLE_ROUTE:
          requestAnimationFrame(route.onToggle);
          break;
        case ACTION_LOCATE:
          requestAnimationFrame(onLocate);
          break;
      }
    },
    [
      inPosition.onClear,
      inPosition.onMark,
      onLocate,
      positions.onToggleOthers,
      positions.onToggleOwnSharing,
      route.onToggle,
      scent.onClear,
      scent.onSet,
    ],
  );

  return (
    <GlassMenuButton
      accessibilityLabel="Kartverktyg"
      actions={actions}
      className="size-14"
      icon="map-outline"
      iconSize={24}
      onPressAction={handlePressAction}
      surfaceClassName="size-14"
      title="Kartverktyg"
    />
  );
}
