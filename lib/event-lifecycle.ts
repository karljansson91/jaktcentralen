export type EventLifecycle = 'upcoming' | 'active' | 'ended';

export type EventLifecycleInput = {
  endedAt?: number | null;
  endDate: number;
  startDate: number;
};

const DEFAULT_EVENT_LIFECYCLE_LABELS: Record<EventLifecycle, string> = {
  active: 'Pågår nu',
  ended: 'Avslutad',
  upcoming: 'Kommande',
};

export function getEventLifecycle(event: EventLifecycleInput, now: number): EventLifecycle {
  if (event.endedAt != null || event.endDate <= now) {
    return 'ended';
  }

  if (event.startDate > now) {
    return 'upcoming';
  }

  return 'active';
}

export function isEventActive(event: EventLifecycleInput, now: number) {
  return getEventLifecycle(event, now) === 'active';
}

export function getEventLifecycleLabel(
  lifecycle: EventLifecycle,
  labels: Record<EventLifecycle, string> = DEFAULT_EVENT_LIFECYCLE_LABELS
) {
  return labels[lifecycle];
}
