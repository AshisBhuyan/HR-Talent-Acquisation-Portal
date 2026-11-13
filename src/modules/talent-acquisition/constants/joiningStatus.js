/**
 * Joining and onboarding constants.
 *
 * The joining checklist is defined with categories, mandatory flags and a
 * per-item status so HR can see exactly what blocks a successful joining.
 */

export const JOINING_STATUS = {
  PENDING: 'pending',
  DOCUMENTS_PENDING: 'documents_pending',
  VERIFICATION_IN_PROGRESS: 'verification_in_progress',
  READY_TO_JOIN: 'ready_to_join',
  JOINED: 'joined',
};

export const JOINING_STATUS_META = {
  [JOINING_STATUS.PENDING]: { label: 'Pending', variant: 'grey' },
  [JOINING_STATUS.DOCUMENTS_PENDING]: { label: 'Documents Pending', variant: 'orange' },
  [JOINING_STATUS.VERIFICATION_IN_PROGRESS]: {
    label: 'Verification In Progress',
    variant: 'blue',
  },
  [JOINING_STATUS.READY_TO_JOIN]: { label: 'Ready to Join', variant: 'green' },
  [JOINING_STATUS.JOINED]: { label: 'Joined', variant: 'green' },
};

export const JOINING_STATUS_OPTIONS = Object.entries(JOINING_STATUS_META).map(
  ([value, meta]) => ({ value, label: meta.label })
);

export const JOINING_TRANSITIONS = {
  [JOINING_STATUS.PENDING]: [
    JOINING_STATUS.DOCUMENTS_PENDING,
    JOINING_STATUS.VERIFICATION_IN_PROGRESS,
    JOINING_STATUS.READY_TO_JOIN,
  ],
  [JOINING_STATUS.DOCUMENTS_PENDING]: [
    JOINING_STATUS.VERIFICATION_IN_PROGRESS,
    JOINING_STATUS.READY_TO_JOIN,
  ],
  [JOINING_STATUS.VERIFICATION_IN_PROGRESS]: [
    JOINING_STATUS.DOCUMENTS_PENDING,
    JOINING_STATUS.READY_TO_JOIN,
  ],
  [JOINING_STATUS.READY_TO_JOIN]: [JOINING_STATUS.JOINED],
  [JOINING_STATUS.JOINED]: [],
};

export function getJoiningStatusMeta(status) {
  return JOINING_STATUS_META[status] || { label: 'Unknown', variant: 'grey' };
}

export function canTransitionJoining(from, to) {
  const allowed = JOINING_TRANSITIONS[from];
  if (!allowed) return false;
  return allowed.includes(to);
}

/* ---------------------------------------------------------------
   Document verification
--------------------------------------------------------------- */
export const DOCUMENT_STATUS = {
  PENDING: 'pending',
  SUBMITTED: 'submitted',
  UNDER_VERIFICATION: 'under_verification',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
  RESUBMISSION_REQUIRED: 'resubmission_required',
  NOT_APPLICABLE: 'not_applicable',
};

export const DOCUMENT_STATUS_META = {
  [DOCUMENT_STATUS.PENDING]: { label: 'Pending', variant: 'grey' },
  [DOCUMENT_STATUS.SUBMITTED]: { label: 'Submitted', variant: 'blue' },
  [DOCUMENT_STATUS.UNDER_VERIFICATION]: { label: 'Under Verification', variant: 'orange' },
  [DOCUMENT_STATUS.VERIFIED]: { label: 'Verified', variant: 'green' },
  [DOCUMENT_STATUS.REJECTED]: { label: 'Rejected', variant: 'red' },
  [DOCUMENT_STATUS.RESUBMISSION_REQUIRED]: {
    label: 'Resubmission Required',
    variant: 'red',
  },
  [DOCUMENT_STATUS.NOT_APPLICABLE]: { label: 'Not Applicable', variant: 'grey' },
};

export const DOCUMENT_STATUS_OPTIONS = Object.entries(DOCUMENT_STATUS_META).map(
  ([value, meta]) => ({ value, label: meta.label })
);

export function getDocumentStatusMeta(status) {
  return DOCUMENT_STATUS_META[status] || { label: 'Unknown', variant: 'grey' };
}

export const JOINING_DOCUMENT_TYPES = [
  { value: 'identity', label: 'Identity Document' },
  { value: 'address', label: 'Address Document' },
  { value: 'photograph', label: 'Passport-size Photograph' },
  { value: 'degree', label: 'Degree Certificate' },
  { value: 'marksheets', label: 'Educational Mark Sheets' },
  { value: 'professional_certificate', label: 'Professional Certificate' },
  { value: 'previous_employment', label: 'Previous Employment' },
  { value: 'experience_certificate', label: 'Experience Certificate' },
  { value: 'relieving_letter', label: 'Relieving Letter' },
  { value: 'bank', label: 'Bank Document' },
  { value: 'emergency_contact', label: 'Emergency Contact' },
  { value: 'employment_details', label: 'Employment Details' },
  { value: 'other', label: 'Other Attachment' },
];

export function getDocumentTypeLabel(type) {
  const match = JOINING_DOCUMENT_TYPES.find((item) => item.value === type);
  return match ? match.label : 'Document';
}

/* ---------------------------------------------------------------
   Checklist — categories, mandatory flags, per-item status
--------------------------------------------------------------- */

export const CHECKLIST_ITEM_STATUS = {
  PENDING: 'pending',
  SUBMITTED: 'submitted',
  UNDER_VERIFICATION: 'under_verification',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
  NOT_APPLICABLE: 'not_applicable',
};

export const CHECKLIST_STATUS_META = {
  [CHECKLIST_ITEM_STATUS.PENDING]: { label: 'Pending', variant: 'grey' },
  [CHECKLIST_ITEM_STATUS.SUBMITTED]: { label: 'Submitted', variant: 'blue' },
  [CHECKLIST_ITEM_STATUS.UNDER_VERIFICATION]: { label: 'Under Verification', variant: 'orange' },
  [CHECKLIST_ITEM_STATUS.VERIFIED]: { label: 'Verified', variant: 'green' },
  [CHECKLIST_ITEM_STATUS.REJECTED]: { label: 'Resubmission Required', variant: 'red' },
  [CHECKLIST_ITEM_STATUS.NOT_APPLICABLE]: { label: 'Not Applicable', variant: 'grey' },
};

/**
 * The joining checklist. `mandatory: false` items are optional and never
 * block joining. Mandatory items must all be VERIFIED before the candidate
 * can be marked as joined.
 */
export const JOINING_CHECKLIST_DEFINITIONS = [
  // Personal documents
  { key: 'identity', label: 'Identity document', category: 'Personal Documents', mandatory: true },
  { key: 'address', label: 'Address document', category: 'Personal Documents', mandatory: true },
  { key: 'photograph', label: 'Passport-size photograph', category: 'Personal Documents', mandatory: false },

  // Educational documents
  { key: 'degree', label: 'Degree certificate', category: 'Educational Documents', mandatory: true },
  { key: 'marksheets', label: 'Educational mark sheets', category: 'Educational Documents', mandatory: true },
  { key: 'professional_certificate', label: 'Professional certificates', category: 'Educational Documents', mandatory: false },

  // Employment documents
  { key: 'previous_employment', label: 'Previous employment information', category: 'Employment Documents', mandatory: true },
  { key: 'experience_certificate', label: 'Experience certificate', category: 'Employment Documents', mandatory: false },
  { key: 'relieving_letter', label: 'Relieving letter', category: 'Employment Documents', mandatory: false },

  // Other joining information
  { key: 'bank', label: 'Bank details submission', category: 'Other Joining Information', mandatory: true },
  { key: 'emergency_contact', label: 'Emergency contact information', category: 'Other Joining Information', mandatory: true },
  { key: 'employment_details', label: 'Employment details', category: 'Other Joining Information', mandatory: true },
  { key: 'joining_date', label: 'Joining date confirmation', category: 'Other Joining Information', mandatory: true },
  { key: 'offer_acceptance', label: 'Offer acceptance verification', category: 'Other Joining Information', mandatory: true },
];

export const JOINING_CHECKLIST_CATEGORIES = [
  'Personal Documents',
  'Educational Documents',
  'Employment Documents',
  'Other Joining Information',
];

export const MANDATORY_CHECKLIST_KEYS = JOINING_CHECKLIST_DEFINITIONS.filter(
  (item) => item.mandatory
).map((item) => item.key);

export const CHECKLIST_KEYS_BY_DOCUMENT_TYPE = {
  identity: 'identity',
  address: 'address',
  photograph: 'photograph',
  degree: 'degree',
  marksheets: 'marksheets',
  professional_certificate: 'professional_certificate',
  previous_employment: 'previous_employment',
  experience_certificate: 'experience_certificate',
  relieving_letter: 'relieving_letter',
  bank: 'bank',
  emergency_contact: 'emergency_contact',
  employment_details: 'employment_details',
};

export function getChecklistDefinition(key) {
  return JOINING_CHECKLIST_DEFINITIONS.find((item) => item.key === key) || null;
}

/**
 * Builds the default checklist for a joining record, preserving stored
 * statuses when a record is read.
 */
export function createDefaultChecklist(storedItems = []) {
  const stored = new Map(
    (storedItems || []).map((item) => [item.key, item])
  );

  return JOINING_CHECKLIST_DEFINITIONS.map((definition) => {
    const item = stored.get(definition.key);
    return {
      key: definition.key,
      label: definition.label,
      category: definition.category,
      mandatory: definition.mandatory,
      status: item?.status || CHECKLIST_ITEM_STATUS.PENDING,
      remarks: item?.remarks || '',
      verifiedBy: item?.verifiedBy || '',
      updatedAt: item?.updatedAt || null,
      history: Array.isArray(item?.history) ? item.history : [],
    };
  });
}

/* ---------------------------------------------------------------
   Employee handover
--------------------------------------------------------------- */

export const HANDOVER_STATUS = {
  NOT_READY: 'not_ready',
  READY_FOR_REVIEW: 'ready_for_review',
  AWAITING_IMPORT: 'awaiting_import',
  IMPORTED: 'imported',
  IMPORT_FAILED: 'import_failed',
};

export const HANDOVER_STATUS_META = {
  [HANDOVER_STATUS.NOT_READY]: { label: 'Not Ready', variant: 'grey' },
  [HANDOVER_STATUS.READY_FOR_REVIEW]: { label: 'Ready for Review', variant: 'blue' },
  [HANDOVER_STATUS.AWAITING_IMPORT]: { label: 'Awaiting Import', variant: 'orange' },
  [HANDOVER_STATUS.IMPORTED]: { label: 'Imported', variant: 'green' },
  [HANDOVER_STATUS.IMPORT_FAILED]: { label: 'Import Failed', variant: 'red' },
};

export const HANDOVER_STATUS_OPTIONS = Object.entries(HANDOVER_STATUS_META).map(
  ([value, meta]) => ({ value, label: meta.label })
);

export function getHandoverStatusMeta(status) {
  return HANDOVER_STATUS_META[status] || { label: 'Unknown', variant: 'grey' };
}
