export const EMPLOYEE_STATUS = {
  CURRENT: 'current',
  FORMER: 'former',
};

export const EMPLOYEE_STATUS_META = {
  [EMPLOYEE_STATUS.CURRENT]: { label: 'Current Employee', shortLabel: 'Current', variant: 'green' },
  [EMPLOYEE_STATUS.FORMER]: { label: 'Former Employee', shortLabel: 'Former', variant: 'grey' },
};

export const INVITATION_STATUS = {
  SENT: 'sent',
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  EXPIRED: 'expired',
};

// Business states shown to HR. An invitation that has been issued but not
// started is "Pending"; legacy records stored as "sent" are surfaced as
// Pending as well.
export const INVITATION_STATUS_META = {
  [INVITATION_STATUS.PENDING]: { label: 'Pending', variant: 'orange' },
  [INVITATION_STATUS.IN_PROGRESS]: { label: 'In Progress', variant: 'blue' },
  [INVITATION_STATUS.COMPLETED]: { label: 'Completed', variant: 'green' },
  [INVITATION_STATUS.EXPIRED]: { label: 'Expired', variant: 'red' },
};

export const INVITATION_STATUS_OPTIONS = Object.entries(INVITATION_STATUS_META).map(
  ([value, meta]) => ({ value, label: meta.label })
);

/**
 * Resolves the display metadata for an invitation status.
 * Legacy records stored as "sent" are pending invitations.
 */
export function getInvitationStatusMeta(status) {
  const key = status === INVITATION_STATUS.SENT ? INVITATION_STATUS.PENDING : status;
  return INVITATION_STATUS_META[key] || INVITATION_STATUS_META[INVITATION_STATUS.PENDING];
}

export const INVITATION_ACTION = {
  RESEND_INVITATION: 'resend_invitation',
  RESEND_REMINDER: 'resend_reminder',
  REMIND_TO_SUBMIT: 'remind_to_submit',
  RENEW_AND_RESEND: 'renew_and_resend',
  VIEW_DETAILS: 'view_details',
};

export const INVITATION_ACTION_META = {
  [INVITATION_ACTION.RESEND_INVITATION]: {
    label: 'Resend Invitation',
    buttonLabel: 'Resend',
    variant: 'outline',
    purpose:
      'The invitation email was not started. Resending re-issues the existing invitation link so the employee can begin their profile.',
  },
  [INVITATION_ACTION.RESEND_REMINDER]: {
    label: 'Resend Reminder',
    buttonLabel: 'Remind',
    variant: 'outline',
    purpose:
      'The employee has started but not completed their profile. The reminder asks them to continue from their saved draft.',
  },
  [INVITATION_ACTION.REMIND_TO_SUBMIT]: {
    label: 'Remind to Submit',
    buttonLabel: 'Remind to Submit',
    variant: 'outline',
    purpose:
      'The profile is fully completed but not submitted yet. The reminder asks the employee to submit their finished profile.',
  },
  [INVITATION_ACTION.RENEW_AND_RESEND]: {
    label: 'Renew & Resend',
    buttonLabel: 'Renew',
    variant: 'outline',
    purpose:
      'The invitation link expired. Renewing issues a new invitation link and keeps the saved profile draft.',
  },
  [INVITATION_ACTION.VIEW_DETAILS]: {
    label: 'View Details',
    buttonLabel: 'Details',
    variant: 'ghost',
    purpose: 'The profile was submitted. No further reminder is required.',
  },
};

export const SUBMISSION_STATUS = {
  PENDING: 'pending',
  VALIDATED: 'validated',
  REJECTED: 'rejected',
};

export const SUBMISSION_STATUS_META = {
  [SUBMISSION_STATUS.PENDING]: { label: 'Awaiting validation', variant: 'orange' },
  [SUBMISSION_STATUS.VALIDATED]: { label: 'Validated', variant: 'green' },
  [SUBMISSION_STATUS.REJECTED]: { label: 'Rejected', variant: 'red' },
};

export const SUBMISSION_STATUS_OPTIONS = Object.entries(SUBMISSION_STATUS_META).map(
  ([value, meta]) => ({ value, label: meta.label })
);

export const CV_STATUS = {
  PROVIDED: 'provided',
  MISSING: 'missing',
};

export const CV_STATUS_META = {
  [CV_STATUS.PROVIDED]: { label: 'CV attached', variant: 'green' },
  [CV_STATUS.MISSING]: { label: 'No CV', variant: 'grey' },
};

export const DEPARTMENTS = [
  'Human Resources',
  'Engineering',
  'Product',
  'Design',
  'Finance',
  'Sales',
  'Marketing',
  'Operations',
  'Customer Success',
  'Legal',
];

export const EMPLOYMENT_TYPES = [
  'Full-time',
  'Part-time',
  'Contract',
  'Internship',
  'Consultant',
];

export const PROFILE_COMPLETION_FIELDS = [
  'fullName',
  'email',
  'contactNumber',
  'department',
  'designation',
  'joiningDate',
  'employmentType',
  'education.qualification',
  'education.institution',
];

// Self-service onboarding requires the employee id to be assigned by HR, so the
// tracked requirements are the shared fields plus the mandatory CV upload.
export const ONBOARDING_COMPLETION_FIELDS = [...PROFILE_COMPLETION_FIELDS, 'cv'];

// Manual employee entry requires an employee id instead of a CV.
export const MANUAL_COMPLETION_FIELDS = [...PROFILE_COMPLETION_FIELDS, 'employeeId'];

export const PROFILE_COMPLETION_FIELD_LABELS = {
  fullName: 'Full name',
  email: 'Email address',
  contactNumber: 'Contact number',
  department: 'Department',
  designation: 'Designation',
  joiningDate: 'Joining date',
  employmentType: 'Employment type',
  'education.qualification': 'Qualification',
  'education.institution': 'Institution name',
  cv: 'CV document',
  employeeId: 'Employee ID',
};

export const INVITATION_EXPIRY_DAYS = 7;
export const OTP_EXPIRY_MINUTES = 10;
export const OTP_LENGTH = 6;
