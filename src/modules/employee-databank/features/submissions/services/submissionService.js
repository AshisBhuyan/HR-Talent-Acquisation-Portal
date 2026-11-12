import {
  INVITATION_EXPIRY_DAYS,
  INVITATION_STATUS,
  ONBOARDING_COMPLETION_FIELDS,
  SUBMISSION_STATUS,
} from '../../../constants/employeeStatus.js';
import { computeProfileCompletion, getCvStatus } from '../../../utils/formatEmployeeData.js';
import {
  createServiceError,
  delay,
  makeId,
  mutateDatabase,
  nextEmployeeCode,
  normalizeInvitation,
  readDatabase,
} from '../../../services/mockBackend.js';

function normalizeSubmittedProfile(payload = {}) {
  return {
    employeeId: payload.employeeId?.trim() || '',
    fullName: payload.fullName?.trim() || '',
    email: payload.email?.trim() || '',
    contactNumber: payload.contactNumber?.trim() || '',
    profilePhoto: payload.profilePhoto || '',
    department: payload.department || '',
    designation: payload.designation?.trim() || '',
    joiningDate: payload.joiningDate || '',
    employmentType: payload.employmentType || '',
    reportingManager: payload.reportingManager?.trim() || '',
    education: {
      qualification: payload.education?.qualification?.trim() || '',
      institution: payload.education?.institution?.trim() || '',
      specialization: payload.education?.specialization?.trim() || '',
      passingYear: payload.education?.passingYear?.trim() || '',
    },
    experience: {
      previousCompany: payload.experience?.previousCompany?.trim() || '',
      previousDesignation: payload.experience?.previousDesignation?.trim() || '',
      totalExperience: payload.experience?.totalExperience?.trim() || '',
      jobResponsibilities: payload.experience?.jobResponsibilities?.trim() || '',
    },
    cv: payload.cv || null,
  };
}

function withRecomputedCompletion(submission) {
  if (!submission?.data || typeof submission.data !== 'object') return submission;
  return {
    ...submission,
    profileCompletion: computeProfileCompletion(submission.data, {
      fields: ONBOARDING_COMPLETION_FIELDS,
    }),
  };
}

export const submissionService = {
  async getSubmissions() {
    await delay(260);
    const database = readDatabase();
    return database.submissions
      .map(withRecomputedCompletion)
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  },

  async getSubmissionById(id) {
    await delay(160);
    const database = readDatabase();
    const submission = database.submissions.find((item) => item.id === id);
    return submission ? withRecomputedCompletion(submission) : null;
  },

  async createSubmission(token, payload) {
    await delay(520);
    return mutateDatabase((database) => {
      const invitationIndex = database.invitations.findIndex((item) => item.token === token);
      if (invitationIndex === -1) {
        throw createServiceError('This invitation link is not valid.');
      }

      const invitation = normalizeInvitation(database.invitations[invitationIndex]);

      if (invitation.status === INVITATION_STATUS.COMPLETED) {
        throw createServiceError('A profile has already been submitted for this invitation.');
      }
      if (invitation.status === INVITATION_STATUS.EXPIRED) {
        throw createServiceError('This invitation has expired. Ask HR to resend it.');
      }
      if (!invitation.emailVerified) {
        throw createServiceError('Verify your email with the OTP before submitting your profile.');
      }

      const profile = normalizeSubmittedProfile({
        ...payload,
        email: invitation.email,
        fullName: payload.fullName?.trim() || invitation.fullName || '',
      });
      const profileCompletion = computeProfileCompletion(profile, {
        fields: ONBOARDING_COMPLETION_FIELDS,
      });

      if (profileCompletion < 100) {
        throw createServiceError(
          'Complete all required profile fields before submitting your profile.'
        );
      }
      if (!profile.cv) {
        throw createServiceError('Upload your CV before submitting your profile.');
      }

      // Duplicate prevention: one invitation can only produce one submission.
      const duplicateSubmission = database.submissions.find(
        (item) => item.invitationId === invitation.id && item.status !== SUBMISSION_STATUS.REJECTED
      );
      if (duplicateSubmission) {
        throw createServiceError('A profile has already been submitted for this invitation.');
      }

      const now = new Date().toISOString();

      const submission = {
        id: makeId('sub'),
        invitationId: invitation.id,
        token,
        employeeName: profile.fullName || invitation.fullName || invitation.email,
        email: profile.email || invitation.email,
        submittedAt: now,
        profileCompletion,
        cvStatus: getCvStatus(profile.cv),
        status: SUBMISSION_STATUS.PENDING,
        validatedAt: null,
        employeeRecordId: null,
        data: profile,
      };

      database.submissions.unshift(submission);
      database.invitations[invitationIndex] = {
        ...invitation,
        status: INVITATION_STATUS.COMPLETED,
        completedAt: now,
        submissionId: submission.id,
        profileDraft: profile,
        profileCompletion,
        draftUpdatedAt: now,
      };

      return submission;
    });
  },

  async validateSubmission(id) {
    await delay(520);
    return mutateDatabase((database) => {
      const submissionIndex = database.submissions.findIndex((item) => item.id === id);
      if (submissionIndex === -1) {
        throw createServiceError('Submission could not be found.');
      }

      const submission = database.submissions[submissionIndex];
      if (submission.status !== SUBMISSION_STATUS.PENDING) {
        throw createServiceError('This submission has already been processed.');
      }

      const profile = normalizeSubmittedProfile(submission.data);
      const email = profile.email.toLowerCase();

      let employee = database.employees.find(
        (item) => String(item.email || '').trim().toLowerCase() === email
      );

      if (!employee && profile.employeeId) {
        employee = database.employees.find(
          (item) =>
            String(item.employeeId || '').trim().toLowerCase() ===
            profile.employeeId.toLowerCase()
        );
      }

      // A former employee with the same email is rehired rather than
      // duplicated, so the databank never holds two records for one person.
      let rehired = false;
      if (!employee) {
        const formerIndex = database.formerEmployees.findIndex(
          (item) => String(item.email || '').trim().toLowerCase() === email
        );
        if (formerIndex !== -1) {
          rehired = true;
          employee = { ...database.formerEmployees[formerIndex] };
          database.formerEmployees.splice(formerIndex, 1);
        }
      }

      const now = new Date().toISOString();
      let created = false;

      if (employee) {
        const index = database.employees.findIndex((item) => item.id === employee.id);
        if (index !== -1) {
          const updated = {
            ...employee,
            ...profile,
            employeeId: employee.employeeId || profile.employeeId,
            cv: profile.cv || employee.cv || null,
            status: 'current',
            source: employee.source || 'self-service',
            createdAt: employee.createdAt || now,
            updatedAt: now,
          };
          database.employees[index] = updated;
          employee = updated;
        } else {
          created = true;
          employee = {
            ...profile,
            id: makeId('emp'),
            employeeId: profile.employeeId || nextEmployeeCode(database),
            status: 'current',
            source: 'self-service',
            createdAt: now,
            updatedAt: now,
          };
          database.employees.unshift(employee);
        }
      } else {
        created = true;
        employee = {
          ...profile,
          id: makeId('emp'),
          employeeId: profile.employeeId || nextEmployeeCode(database),
          status: 'current',
          source: 'self-service',
          createdAt: now,
          updatedAt: now,
        };
        database.employees.unshift(employee);
      }

      database.submissions[submissionIndex] = {
        ...submission,
        status: SUBMISSION_STATUS.VALIDATED,
        validatedAt: now,
        employeeRecordId: employee.id,
      };

      const invitationIndex = database.invitations.findIndex(
        (item) => item.id === submission.invitationId
      );
      if (invitationIndex !== -1) {
        database.invitations[invitationIndex] = {
          ...database.invitations[invitationIndex],
          status: INVITATION_STATUS.COMPLETED,
          completedAt: now,
          submissionId: submission.id,
          profileCompletion: 100,
        };
      }

      return { employee, created, rehired };
    });
  },

  async rejectSubmission(id, reason = '') {
    await delay(420);
    return mutateDatabase((database) => {
      const submissionIndex = database.submissions.findIndex((item) => item.id === id);
      if (submissionIndex === -1) {
        throw createServiceError('Submission could not be found.');
      }

      const submission = database.submissions[submissionIndex];
      if (submission.status !== SUBMISSION_STATUS.PENDING) {
        throw createServiceError('This submission has already been processed.');
      }

      const now = new Date().toISOString();
      const rejected = {
        ...submission,
        status: SUBMISSION_STATUS.REJECTED,
        rejectedAt: now,
        rejectionReason: String(reason || '').trim(),
      };

      database.submissions[submissionIndex] = rejected;

      const invitationIndex = database.invitations.findIndex(
        (item) => item.id === submission.invitationId
      );
      if (invitationIndex !== -1) {
        const profileDraft = normalizeSubmittedProfile(submission.data);
        database.invitations[invitationIndex] = {
          ...database.invitations[invitationIndex],
          // The employee can correct and resubmit: the draft is kept and the
          // invitation returns to In Progress.
          status: INVITATION_STATUS.IN_PROGRESS,
          completedAt: null,
          submissionId: null,
          profileDraft,
          profileCompletion: computeProfileCompletion(profileDraft, {
            fields: ONBOARDING_COMPLETION_FIELDS,
          }),
          draftUpdatedAt: now,
          expiresAt: new Date(
            Date.now() + INVITATION_EXPIRY_DAYS * 86400000
          ).toISOString(),
          emailVerified: false,
          emailVerifiedAt: null,
          otpCode: null,
          otpExpiresAt: null,
        };
      }

      return rejected;
    });
  },
};

export default submissionService;
