import {
  INVITATION_STATUS,
  ONBOARDING_COMPLETION_FIELDS,
  PROFILE_COMPLETION_FIELD_LABELS,
} from '../constants/employeeStatus.js';

export function getInitials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function getValueByPath(source, path) {
  return path.split('.').reduce((accumulator, key) => {
    if (accumulator === null || accumulator === undefined) return undefined;
    return accumulator[key];
  }, source);
}

/**
 * A requirement counts as complete when it holds a usable value.
 *
 * - strings must contain more than whitespace
 * - numbers/dates must be valid
 * - arrays must not be empty
 * - objects (for example an uploaded CV) must carry actual content
 */
export function isRequirementComplete(value) {
  if (value === null || value === undefined) return false;

  if (typeof value === 'string') return value.trim() !== '';
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value === 'boolean') return value;
  if (value instanceof Date) return !Number.isNaN(value.getTime());

  if (Array.isArray(value)) return value.length > 0;

  if (typeof value === 'object') {
    if (value.name || value.storageKey || value.size) return true;
    return Object.keys(value).length > 0;
  }

  return false;
}

/**
 * Completion percentage of a profile.
 *
 * The tracked requirements are the required fields of the employee form. For
 * self-service onboarding the CV upload is required as well, so it is counted
 * as one of the requirements.
 */
export function computeProfileCompletion(
  data = {},
  { fields = ONBOARDING_COMPLETION_FIELDS } = {}
) {
  const tracked = fields.length ? fields : ONBOARDING_COMPLETION_FIELDS;
  const completed = tracked.filter((field) =>
    isRequirementComplete(getValueByPath(data, field))
  ).length;

  return Math.round((completed / tracked.length) * 100);
}

export function getProfileCompletionDetails(
  data = {},
  { fields = ONBOARDING_COMPLETION_FIELDS } = {}
) {
  const tracked = fields.length ? fields : ONBOARDING_COMPLETION_FIELDS;
  const missingFields = tracked
    .filter((field) => !isRequirementComplete(getValueByPath(data, field)))
    .map((field) => ({
      path: field,
      label: PROFILE_COMPLETION_FIELD_LABELS[field] || field,
    }));

  return {
    completion: computeProfileCompletion(data, { fields: tracked }),
    missingFields,
    completedCount: tracked.length - missingFields.length,
    totalCount: tracked.length,
  };
}

export function getCvStatus(cv) {
  return cv ? 'provided' : 'missing';
}

export function normalizeProfileData(values = {}, cv = null) {
  return {
    employeeId: values.employeeId?.trim() || '',
    fullName: values.fullName?.trim() || '',
    email: values.email?.trim() || '',
    contactNumber: values.contactNumber?.trim() || '',
    profilePhoto: values.profilePhoto || '',
    department: values.department || '',
    designation: values.designation?.trim() || '',
    joiningDate: values.joiningDate || '',
    employmentType: values.employmentType || '',
    reportingManager: values.reportingManager?.trim() || '',
    education: {
      qualification: values.education?.qualification?.trim() || '',
      institution: values.education?.institution?.trim() || '',
      specialization: values.education?.specialization?.trim() || '',
      passingYear: values.education?.passingYear?.trim() || '',
    },
    experience: {
      previousCompany: values.experience?.previousCompany?.trim() || '',
      previousDesignation: values.experience?.previousDesignation?.trim() || '',
      totalExperience: values.experience?.totalExperience?.trim() || '',
      jobResponsibilities: values.experience?.jobResponsibilities?.trim() || '',
    },
    cv: cv || null,
  };
}

export function buildSubmissionData(values = {}, cv = null) {
  return normalizeProfileData(values, cv);
}

/**
 * Completion of an invitation: the live draft wins over the stored value, and
 * a submitted profile always reports its own completion.
 */
export function getInvitationCompletion(invitation, submissions = []) {
  if (!invitation) return 0;

  if (invitation.profileDraft) {
    return computeProfileCompletion(invitation.profileDraft);
  }

  if (invitation.submissionId) {
    const submission = submissions.find((item) => item.id === invitation.submissionId);
    if (submission) {
      if (submission.data && typeof submission.data === 'object') {
        return computeProfileCompletion(submission.data);
      }
      if (Number.isFinite(Number(submission.profileCompletion))) {
        return Number(submission.profileCompletion);
      }
    }
  }

  if (Number.isFinite(Number(invitation.profileCompletion))) {
    return Number(invitation.profileCompletion);
  }

  return invitation.status === INVITATION_STATUS.COMPLETED ? 100 : 0;
}

export function getEmployeeDisplayName(employee) {
  return employee?.fullName || employee?.email || 'Unnamed employee';
}
