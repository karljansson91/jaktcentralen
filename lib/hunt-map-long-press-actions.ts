import type { LatLngPoint } from '@/lib/geo';

export type HuntMapLongPressAction =
  | { point: LatLngPoint; type: 'addMeasurementPoint' }
  | { point: LatLngPoint; type: 'clearPoint' }
  | { point: LatLngPoint; type: 'measureToPoint' };

type HuntMapLongPressActionListener = (action: HuntMapLongPressAction) => void;

const listeners = new Set<HuntMapLongPressActionListener>();

export function publishHuntMapLongPressAction(action: HuntMapLongPressAction) {
  listeners.forEach((listener) => listener(action));
}

export function subscribeToHuntMapLongPressActions(
  listener: HuntMapLongPressActionListener
) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
