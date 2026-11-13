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
