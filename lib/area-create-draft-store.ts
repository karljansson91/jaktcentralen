import type { LngLat } from '@/lib/geo';

export type AreaCreateDraft = {
  name: string;
  polygon: LngLat[];
};

const drafts = new Map<string, AreaCreateDraft>();

function createDraftId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function saveAreaCreateDraft(draft: AreaCreateDraft, draftId?: string) {
  const nextDraftId = draftId ?? createDraftId();
  drafts.set(nextDraftId, draft);
  return nextDraftId;
}

export function getAreaCreateDraft(draftId: string) {
  return drafts.get(draftId);
}

export function clearAreaCreateDraft(draftId: string) {
  drafts.delete(draftId);
}
