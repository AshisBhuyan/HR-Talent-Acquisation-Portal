/**
 * Rules for candidate submitted documents.
 *
 * Candidates upload documents through the Career Portal. The Talent
 * Acquisition module only stores document metadata and renders preview and
 * download actions for documents the backend has already accepted.
 */
export const CANDIDATE_DOCUMENT_TYPES = [
  { value: 'cv', label: 'Curriculum Vitae' },
  { value: 'certificate', label: 'Certificate' },
  { value: 'experience', label: 'Experience Letter' },
  { value: 'education', label: 'Educational Document' },
  { value: 'other', label: 'Other Attachment' },
];

export const CANDIDATE_DOCUMENT_TYPE_OPTIONS = CANDIDATE_DOCUMENT_TYPES;

export const CANDIDATE_DOCUMENT_ACCEPTED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export const CANDIDATE_DOCUMENT_MAX_SIZE_BYTES = 5 * 1024 * 1024;

export const CANDIDATE_DOCUMENT_RULES = {
  acceptedTypes: CANDIDATE_DOCUMENT_ACCEPTED_TYPES,
  maxSizeBytes: CANDIDATE_DOCUMENT_MAX_SIZE_BYTES,
  maxSizeLabel: '5 MB',
  typeOptions: CANDIDATE_DOCUMENT_TYPE_OPTIONS,
};

export function getDocumentTypeLabel(type) {
  const match = CANDIDATE_DOCUMENT_TYPES.find((item) => item.value === type);
  return match ? match.label : 'Document';
}

export function isPdfDocument(document) {
  if (!document) return false;
  if (document.mimeType === 'application/pdf') return true;
  return String(document.fileName || '').toLowerCase().endsWith('.pdf');
}

export function formatFileSize(bytes) {
  const value = Number(bytes);
  if (!Number.isFinite(value) || value <= 0) return 'Unknown size';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}
