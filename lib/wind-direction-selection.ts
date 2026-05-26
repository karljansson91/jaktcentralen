type WindDirectionListener = (directionDegrees: number) => void;

const listeners = new Set<WindDirectionListener>();

export function publishWindDirectionSelection(directionDegrees: number) {
  listeners.forEach((listener) => listener(directionDegrees));
}

export function subscribeToWindDirectionSelection(listener: WindDirectionListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
