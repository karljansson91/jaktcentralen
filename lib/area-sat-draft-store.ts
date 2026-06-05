import { AreaSatDraft } from "@/lib/area-sats";

const drafts = new Map<string, AreaSatDraft>();

function createDraftId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function saveAreaSatDraft(draft: AreaSatDraft, draftId?: string) {
  const nextDraftId = draftId ?? createDraftId();
  drafts.set(nextDraftId, draft);
  return nextDraftId;
}

export function getAreaSatDraft(draftId: string) {
  return drafts.get(draftId);
}

export function clearAreaSatDraft(draftId: string) {
  drafts.delete(draftId);
}
