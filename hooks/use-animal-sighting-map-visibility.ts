import { api } from '@/convex/_generated/api';
import { isAnimalSightingLive, type AnimalSightingMapItem } from '@/lib/animal-sightings';
import { useMutation } from 'convex/react';
import { useReducer } from 'react';
import { Alert } from 'react-native';

type AnimalSightingVisibilityState = {
  hiddenSightingIds: Set<string>;
};

type AnimalSightingVisibilityAction = { type: 'clearHidden' } | { type: 'hideIds'; ids: string[] };

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

  const currentSightings = (sightings ?? []).filter((sighting) =>
    isAnimalSightingLive(sighting, currentTime)
  );

  const visibleSightings = currentSightings.filter(
    (sighting) => !state.hiddenSightingIds.has(String(sighting._id))
  );
  const hasLocallyHiddenCurrentSightings = currentSightings.some((sighting) =>
    state.hiddenSightingIds.has(String(sighting._id))
  );

  const handleHideSighting = async (sighting: AnimalSightingMapItem) => {
    try {
      await acknowledgeAnimalSighting({ sightingId: sighting._id });
      dispatch({ type: 'hideIds', ids: [String(sighting._id)] });
    } catch (error) {
      console.error('Failed to hide animal sighting:', error);
      Alert.alert('Kunde inte dölja observation', 'Försök igen om en stund.');
    }
  };

  const handleToggleVisibility = () => {
    if (hasLocallyHiddenCurrentSightings) {
      dispatch({ type: 'clearHidden' });
      return;
    }

    const idsToHide = visibleSightings.map((sighting) => String(sighting._id));
    if (idsToHide.length > 0) {
      dispatch({ type: 'hideIds', ids: idsToHide });
    }
  };

  return {
    hasLocallyHiddenCurrentSightings,
    handleHideSighting,
    handleToggleVisibility,
    visibleSightings,
  };
}
