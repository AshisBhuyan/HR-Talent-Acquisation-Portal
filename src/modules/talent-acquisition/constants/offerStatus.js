export const OFFER_STATUS = {
  DRAFT: 'draft',
  SENT: 'sent',
  ACCEPTED: 'accepted',
  DECLINED: 'declined',
};

export const OFFER_STATUS_META = {
  [OFFER_STATUS.DRAFT]: { label: 'Draft', variant: 'grey' },
  [OFFER_STATUS.SENT]: { label: 'Sent', variant: 'blue' },
  [OFFER_STATUS.ACCEPTED]: { label: 'Accepted', variant: 'green' },
  [OFFER_STATUS.DECLINED]: { label: 'Declined', variant: 'red' },
};

export const OFFER_STATUS_OPTIONS = Object.entries(OFFER_STATUS_META).map(
  ([value, meta]) => ({ value, label: meta.label })
);

export const OFFER_TRANSITIONS = {
  [OFFER_STATUS.DRAFT]: [OFFER_STATUS.SENT],
  [OFFER_STATUS.SENT]: [OFFER_STATUS.ACCEPTED, OFFER_STATUS.DECLINED],
  [OFFER_STATUS.ACCEPTED]: [],
  [OFFER_STATUS.DECLINED]: [],
};

export const EMPLOYMENT_TYPES = [
  { value: 'Full-time', label: 'Full-time' },
  { value: 'Part-time', label: 'Part-time' },
  { value: 'Contract', label: 'Contract' },
  { value: 'Internship', label: 'Internship' },
  { value: 'Consultant', label: 'Consultant' },
];

export const OFFER_DEPARTMENTS = [
  'Human Resources',
  'Engineering',
  'Product',
  'Design',
  'Finance',
  'Sales',
  'Marketing',
  'Operations',
  'Customer Success',
];

export function getOfferStatusMeta(status) {
  return OFFER_STATUS_META[status] || { label: 'Unknown', variant: 'grey' };
}

export function canTransitionOffer(from, to) {
  const allowed = OFFER_TRANSITIONS[from];
  if (!allowed) return false;
  return allowed.includes(to);
}
