import { api } from '@/convex/_generated/api';
import {
  isAnimalSightingLive,
  type AnimalSightingMapItem,
} from '@/lib/animal-sightings';
import { useMutation } from 'convex/react';
import { useCallback, useMemo, useReducer } from 'react';
import { Alert } from 'react-native';

type AnimalSightingVisibilityState = {
  hiddenSightingIds: Set<string>;
};

type AnimalSightingVisibilityAction =
  | { type: 'clearHidden' }
  | { type: 'hideIds'; ids: string[] };

const INITIAL_ANIMAL_SIGHTING_VISIBILITY_STATE: AnimalSightingVisibilityState = {
  hiddenSightingIds: new Set(),
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
  }
}

export function useAnimalSightingMapVisibility(
  sightings: AnimalSightingMapItem[] | undefined,
  currentTime: number
) {
  const [state, dispatch] = useReducer(
    animalSightingVisibilityReducer,
    INITIAL_ANIMAL_SIGHTING_VISIBILITY_STATE
  );
  const acknowledgeAnimalSighting = useMutation(api.animalSightings.acknowledge);

  const currentSightings = useMemo(
    () => (sightings ?? []).filter((sighting) => isAnimalSightingLive(sighting, currentTime)),
    [currentTime, sightings]
  );

  const visibleSightings = useMemo(
    () =>
      currentSightings.filter(
        (sighting) => !state.hiddenSightingIds.has(String(sighting._id))
      ),
    [currentSightings, state.hiddenSightingIds]
  );
  const hasLocallyHiddenCurrentSightings = useMemo(
    () =>
      currentSightings.some((sighting) =>
        state.hiddenSightingIds.has(String(sighting._id))
      ),
    [currentSightings, state.hiddenSightingIds]
  );

  const handleHideSighting = useCallback(
    async (sighting: AnimalSightingMapItem) => {
      try {
        await acknowledgeAnimalSighting({ sightingId: sighting._id });
        dispatch({ type: 'hideIds', ids: [String(sighting._id)] });
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
    handleHideSighting,
    handleToggleVisibility,
    visibleSightings,
  };
}
