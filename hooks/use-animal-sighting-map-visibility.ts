import { api } from '@/convex/_generated/api';
import type { AnimalSightingMapItem } from '@/lib/animal-sightings';
import { useMutation } from 'convex/react';
import { useCallback, useMemo, useReducer } from 'react';
import { Alert } from 'react-native';

type AnimalSightingVisibilityState = {
  hiddenSightingIds: Set<string>;
  selectedSightingId: string | null;
};

type AnimalSightingVisibilityAction =
  | { type: 'clearHidden' }
  | { type: 'hideIds'; ids: string[] }
  | { type: 'select'; sightingId: string | null };

const INITIAL_ANIMAL_SIGHTING_VISIBILITY_STATE: AnimalSightingVisibilityState = {
  hiddenSightingIds: new Set(),
  selectedSightingId: null,
};

function animalSightingVisibilityReducer(
  state: AnimalSightingVisibilityState,
  action: AnimalSightingVisibilityAction
): AnimalSightingVisibilityState {
  switch (action.type) {
    case 'clearHidden':
      return { ...state, hiddenSightingIds: new Set() };
    case 'hideIds':
      return {
        ...state,
        hiddenSightingIds: new Set([...state.hiddenSightingIds, ...action.ids]),
      };
    case 'select':
      return { ...state, selectedSightingId: action.sightingId };
  }
}

export function useAnimalSightingMapVisibility(sightings: AnimalSightingMapItem[] | undefined) {
  const [state, dispatch] = useReducer(
    animalSightingVisibilityReducer,
    INITIAL_ANIMAL_SIGHTING_VISIBILITY_STATE
  );
  const acknowledgeAnimalSighting = useMutation(api.animalSightings.acknowledge);

  const visibleSightings = useMemo(
    () =>
      (sightings ?? []).filter(
        (sighting) => !state.hiddenSightingIds.has(String(sighting._id))
      ),
    [sightings, state.hiddenSightingIds]
  );
  const hasLocallyHiddenCurrentSightings = useMemo(
    () =>
      (sightings ?? []).some((sighting) =>
        state.hiddenSightingIds.has(String(sighting._id))
      ),
    [sightings, state.hiddenSightingIds]
  );
  const selectedSighting = useMemo(
    () =>
      (sightings ?? []).find(
        (sighting) => String(sighting._id) === state.selectedSightingId
      ) ?? null,
    [sightings, state.selectedSightingId]
  );

  const handlePressSighting = useCallback((sighting: AnimalSightingMapItem) => {
    dispatch({ type: 'select', sightingId: String(sighting._id) });
  }, []);

  const handleCloseSightingSheet = useCallback(() => {
    dispatch({ type: 'select', sightingId: null });
  }, []);

  const handleHideSighting = useCallback(
    async (sighting: AnimalSightingMapItem) => {
      try {
        await acknowledgeAnimalSighting({ sightingId: sighting._id });
        dispatch({ type: 'hideIds', ids: [String(sighting._id)] });
        dispatch({ type: 'select', sightingId: null });
      } catch (error) {
        console.error('Failed to hide animal sighting:', error);
        Alert.alert('Kunde inte dölja observation', 'Försök igen om en stund.');
      }
    },
    [acknowledgeAnimalSighting]
  );

  const handleToggleVisibility = useCallback(() => {
    if (hasLocallyHiddenCurrentSightings) {
      dispatch({ type: 'clearHidden' });
      return;
    }

    const idsToHide = visibleSightings.map((sighting) => String(sighting._id));
    if (idsToHide.length > 0) {
      dispatch({ type: 'hideIds', ids: idsToHide });
    }
  }, [hasLocallyHiddenCurrentSightings, visibleSightings]);

  return {
    hasLocallyHiddenCurrentSightings,
    handleCloseSightingSheet,
    handleHideSighting,
    handlePressSighting,
    handleToggleVisibility,
    selectedSighting,
    visibleSightings,
  };
}
