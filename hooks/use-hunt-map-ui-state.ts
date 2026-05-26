import { useCallback, useReducer } from 'react';

type HuntMapUiState = {
  showOtherUserPositions: boolean;
  visibleAssignmentTrailTargetKey: string | null;
};

type HuntMapUiAction =
  | { type: 'setVisibleAssignmentTrailTargetKey'; targetKey: string | null }
  | { type: 'toggleOtherUserPositions' };

const INITIAL_HUNT_MAP_UI_STATE: HuntMapUiState = {
  showOtherUserPositions: true,
  visibleAssignmentTrailTargetKey: null,
};

function huntMapUiReducer(state: HuntMapUiState, action: HuntMapUiAction): HuntMapUiState {
  switch (action.type) {
    case 'setVisibleAssignmentTrailTargetKey':
      return { ...state, visibleAssignmentTrailTargetKey: action.targetKey };
    case 'toggleOtherUserPositions':
      return { ...state, showOtherUserPositions: !state.showOtherUserPositions };
  }
}

export function useHuntMapUiState() {
  const [state, dispatch] = useReducer(huntMapUiReducer, INITIAL_HUNT_MAP_UI_STATE);

  const setVisibleAssignmentTrailTargetKey = useCallback((targetKey: string | null) => {
    dispatch({ type: 'setVisibleAssignmentTrailTargetKey', targetKey });
  }, []);
  const toggleOtherUserPositions = useCallback(() => {
    dispatch({ type: 'toggleOtherUserPositions' });
  }, []);

  return {
    ...state,
    setVisibleAssignmentTrailTargetKey,
    toggleOtherUserPositions,
  };
}
