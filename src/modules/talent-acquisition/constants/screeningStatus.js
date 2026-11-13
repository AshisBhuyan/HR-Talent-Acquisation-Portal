export const SCREENING_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  PASSED: 'passed',
  FAILED: 'failed',
};

export const SCREENING_STATUS_META = {
  [SCREENING_STATUS.PENDING]: { label: 'Pending', variant: 'orange' },
  [SCREENING_STATUS.IN_PROGRESS]: { label: 'In Progress', variant: 'blue' },
  [SCREENING_STATUS.COMPLETED]: { label: 'Completed', variant: 'green' },
  [SCREENING_STATUS.PASSED]: { label: 'Passed', variant: 'green' },
  [SCREENING_STATUS.FAILED]: { label: 'Failed', variant: 'red' },
};

export const SCREENING_STATUS_OPTIONS = Object.entries(SCREENING_STATUS_META).map(
  ([value, meta]) => ({ value, label: meta.label })
);

/**
 * Screening records that still need an HR decision.
 */
export const OPEN_SCREENING_STATUSES = [
  SCREENING_STATUS.PENDING,
  SCREENING_STATUS.IN_PROGRESS,
];

export function getScreeningStatusMeta(status) {
  return (
    SCREENING_STATUS_META[status] || { label: 'Unknown', variant: 'grey' }
  );
}
