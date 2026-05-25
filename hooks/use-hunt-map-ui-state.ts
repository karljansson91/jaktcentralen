import { useCallback, useReducer } from 'react';

export type PendingAnimalSighting = {
  isReporting: boolean;
  latitude: number;
  longitude: number;
};

type PendingAnimalSightingUpdate =
  | PendingAnimalSighting
  | null
  | ((current: PendingAnimalSighting | null) => PendingAnimalSighting | null);

type HuntMapUiState = {
  pendingAnimalSighting: PendingAnimalSighting | null;
  showOtherUserPositions: boolean;
  visibleAssignmentTrailTargetKey: string | null;
};

type HuntMapUiAction =
  | { type: 'setPendingAnimalSighting'; update: PendingAnimalSightingUpdate }
  | { type: 'setVisibleAssignmentTrailTargetKey'; targetKey: string | null }
  | { type: 'toggleOtherUserPositions' };

const INITIAL_HUNT_MAP_UI_STATE: HuntMapUiState = {
  pendingAnimalSighting: null,
  showOtherUserPositions: true,
  visibleAssignmentTrailTargetKey: null,
};

function huntMapUiReducer(state: HuntMapUiState, action: HuntMapUiAction): HuntMapUiState {
  switch (action.type) {
    case 'setPendingAnimalSighting':
      return {
        ...state,
        pendingAnimalSighting:
          typeof action.update === 'function'
            ? action.update(state.pendingAnimalSighting)
            : action.update,
      };
    case 'setVisibleAssignmentTrailTargetKey':
      return { ...state, visibleAssignmentTrailTargetKey: action.targetKey };
    case 'toggleOtherUserPositions':
      return { ...state, showOtherUserPositions: !state.showOtherUserPositions };
  }
}

export function useHuntMapUiState() {
  const [state, dispatch] = useReducer(huntMapUiReducer, INITIAL_HUNT_MAP_UI_STATE);

  const setPendingAnimalSighting = useCallback((update: PendingAnimalSightingUpdate) => {
    dispatch({ type: 'setPendingAnimalSighting', update });
  }, []);
  const setVisibleAssignmentTrailTargetKey = useCallback((targetKey: string | null) => {
    dispatch({ type: 'setVisibleAssignmentTrailTargetKey', targetKey });
  }, []);
  const toggleOtherUserPositions = useCallback(() => {
    dispatch({ type: 'toggleOtherUserPositions' });
  }, []);

  return {
    ...state,
    setPendingAnimalSighting,
    setVisibleAssignmentTrailTargetKey,
    toggleOtherUserPositions,
  };
}
