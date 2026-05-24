import type { Doc } from "./_generated/dataModel";

type EventLifecycleFields = Pick<Doc<"events">, "endDate" | "endedAt">;

export function isEventEnded(event: EventLifecycleFields, now = Date.now()) {
  return event.endedAt !== undefined || event.endDate <= now;
}

export function getEffectiveEndedAt(event: EventLifecycleFields, now = Date.now()) {
  if (event.endedAt !== undefined) {
    return event.endedAt;
  }

  return event.endDate <= now ? event.endDate : undefined;
}
