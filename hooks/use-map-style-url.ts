import {
  ensureSavedMapStyleLoaded,
  getMapStyleSnapshot,
  subscribeToMapStyleSnapshot,
} from '@/lib/map-styles';
import { useSyncExternalStore } from 'react';

void ensureSavedMapStyleLoaded();

export function useMapStyleState() {
  return useSyncExternalStore(
    subscribeToMapStyleSnapshot,
    getMapStyleSnapshot,
    getMapStyleSnapshot
  );
}
