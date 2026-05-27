export type IssueReportDraft = {
  capturedAt: number;
  screenPath?: string;
  screenshotUri?: string;
};

let pendingIssueReportDraft: IssueReportDraft | null = null;

export function setPendingIssueReportDraft(draft: IssueReportDraft) {
  pendingIssueReportDraft = draft;
}

export function getPendingIssueReportDraft() {
  return pendingIssueReportDraft;
}

export function clearPendingIssueReportDraft() {
  pendingIssueReportDraft = null;
}
