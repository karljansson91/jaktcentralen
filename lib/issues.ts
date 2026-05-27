export type IssueType = 'bug' | 'feature';
export type IssueStatus = 'triage' | 'ready_to_implement' | 'ongoing' | 'completed';

export const ISSUE_TYPE_OPTIONS: { label: string; value: IssueType }[] = [
  { label: 'Bugg', value: 'bug' },
  { label: 'Funktion', value: 'feature' },
];

export const ISSUE_STATUS_OPTIONS: { label: string; value: IssueStatus }[] = [
  { label: 'Triage', value: 'triage' },
  { label: 'Redo', value: 'ready_to_implement' },
  { label: 'Pågår', value: 'ongoing' },
  { label: 'Klar', value: 'completed' },
];

export function getIssueTypeLabel(type: IssueType) {
  return ISSUE_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? type;
}

export function getIssueStatusLabel(status: IssueStatus) {
  return ISSUE_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status;
}

export function formatIssueDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString('sv-SE', {
    day: 'numeric',
    month: 'short',
  });
}

export function canSaveIssue(title: string, description: string) {
  return title.trim().length > 0 && description.trim().length > 0;
}
