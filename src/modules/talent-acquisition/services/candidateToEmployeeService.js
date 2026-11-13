import { createServiceError } from './mockBackend.js';
import { JOINING_STATUS, MANDATORY_CHECKLIST_KEYS } from '../constants/joiningStatus.js';
import { formatDate } from '../utils/formatDate.js';

/**
 * Controlled integration boundary between Talent Acquisition and the
 * Employee Databank.
 *
 * The Talent Acquisition module never writes into the Employee Databank
 * storage directly. It builds a handover payload that the existing Employee
 * Databank public contract (`employeeService.createEmployee`) can consume.
 * The databank decides whether and when the record is created.
 */

export const HANDOVER_STATUS = {
  NOT_READY: 'not_ready',
  READY_FOR_REVIEW: 'ready_for_review',
  AWAITING_IMPORT: 'awaiting_import',
  IMPORTED: 'imported',
  IMPORT_FAILED: 'import_failed',
};

export function getHandoverReadiness(joining, { offer, application } = {}) {
  const missing = getMandatoryIncomplete(joining);
  const reasons = [];

  if (!application) reasons.push('No application is linked to this joining record.');
  if (!offer) reasons.push('No offer is linked to this joining record.');
  else if (offer.status !== 'accepted') {
    reasons.push('The offer has not been accepted by the candidate.');
  }

  if (!joining) reasons.push('The joining record could not be found.');
  else if (joining.status !== JOINING_STATUS.JOINED) {
    reasons.push('The candidate has not been marked as joined yet.');
  }

  for (const item of missing) {
    reasons.push(item);
  }

  return {
    ready: reasons.length === 0,
    reasons,
    missing,
    mandatoryComplete: missing.length === 0,
  };
}

/**
 * Lists the mandatory joining requirements that are not yet satisfied.
 */
export function getMandatoryIncomplete(joining) {
  const missing = [];

  const documents = Array.isArray(joining?.documents) ? joining.documents : [];
  const documentByType = new Map(documents.map((document) => [document.type, document]));

  const checklistItems = Array.isArray(joining?.checklist) ? joining.checklist : [];
  const checklist = new Map(checklistItems.map((item) => [item.key, item]));

  for (const key of MANDATORY_CHECKLIST_KEYS) {
    const item = checklist.get(key);
    if (!item || item.status !== 'verified') {
      const definition = MANDATORY_CHECKLIST_LABELS[key] || key;
      missing.push(`${definition} is not verified yet.`);
    }
  }

  const missingDocuments = documents.filter(
    (document) => document.status !== 'verified' && document.status !== 'not_applicable'
  );
  for (const document of missingDocuments) {
    missing.push(`The document "${document.fileName || document.type}" is not verified yet.`);
  }

  // A mandatory document that has never been submitted at all.
  const requiredDocumentTypes = ['identity', 'degree', 'bank'];
  for (const type of requiredDocumentTypes) {
    if (!documentByType.has(type)) {
      missing.push(`A document of type "${type}" is still required.`);
    }
  }

  return missing;
}

const MANDATORY_CHECKLIST_LABELS = {
  identity: 'Identity document',
  address: 'Address document',
  degree: 'Degree certificate',
  marksheets: 'Educational mark sheets',
  previous_employment: 'Previous employment information',
  bank: 'Bank details',
  emergency_contact: 'Emergency contact information',
  employment_details: 'Employment details',
  joining_date: 'Joining date confirmation',
  offer_acceptance: 'Offer acceptance verification',
};

/**
 * Validates the mandatory employee fields for the Employee Databank contract.
 */
export function validateEmployeeHandover(payload) {
  const missing = [];

  if (!payload?.employee?.fullName?.trim()) missing.push('Full name is required.');
  if (!payload?.employee?.email?.trim()) missing.push('Email is required.');
  if (!payload?.employee?.contactNumber?.trim()) missing.push('Phone number is required.');
  if (!payload?.employee?.designation?.trim()) missing.push('Designation is required.');
  if (!payload?.employee?.department?.trim()) missing.push('Department is required.');
  if (!payload?.employee?.employmentType?.trim()) missing.push('Employment type is required.');
  if (!payload?.employee?.joiningDate) missing.push('Joining date is required.');

  return { valid: missing.length === 0, missing };
}

/**
 * Builds the employee handover payload. It is a plain object: nothing is
 * written to the Employee Databank storage from here.
 */
export function buildEmployeeHandoverPayload({
  candidate,
  application,
  job,
  offer,
  joining,
}) {
  const education = Array.isArray(candidate?.education) ? candidate.education : [];
  const experience = Array.isArray(candidate?.experience) ? candidate.experience : [];

  const documents = (joining?.documents || [])
    .filter((document) => document.status === 'verified' || document.status === 'resubmission_required')
    .map((document) => ({
      reference: document.documentId,
      name: document.fileName,
      type: document.type,
      mimeType: document.mimeType,
      sizeBytes: document.sizeBytes,
      verifiedAt:
        (document.history || []).find((entry) => entry.action === 'Verified')?.at ||
        document.submittedAt,
      verifiedBy: document.verifiedBy || 'HR Administrator',
    }));

  const payload = {
    source: 'talent-acquisition',
    generatedAt: new Date().toISOString(),
    candidateId: candidate?.candidateId || '',
    applicationId: application?.applicationId || '',
    joiningId: joining?.joiningId || '',
    offerId: offer?.offerId || '',
    joiningStatus: joining?.status || '',
    employee: {
      fullName: candidate?.fullName || '',
      email: candidate?.email || '',
      phone: candidate?.phone || candidate?.contactNumber || '',
      contactNumber: candidate?.phone || candidate?.contactNumber || '',
      designation: offer?.designation || job?.designation || '',
      department: offer?.department || job?.department || '',
      employmentType: offer?.employmentType || job?.employmentType || '',
      reportingManager: offer?.reportingManager || '',
      salaryPackage: Number(offer?.salaryPackage) || 0,
      salary: Number(offer?.salaryPackage) || 0,
      totalExperience: candidate?.totalExperienceYears ?? null,
      experience: candidate?.totalExperienceYears ?? null,
      joiningDate: joining?.joinedAt || joining?.joiningDate || '',
      employmentStatus: 'current',
      source: 'talent-acquisition',
    },
    documents,
    education: education.map((item) => ({
      qualification: item.qualification || '',
      institution: item.institution || '',
      specialization: item.specialization || '',
      passingYear: item.passingYear || '',
    })),
    experienceHistory: experience.map((item) => ({
      company: item.company || '',
      designation: item.designation || '',
      from: item.from || '',
      to: item.to || '',
      responsibilities: item.responsibilities || '',
    })),
    education_summary: education[0] ? education[0].qualification : '',
  };

  Object.assign(payload, {
    educationDetails: education.map((item) => ({ ...item })),
  });

  return payload;
}

export function describeHandover(payload) {
  if (!payload) return 'No handover payload has been prepared.';
  return `${payload.employee?.fullName || 'Candidate'} · ${payload.employee?.designation || 'Designation'} · joining ${formatDate(
    payload.employee?.joiningDate
  )}`;
}

/**
 * Throws a user-facing error when the handover cannot be prepared or imported.
 */
export function assertHandoverPossible(joining, offer) {
  if (!joining) {
    throw createServiceError('Joining record could not be found.');
  }
  if (!offer || offer.status !== 'accepted') {
    throw createServiceError(
      'An accepted offer is required before the candidate can be handed over to the Employee Databank.'
    );
  }
  if (joining.status !== JOINING_STATUS.JOINED) {
    throw createServiceError(
      'The candidate must be marked as joined before the handover can be prepared.'
    );
  }
}

export function getHandoverReadinessStatus(joining) {
  if (joining?.handover?.status) return joining.handover.status;
  if (joining?.status === JOINING_STATUS.JOINED) return HANDOVER_STATUS.READY_FOR_REVIEW;
  return HANDOVER_STATUS.NOT_READY;
}
