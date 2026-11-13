export const APPROVAL_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CLARIFICATION_REQUESTED: 'clarification_requested',
};

export const APPROVAL_STATUS_META = {
  [APPROVAL_STATUS.PENDING]: { label: 'Pending Approval', variant: 'orange' },
  [APPROVAL_STATUS.APPROVED]: { label: 'Approved', variant: 'green' },
  [APPROVAL_STATUS.REJECTED]: { label: 'Rejected', variant: 'red' },
  [APPROVAL_STATUS.CLARIFICATION_REQUESTED]: {
    label: 'Clarification Requested',
    variant: 'blue',
  },
};

export const APPROVAL_STATUS_OPTIONS = Object.entries(APPROVAL_STATUS_META).map(
  ([value, meta]) => ({ value, label: meta.label })
);

/**
 * Approvals may only be decided once, and a rejected approval has to be
 * resubmitted by HR before it can be decided again.
 */
export const APPROVAL_TRANSITIONS = {
  [APPROVAL_STATUS.PENDING]: [
    APPROVAL_STATUS.APPROVED,
    APPROVAL_STATUS.REJECTED,
    APPROVAL_STATUS.CLARIFICATION_REQUESTED,
  ],
  [APPROVAL_STATUS.CLARIFICATION_REQUESTED]: [
    APPROVAL_STATUS.APPROVED,
    APPROVAL_STATUS.REJECTED,
    APPROVAL_STATUS.CLARIFICATION_REQUESTED,
  ],
  [APPROVAL_STATUS.APPROVED]: [],
  [APPROVAL_STATUS.REJECTED]: [APPROVAL_STATUS.PENDING],
};

export function getApprovalStatusMeta(status) {
  return (
    APPROVAL_STATUS_META[status] || { label: 'Unknown', variant: 'grey' }
  );
}

export function canTransitionApproval(from, to) {
  const allowed = APPROVAL_TRANSITIONS[from];
  if (!allowed) return false;
  return allowed.includes(to);
}
