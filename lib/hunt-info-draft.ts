import type { Doc } from '@/convex/_generated/dataModel';
import type { AllowedGameRule } from '@/lib/allowed-game';
import { normalizeEventDate } from '@/lib/event-dates';

export type HuntInfoDraft = {
  allowedGame: AllowedGameRule[];
  description: string;
  endDate: Date;
  joinCode: string;
  startDate: Date;
  title: string;
};

export function createHuntInfoDraft(event: Doc<'events'>): HuntInfoDraft {
  return {
    allowedGame: (event.allowedGame ?? []) as AllowedGameRule[],
    description: event.description ?? '',
    endDate: normalizeEventDate(new Date(event.endDate)),
    joinCode: event.joinCode ?? '',
    startDate: normalizeEventDate(new Date(event.startDate)),
    title: event.title,
  };
}

export function getHuntInfoDraftKey(draft: HuntInfoDraft): string {
  return JSON.stringify({
    allowedGame: draft.allowedGame,
    description: draft.description.trim(),
    endDate: draft.endDate.getTime(),
    joinCode: draft.joinCode.trim(),
    startDate: draft.startDate.getTime(),
    title: draft.title.trim(),
  });
}
