/**
 * Recruitment application status.
 *
 * The application status tracks where a candidate sits in the recruitment
 * pipeline. It is intentionally separate from screening, interview, selection,
 * approval, offer and joining statuses, which each own their own process.
 */
export const APPLICATION_STATUS = {
  APPLIED: 'applied',
  UNDER_SCREENING: 'under_screening',
  SHORTLISTED: 'shortlisted',
  INTERVIEW: 'interview',
  FINAL_SELECTION: 'final_selection',
  APPROVAL: 'approval',
  OFFER: 'offer',
  JOINING: 'joining',
  SELECTED: 'selected',
  ON_HOLD: 'on_hold',
  REJECTED: 'rejected',
};

export const APPLICATION_STATUS_META = {
  [APPLICATION_STATUS.APPLIED]: { label: 'Applied', variant: 'blue' },
  [APPLICATION_STATUS.UNDER_SCREENING]: { label: 'Under Screening', variant: 'orange' },
  [APPLICATION_STATUS.SHORTLISTED]: { label: 'Shortlisted', variant: 'purple' },
  [APPLICATION_STATUS.INTERVIEW]: { label: 'Interview', variant: 'purple' },
  [APPLICATION_STATUS.FINAL_SELECTION]: { label: 'Final Selection', variant: 'orange' },
  [APPLICATION_STATUS.APPROVAL]: { label: 'Approval', variant: 'orange' },
  [APPLICATION_STATUS.OFFER]: { label: 'Offer', variant: 'blue' },
  [APPLICATION_STATUS.JOINING]: { label: 'Joining', variant: 'blue' },
  [APPLICATION_STATUS.SELECTED]: { label: 'Selected', variant: 'green' },
  [APPLICATION_STATUS.ON_HOLD]: { label: 'On Hold', variant: 'grey' },
  [APPLICATION_STATUS.REJECTED]: { label: 'Rejected', variant: 'red' },
};

export const APPLICATION_STATUS_OPTIONS = Object.entries(APPLICATION_STATUS_META).map(
  ([value, meta]) => ({ value, label: meta.label })
);

/**
 * Allowed workflow transitions. A transition that is not listed here is
 * rejected by the application service so the pipeline cannot be corrupted.
 */
export const APPLICATION_TRANSITIONS = {
  [APPLICATION_STATUS.APPLIED]: [
    APPLICATION_STATUS.UNDER_SCREENING,
    APPLICATION_STATUS.REJECTED,
    APPLICATION_STATUS.ON_HOLD,
  ],
  [APPLICATION_STATUS.UNDER_SCREENING]: [
    APPLICATION_STATUS.SHORTLISTED,
    APPLICATION_STATUS.REJECTED,
    APPLICATION_STATUS.ON_HOLD,
  ],
  [APPLICATION_STATUS.SHORTLISTED]: [
    APPLICATION_STATUS.INTERVIEW,
    APPLICATION_STATUS.REJECTED,
    APPLICATION_STATUS.ON_HOLD,
  ],
  [APPLICATION_STATUS.INTERVIEW]: [
    APPLICATION_STATUS.FINAL_SELECTION,
    APPLICATION_STATUS.REJECTED,
    APPLICATION_STATUS.ON_HOLD,
  ],
  [APPLICATION_STATUS.FINAL_SELECTION]: [
    APPLICATION_STATUS.APPROVAL,
    APPLICATION_STATUS.REJECTED,
    APPLICATION_STATUS.ON_HOLD,
  ],
  [APPLICATION_STATUS.APPROVAL]: [
    APPLICATION_STATUS.OFFER,
    APPLICATION_STATUS.REJECTED,
    APPLICATION_STATUS.ON_HOLD,
  ],
  [APPLICATION_STATUS.OFFER]: [
    APPLICATION_STATUS.JOINING,
    APPLICATION_STATUS.REJECTED,
    APPLICATION_STATUS.ON_HOLD,
  ],
  [APPLICATION_STATUS.JOINING]: [APPLICATION_STATUS.SELECTED],
  // An on-hold application changes only through the Resume action, which
  // restores the status it held before it was placed on hold.
  [APPLICATION_STATUS.ON_HOLD]: [],
  [APPLICATION_STATUS.REJECTED]: [],
  [APPLICATION_STATUS.SELECTED]: [],
};

/**
 * Message shown whenever an action would progress an application that is on
 * hold. The services enforce this guard so the hold cannot be bypassed by
 * refreshing the page or by hiding the buttons.
 */
export const HOLD_BLOCK_MESSAGE =
  'This application is on hold. Resume it before moving the candidate to the next stage.';

/**
 * Statuses that still represent an active candidate in the pipeline.
 */
export const ACTIVE_APPLICATION_STATUSES = [
  APPLICATION_STATUS.APPLIED,
  APPLICATION_STATUS.UNDER_SCREENING,
  APPLICATION_STATUS.SHORTLISTED,
  APPLICATION_STATUS.INTERVIEW,
  APPLICATION_STATUS.FINAL_SELECTION,
  APPLICATION_STATUS.APPROVAL,
  APPLICATION_STATUS.OFFER,
  APPLICATION_STATUS.JOINING,
  APPLICATION_STATUS.ON_HOLD,
];

export function getApplicationStatusMeta(status) {
  return (
    APPLICATION_STATUS_META[status] || {
      label: 'Unknown',
      variant: 'grey',
    }
  );
}

export function canTransitionApplication(from, to) {
  const allowed = APPLICATION_TRANSITIONS[from];
  if (!allowed) return false;
  return allowed.includes(to);
}

export function isApplicationActive(status) {
  return ACTIVE_APPLICATION_STATUSES.includes(status);
}
