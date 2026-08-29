import { useRouter } from 'expo-router';

export function useMapStylePicker() {
  const { push } = useRouter();

  return () => {
    push('/map-style');
  };
}
