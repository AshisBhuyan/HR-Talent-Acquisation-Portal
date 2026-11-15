/**
 * Candidate communication email builders.
 *
 * These build the content of the mock email operations. The frontend never
 * contacts a real email provider; every operation is recorded in the mock
 * email log and labelled as simulated in the UI.
 */
import { formatDate } from '../../../utils/formatDate.js';

export const OFFER_EMAIL_SUBJECT = 'Your Offer of Employment – Ecometrix';

export const DOCUMENT_REQUEST_EMAIL_SUBJECT =
  'Document Submission Required – Joining Formalities';

export const RESUBMISSION_EMAIL_SUBJECT =
  'Action Required: Replacement Document Requested – Joining Formalities';

export function buildOfferResponseUrl(token) {
  const base =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : '';
  return `${base}/candidate/offer-response/${token}`;
}

export function buildDocumentSubmissionUrl(token) {
  const base =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : '';
  return `${base}/candidate/document-submission/${token}`;
}

export function buildOfferLetterEmail({ candidate, job, offer, link }) {
  const body = [
    `Dear ${candidate.fullName},`,
    '',
    'We are pleased to offer you the position described in the attached offer letter.',
    '',
    `Position: ${offer.designation}`,
    `Department: ${offer.department}`,
    `Employment type: ${offer.employmentType || 'Full-time'}`,
    `Proposed joining date: ${formatDate(offer.joiningDate)}`,
    `Offer reference: ${offer.offerId}`,
    `Attached offer document: ${offer.offerLetterName || 'Offer_Letter.pdf'}`,
    '',
    'Please review the offer and respond using your personal link:',
    link,
    '',
    `The offer expires on ${formatDate(offer.expiryDate)}. If you have any questions, please reply to this email.`,
    '',
    'Best Regards,',
    'HR Recruitment Team',
    'Ecometrix',
    '',
    'Note: this is a simulated email recorded by the Ecometrix Talent Acquisition demo. No real email was delivered.',
  ].join('\n');

  return { subject: OFFER_EMAIL_SUBJECT, body };
}

export function buildDocumentRequestEmail({ candidate, job, offer, link }) {
  const body = [
    `Dear ${candidate.fullName},`,
    '',
    'Congratulations on accepting the employment offer.',
    '',
    'To complete the joining formalities, we now need the following documents from you:',
    '',
    '1. Identity Proof',
    '2. Address Proof',
    '3. Educational Certificates',
    '4. Previous Employment Documents (where applicable)',
    '5. Bank Account Details',
    '6. Other Organization-required Documents',
    '',
    'Please submit your documents using your personal link:',
    link,
    '',
    `Position: ${offer.designation}`,
    `Reference: ${offer.applicationId}`,
    `Proposed joining date: ${formatDate(offer.joiningDate)}`,
    '',
    'The link is personal to you. Do not share it. Accepted file types are PDF, DOC and DOCX (maximum 5 MB per file).',
    '',
    'Best Regards,',
    'HR Recruitment Team',
    'Ecometrix',
    '',
    'Note: this is a simulated email recorded by the Ecometrix Talent Acquisition demo. No real email was delivered.',
  ].join('\n');

  return { subject: DOCUMENT_REQUEST_EMAIL_SUBJECT, body };
}

export function buildResubmissionEmail({ candidate, documentLabel, remarks, link }) {
  const body = [
    `Dear ${candidate.fullName},`,
    '',
    `We could not verify the following document: ${documentLabel}.`,
    '',
    `Reason: ${remarks || 'The document did not meet the verification requirements.'}`,
    '',
    'Please submit a replacement document using your personal link:',
    link,
    '',
    'Accepted file types are PDF, DOC and DOCX (maximum 5 MB per file).',
    '',
    'Best Regards,',
    'HR Recruitment Team',
    'Ecometrix',
    '',
    'Note: this is a simulated email recorded by the Ecometrix Talent Acquisition demo. No real email was delivered.',
  ].join('\n');

  return { subject: RESUBMISSION_EMAIL_SUBJECT, body };
}
