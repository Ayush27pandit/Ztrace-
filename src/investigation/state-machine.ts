const transitions: Record<string, string[]> = {
  RECEIVED: ["QUEUED", "CANCELLED", "FAILED"],
  QUEUED: ["RUNNING", "CANCELLED", "FAILED"],
  RUNNING: ["COLLECTING_EVIDENCE", "FAILED", "CANCELLED", "RETRY_WAIT"],
  COLLECTING_EVIDENCE: ["ANALYZING", "FAILED", "CANCELLED", "RETRY_WAIT"],
  ANALYZING: ["VALIDATING", "FAILED", "CANCELLED", "RETRY_WAIT"],
  VALIDATING: ["REPORT_READY", "INSUFFICIENT_EVIDENCE", "FAILED", "RETRY_WAIT"],
  REPORT_READY: ["PUBLISHED", "REVIEW_REQUIRED", "FAILED"],
  PUBLISHED: [],
  INSUFFICIENT_EVIDENCE: ["REVIEW_REQUIRED", "CANCELLED"],
  REVIEW_REQUIRED: [],
  RETRY_WAIT: ["QUEUED", "FAILED", "CANCELLED"],
  FAILED: ["QUEUED", "CANCELLED"],
  CANCELLED: [],
};
export function canTransition(from: string, to: string): boolean {
  return transitions[from]?.includes(to) ?? false;
}
export function assertTransition(from: string, to: string): void {
  if (!canTransition(from, to)) throw new Error(`Invalid transition ${from} -> ${to}`);
}
