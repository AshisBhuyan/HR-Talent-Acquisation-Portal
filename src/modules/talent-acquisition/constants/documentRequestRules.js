/**
 * Candidate document-submission request rules.
 *
 * After a candidate accepts an offer, HR (through the mock email operation)
 * asks the candidate to submit the joining documents listed here. The list
 * is configurable: requests persist their own copy of the requirement set,
 * so later changes to the defaults never rewrite existing requests.
 */

export const DOCUMENT_REQUEST_STATUS = {
  REQUESTED: 'requested',
  SUBMITTED: 'submitted',
  RESUBMISSION_REQUIRED: 'resubmission_required',
};

export const DOCUMENT_REQUEST_STATUS_META = {
  [DOCUMENT_REQUEST_STATUS.REQUESTED]: { label: 'Documents Requested', variant: 'orange' },
  [DOCUMENT_REQUEST_STATUS.SUBMITTED]: { label: 'Documents Submitted', variant: 'blue' },
  [DOCUMENT_REQUEST_STATUS.RESUBMISSION_REQUIRED]: {
    label: 'Resubmission Required',
    variant: 'red',
  },
};

export function getDocumentRequestStatusMeta(status) {
  return DOCUMENT_REQUEST_STATUS_META[status] || DOCUMENT_REQUEST_STATUS_META.requested;
}

/**
 * The default document requirement set. `type` values are the same document
 * types used by the joining records and the 15-item checklist mapping.
 */
export const DEFAULT_REQUIRED_DOCUMENTS = [
  { type: 'identity', label: 'Identity Proof', mandatory: true },
  { type: 'address', label: 'Address Proof', mandatory: true },
  { type: 'educational_certificates', label: 'Educational Certificates', mandatory: true },
  {
    type: 'previous_employment',
    label: 'Previous Employment Documents',
    mandatory: false,
    note: 'Where applicable',
  },
  { type: 'bank', label: 'Bank Account Details', mandatory: true },
  {
    type: 'other',
    label: 'Other Organization-required Documents',
    mandatory: false,
  },
];

export function createDocumentRequestRequirements() {
  return DEFAULT_REQUIRED_DOCUMENTS.map((item) => ({ ...item }));
}

/**
 * Maps a submitted document type to the joining checklist item(s) it backs.
 * Educational certificates verify both the degree and the mark sheets items.
 * This is the single authoritative mapping used by the verification service
 * and the checklist UI (document-backed items are managed through the
 * document record, not toggled independently).
 */
export const DOCUMENT_CHECKLIST_KEYS = {
  identity: ['identity'],
  address: ['address'],
  photograph: ['photograph'],
  degree: ['degree'],
  marksheets: ['marksheets'],
  educational_certificates: ['degree', 'marksheets'],
  professional_certificate: ['professional_certificate'],
  previous_employment: ['previous_employment'],
  experience_certificate: ['experience_certificate'],
  relieving_letter: ['relieving_letter'],
  bank: ['bank'],
  emergency_contact: ['emergency_contact'],
  employment_details: ['employment_details'],
};

/**
 * Maps a submitted document type to the joining checklist item(s) it
 * verifies. Educational certificates count for both the degree certificate
 * and the mark sheets items so a single upload can satisfy education
 * verification.
 */
export const CHECKLIST_KEYS_BY_REQUEST_TYPE = DOCUMENT_CHECKLIST_KEYS;

/**
 * Document type labels shown to HR (joining) and the candidate portal.
 */
export const REQUEST_DOCUMENT_LABELS = {
  identity: 'Identity Proof',
  address: 'Address Proof',
  educational_certificates: 'Educational Certificates',
  previous_employment: 'Previous Employment Documents',
  bank: 'Bank Account Details',
  other: 'Organization-required Documents',
  photograph: 'Passport-size Photograph',
  degree: 'Degree Certificate',
  marksheets: 'Educational Mark Sheets',
  professional_certificate: 'Professional Certificate',
  experience_certificate: 'Experience Certificate',
  relieving_letter: 'Relieving Letter',
  emergency_contact: 'Emergency Contact',
  employment_details: 'Employment Details',
};

export function getRequestDocumentLabel(type) {
  return REQUEST_DOCUMENT_LABELS[type] || 'Document';
}

/**
 * Accepted file types for candidate uploads: extension AND MIME must match.
 */
export const UPLOAD_ACCEPT = '.pdf,.doc,.docx';
export const UPLOAD_MAX_BYTES = 5 * 1024 * 1024;
export const UPLOAD_MAX_LABEL = '5 MB';

const ACCEPTED_EXTENSIONS = ['pdf', 'doc', 'docx'];
const ACCEPTED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/octet-stream', // some browsers report DOC/DOCX this way
]);

export function validateUploadFile(file) {
  const errors = [];
  if (!file) {
    return { valid: false, errors: ['Select a file to upload.'] };
  }

  const name = String(file.name || '');
  const extension = name.includes('.') ? name.split('.').pop().toLowerCase() : '';
  const mime = String(file.type || '').toLowerCase();

  if (!ACCEPTED_EXTENSIONS.includes(extension)) {
    errors.push('Only PDF, DOC and DOCX files are accepted.');
  }
  if (mime && !ACCEPTED_MIME_TYPES.has(mime)) {
    errors.push('The file type is not allowed. Upload a PDF, DOC or DOCX file.');
  }
  if (!Number.isFinite(file.size) || file.size <= 0) {
    errors.push('The file is empty.');
  } else if (file.size > UPLOAD_MAX_BYTES) {
    errors.push(`The file is larger than ${UPLOAD_MAX_LABEL}.`);
  }

  return { valid: errors.length === 0, errors };
}
