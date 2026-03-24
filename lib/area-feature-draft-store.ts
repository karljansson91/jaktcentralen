import { AreaFeatureDraft } from "@/lib/area-features";

const drafts = new Map<string, AreaFeatureDraft>();

function createDraftId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function saveAreaFeatureDraft(draft: AreaFeatureDraft, draftId?: string) {
  const nextDraftId = draftId ?? createDraftId();
  drafts.set(nextDraftId, draft);
  return nextDraftId;
}

export function getAreaFeatureDraft(draftId: string) {
  return drafts.get(draftId);
}

export function clearAreaFeatureDraft(draftId: string) {
  drafts.delete(draftId);
}
