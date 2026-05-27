import { useCallback } from 'react';
import { useRouter } from 'expo-router';

export function useMapStylePicker() {
  const { push } = useRouter();

  return useCallback(() => {
    push('/map-style');
  }, [push]);
}
