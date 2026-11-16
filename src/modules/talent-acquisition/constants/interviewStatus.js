export const INTERVIEW_STATUS = {
  SCHEDULED: 'scheduled',
  COMPLETED: 'completed',
  RESCHEDULED: 'rescheduled',
  CANCELLED: 'cancelled',
};

export const INTERVIEW_STATUS_META = {
  [INTERVIEW_STATUS.SCHEDULED]: { label: 'Scheduled', variant: 'blue' },
  [INTERVIEW_STATUS.COMPLETED]: { label: 'Completed', variant: 'green' },
  [INTERVIEW_STATUS.RESCHEDULED]: { label: 'Rescheduled', variant: 'orange' },
  [INTERVIEW_STATUS.CANCELLED]: { label: 'Cancelled', variant: 'red' },
};

export const INTERVIEW_STATUS_OPTIONS = Object.entries(INTERVIEW_STATUS_META).map(
  ([value, meta]) => ({ value, label: meta.label })
);

export const INTERVIEW_ROUNDS = [
  { value: 'hr', label: 'HR Round' },
  { value: 'technical', label: 'Technical Round' },
  { value: 'managerial', label: 'Managerial Round' },
  { value: 'final', label: 'Final Round' },
];

export const INTERVIEW_MODES = [
  { value: 'online', label: 'Online' },
  { value: 'offline', label: 'Offline' },
];

export const INTERVIEW_TYPE = {
  INDIVIDUAL: 'individual',
  MULTIPLE: 'multiple',
  PANEL: 'panel',
};

export const INTERVIEW_TYPE_META = {
  [INTERVIEW_TYPE.INDIVIDUAL]: { label: 'Individual Interview', variant: 'blue' },
  [INTERVIEW_TYPE.MULTIPLE]: { label: 'Multiple Interviewers', variant: 'purple' },
  [INTERVIEW_TYPE.PANEL]: { label: 'Panel Interview', variant: 'orange' },
};

export const INTERVIEWER_NOTIFICATION_STATUS = {
  PENDING: 'pending',
  SENT: 'sent',
  FAILED: 'failed',
  SKIPPED: 'skipped',
};

export const INTERVIEWER_NOTIFICATION_STATUS_META = {
  [INTERVIEWER_NOTIFICATION_STATUS.PENDING]: { label: 'Pending', variant: 'orange' },
  [INTERVIEWER_NOTIFICATION_STATUS.SENT]: { label: 'Sent', variant: 'green' },
  [INTERVIEWER_NOTIFICATION_STATUS.FAILED]: { label: 'Failed', variant: 'red' },
  [INTERVIEWER_NOTIFICATION_STATUS.SKIPPED]: { label: 'No email', variant: 'grey' },
};

/**
 * The interview type is derived from the number of assigned interviewers and
 * is never entered by hand: 1 interviewer is individual, 2-3 is a multiple
 * interviewer round and more than 3 is a panel.
 */
export function getInterviewType(count = 0) {
  const total = Number(count) || 0;
  if (total > 3) return INTERVIEW_TYPE.PANEL;
  if (total > 1) return INTERVIEW_TYPE.MULTIPLE;
  return INTERVIEW_TYPE.INDIVIDUAL;
}

export function getInterviewTypeMeta(count = 0) {
  return INTERVIEW_TYPE_META[getInterviewType(count)] || INTERVIEW_TYPE_META[INTERVIEW_TYPE.INDIVIDUAL];
}

export function getInterviewerNotificationStatusMeta(status) {
  return (
    INTERVIEWER_NOTIFICATION_STATUS_META[status] ||
    INTERVIEWER_NOTIFICATION_STATUS_META[INTERVIEWER_NOTIFICATION_STATUS.SKIPPED]
  );
}

export const INTERVIEW_RECOMMENDATIONS = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'not_recommended', label: 'Not Recommended' },
  { value: 'further_evaluation', label: 'Further Evaluation Required' },
];

export const INTERVIEW_RATING_SCALE = [1, 2, 3, 4, 5];

export function getInterviewStatusMeta(status) {
  return (
    INTERVIEW_STATUS_META[status] || { label: 'Unknown', variant: 'grey' }
  );
}

export function getRoundLabel(round) {
  const match = INTERVIEW_ROUNDS.find((item) => item.value === round);
  return match ? match.label : 'Interview';
}
