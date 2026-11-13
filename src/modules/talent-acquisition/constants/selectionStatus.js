/**
 * HR decision stage. These statuses are deliberately separate from the admin
 * approval statuses: HR records the hiring recommendation, an administrator
 * approves or rejects it.
 */
export const SELECTION_STATUS = {
  SELECTED: 'selected',
  REJECTED: 'rejected',
  ON_HOLD: 'on_hold',
};

export const SELECTION_STATUS_META = {
  [SELECTION_STATUS.SELECTED]: { label: 'Selected', variant: 'green' },
  [SELECTION_STATUS.REJECTED]: { label: 'Rejected', variant: 'red' },
  [SELECTION_STATUS.ON_HOLD]: { label: 'On Hold', variant: 'orange' },
};

export const SELECTION_STATUS_OPTIONS = Object.entries(SELECTION_STATUS_META).map(
  ([value, meta]) => ({ value, label: meta.label })
);

export function getSelectionStatusMeta(status) {
  return (
    SELECTION_STATUS_META[status] || { label: 'Not Decided', variant: 'grey' }
  );
}
