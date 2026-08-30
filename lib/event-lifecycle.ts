export type EventLifecycle = 'upcoming' | 'active' | 'ended';

export type EventLifecycleInput = {
  endedAt?: number | null;
  endDate: number;
  startDate: number;
};

export type EventEndInput = Pick<EventLifecycleInput, 'endDate' | 'endedAt'>;

const CALENDAR_DAY_MS = 24 * 60 * 60 * 1000;

const DEFAULT_EVENT_LIFECYCLE_LABELS: Record<EventLifecycle, string> = {
  active: 'Pågår nu',
  ended: 'Avslutad',
  upcoming: 'Kommande',
};

export function getEventLifecycle(event: EventLifecycleInput, now: number): EventLifecycle {
  if (isEventEnded(event, now)) {
    return 'ended';
  }

  if (event.startDate > now) {
    return 'upcoming';
  }

  return 'active';
}

export function getEventEndBoundary(endDate: number) {
  return endDate + CALENDAR_DAY_MS;
}

export function isEventEnded(event: EventEndInput, now = Date.now()) {
  return event.endedAt != null || getEventEndBoundary(event.endDate) <= now;
}

export function getEffectiveEndedAt(event: EventEndInput, now = Date.now()) {
  if (event.endedAt != null) {
    return event.endedAt;
  }

  const endBoundary = getEventEndBoundary(event.endDate);
  return endBoundary <= now ? endBoundary - 1 : undefined;
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
