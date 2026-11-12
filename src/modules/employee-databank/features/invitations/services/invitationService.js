import {
  INVITATION_EXPIRY_DAYS,
  INVITATION_STATUS,
  ONBOARDING_COMPLETION_FIELDS,
  OTP_EXPIRY_MINUTES,
  OTP_LENGTH,
} from '../../../constants/employeeStatus.js';
import {
  computeProfileCompletion,
  isRequirementComplete,
  normalizeProfileData,
} from '../../../utils/formatEmployeeData.js';
import {
  createServiceError,
  delay,
  isDuplicateEmail,
  isInvitationExpired,
  makeId,
  makeToken,
  mutateDatabase,
  normalizeInvitation,
  readDatabase,
} from '../../../services/mockBackend.js';
import emailService, { EMAIL_KIND } from './emailService.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ACTIVE_INVITATION_STATUSES = [
  INVITATION_STATUS.PENDING,
  INVITATION_STATUS.IN_PROGRESS,
];

function buildInviteLink(token) {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/employee-invite/${token}`;
}

function generateOtp() {
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    const values = new Uint32Array(1);
    window.crypto.getRandomValues(values);
    return String(100000 + (values[0] % 900000));
  }
  return String(Math.floor(100000 + Math.random() * 900000));
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function ensureAvailableEmail(database, email, excludeInvitationId = null) {
  if (!EMAIL_REGEX.test(email)) {
    throw createServiceError('Enter a valid email address.', {
      email: 'Enter a valid email address.',
    });
  }

  if (isDuplicateEmail(database, email)) {
    throw createServiceError('This email already belongs to an employee record.', {
      email: 'This email already belongs to an employee record.',
    });
  }

  const activeInvitation = database.invitations.find((invitation) => {
    if (invitation.id === excludeInvitationId) return false;
    const normalized = normalizeInvitation(invitation);
    return (
      normalizeEmail(invitation.email) === email &&
      ACTIVE_INVITATION_STATUSES.includes(normalized.status)
    );
  });

  if (activeInvitation) {
    throw createServiceError('An active invitation already exists for this email.', {
      email: 'An active invitation already exists for this email.',
    });
  }
}

/**
 * Counts the requirements the employee actually filled in.
 * The name and the email are pre-filled from the invitation, so they never
 * count as "the employee started the profile".
 */
function countEmployeeProvidedFields(draft) {
  if (!draft) return 0;
  return ONBOARDING_COMPLETION_FIELDS.filter(
    (field) => field !== 'fullName' && field !== 'email'
  ).filter((field) => isRequirementComplete(readField(draft, field))).length;
}

function readField(source, path) {
  return path.split('.').reduce((accumulator, key) => {
    if (accumulator === null || accumulator === undefined) return undefined;
    return accumulator[key];
  }, source);
}

/**
 * Business state of an invitation.
 *
 * - Pending: sent, the employee has not started the profile yet.
 * - In Progress: the employee saved a draft and has not submitted yet.
 * - Completed: the profile was submitted (and only ever set by a submission).
 * - Expired: the token expired and was not renewed.
 */
function resolveStatus({ hasDraft, hasSubmission, isCompleted, startedFields = 0 }) {
  if (hasSubmission || isCompleted) return INVITATION_STATUS.COMPLETED;
  if (hasDraft && startedFields > 0) return INVITATION_STATUS.IN_PROGRESS;
  return INVITATION_STATUS.PENDING;
}

function renewalFields(now) {
  return {
    token: makeToken('invite'),
    expiresAt: new Date(now.getTime() + INVITATION_EXPIRY_DAYS * 86400000).toISOString(),
    tokenRenewedAt: now.toISOString(),
  };
}

export const invitationService = {
  async getInvitations() {
    await delay(240);
    const database = readDatabase();
    return database.invitations
      .map((invitation) => normalizeInvitation(invitation))
      .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
  },

  async getInvitationByToken(token) {
    await delay(200);
    const database = readDatabase();
    const invitation = database.invitations.find((item) => item.token === token);
    return invitation ? normalizeInvitation(invitation) : null;
  },

  async getInvitationById(id) {
    await delay(160);
    const database = readDatabase();
    const invitation = database.invitations.find((item) => item.id === id);
    return invitation ? normalizeInvitation(invitation) : null;
  },

  async sendInvitation({ email, fullName = '' }) {
    await delay(460);
    const normalizedEmail = normalizeEmail(email);

    const { invitation } = mutateDatabase((database) => {
      ensureAvailableEmail(database, normalizedEmail);

      const now = new Date();
      const timestamp = now.toISOString();
      const invitation = {
        id: makeId('inv'),
        email: normalizedEmail,
        fullName: String(fullName || '').trim(),
        token: makeToken('invite'),
        status: INVITATION_STATUS.PENDING,
        sentAt: timestamp,
        initialSentAt: timestamp,
        expiresAt: new Date(now.getTime() + INVITATION_EXPIRY_DAYS * 86400000).toISOString(),
        completedAt: null,
        submissionId: null,
        emailVerified: false,
        emailVerifiedAt: null,
        otpCode: null,
        otpExpiresAt: null,
        sendCount: 1,
        profileDraft: null,
        profileCompletion: 0,
        draftUpdatedAt: null,
        reminders: [],
        reminderCount: 0,
        lastReminderSentAt: null,
        openedAt: null,
        tokenRenewedAt: null,
        tokenRenewalCount: 0,
        createdAt: timestamp,
      };

      database.invitations.unshift(invitation);

      return { invitation };
    });

    const delivery = await emailService.sendEmail({
      kind: EMAIL_KIND.INVITATION,
      invitation,
      link: buildInviteLink(invitation.token),
    });

    return { invitation, delivery };
  },

  /**
   * Re-sends the invitation for an employee who has not started yet.
   * The existing link and the saved draft are preserved. When the token had
   * expired it is renewed and the previous token is invalidated.
   */
  async resendInvitation(id) {
    await delay(420);
    const result = await mutateDatabase((database) => {
      const index = database.invitations.findIndex((item) => item.id === id);
      if (index === -1) {
        throw createServiceError('Invitation could not be found.');
      }

      const invitation = normalizeInvitation(database.invitations[index]);
      if (invitation.status === INVITATION_STATUS.COMPLETED) {
        throw createServiceError('Completed invitations cannot be resent.');
      }

      const now = new Date();
      const timestamp = now.toISOString();
      const wasExpired =
        invitation.status === INVITATION_STATUS.EXPIRED || isInvitationExpired(invitation);

      const updated = {
        ...invitation,
        initialSentAt: invitation.initialSentAt || invitation.sentAt,
        sentAt: timestamp,
        sendCount: (invitation.sendCount || 1) + 1,
        otpCode: null,
        otpExpiresAt: null,
        status: resolveStatus({
          hasDraft: Boolean(invitation.profileDraft),
          hasSubmission: Boolean(invitation.submissionId),
          isCompleted: invitation.status === INVITATION_STATUS.COMPLETED,
          startedFields: countEmployeeProvidedFields(invitation.profileDraft),
        }),
      };

      if (wasExpired) {
        Object.assign(updated, renewalFields(now));
        updated.tokenRenewalCount = (invitation.tokenRenewalCount || 0) + 1;
        updated.emailVerified = false;
        updated.emailVerifiedAt = null;
      } else {
        updated.expiresAt = new Date(
          now.getTime() + INVITATION_EXPIRY_DAYS * 86400000
        ).toISOString();
      }

      database.invitations[index] = updated;

      return {
        invitation: updated,
        kind: wasExpired ? EMAIL_KIND.RENEW : EMAIL_KIND.RESEND,
        renewedToken: wasExpired,
      };
    });

    const delivery = await emailService.sendEmail({
      kind: result.kind,
      invitation: result.invitation,
      link: buildInviteLink(result.invitation.token),
    });

    return { ...result, delivery };
  },

  /**
   * Renews an expired invitation: a new token is generated, the previous one
   * stops working, the saved draft is preserved and the renewal is recorded.
   */
  async renewInvitation(id) {
    await delay(420);
    const result = await mutateDatabase((database) => {
      const index = database.invitations.findIndex((item) => item.id === id);
      if (index === -1) {
        throw createServiceError('Invitation could not be found.');
      }

      const invitation = normalizeInvitation(database.invitations[index]);
      if (invitation.status === INVITATION_STATUS.COMPLETED) {
        throw createServiceError('Completed invitations cannot be renewed.');
      }

      const now = new Date();
      const updated = {
        ...invitation,
        ...renewalFields(now),
        tokenRenewalCount: (invitation.tokenRenewalCount || 0) + 1,
        sentAt: now.toISOString(),
        sendCount: (invitation.sendCount || 1) + 1,
        otpCode: null,
        otpExpiresAt: null,
        emailVerified: false,
        emailVerifiedAt: null,
        status: resolveStatus({
          hasDraft: Boolean(invitation.profileDraft),
          hasSubmission: Boolean(invitation.submissionId),
          isCompleted: invitation.status === INVITATION_STATUS.COMPLETED,
          startedFields: countEmployeeProvidedFields(invitation.profileDraft),
        }),
      };

      database.invitations[index] = updated;

      return { invitation: updated, renewedToken: true, kind: EMAIL_KIND.RENEW };
    });

    const delivery = await emailService.sendEmail({
      kind: result.kind,
      invitation: result.invitation,
      link: buildInviteLink(result.invitation.token),
    });

    return { ...result, delivery };
  },

  /**
   * Records a reminder for an invitation that is not complete yet.
   * The reminder keeps the existing link and draft, updates the reminder
   * history and never marks the invitation as completed.
   */
  async sendReminder(id, { purpose = 'reminder' } = {}) {
    await delay(440);
    const result = await mutateDatabase((database) => {
      const index = database.invitations.findIndex((item) => item.id === id);
      if (index === -1) {
        throw createServiceError('Invitation could not be found.');
      }

      const invitation = normalizeInvitation(database.invitations[index]);
      if (invitation.status === INVITATION_STATUS.COMPLETED) {
        throw createServiceError('Completed invitations do not receive reminders.');
      }

      const now = new Date();
      const timestamp = now.toISOString();
      const wasExpired =
        invitation.status === INVITATION_STATUS.EXPIRED || isInvitationExpired(invitation);
      const profileCompletion = invitation.profileDraft
        ? computeProfileCompletion(invitation.profileDraft)
        : Number(invitation.profileCompletion) || 0;

      const reminder = {
        id: makeId('rem'),
        sentAt: timestamp,
        mode: 'mock',
        sent: false,
        purpose,
        profileCompletion,
        renewedToken: wasExpired,
      };

      const updated = {
        ...invitation,
        profileCompletion,
        reminders: [...invitation.reminders, reminder],
        reminderCount: invitation.reminderCount + 1,
        lastReminderSentAt: timestamp,
        status: resolveStatus({
          hasDraft: Boolean(invitation.profileDraft),
          hasSubmission: Boolean(invitation.submissionId),
          isCompleted: false,
          startedFields: countEmployeeProvidedFields(invitation.profileDraft),
        }),
      };

      if (wasExpired) {
        Object.assign(updated, renewalFields(now));
        updated.tokenRenewalCount = (invitation.tokenRenewalCount || 0) + 1;
        updated.emailVerified = false;
        updated.emailVerifiedAt = null;
        updated.otpCode = null;
        updated.otpExpiresAt = null;
      }

      database.invitations[index] = updated;

      return {
        invitation: updated,
        renewedToken: wasExpired,
        kind: wasExpired
          ? EMAIL_KIND.RENEW
          : purpose === 'submit'
            ? EMAIL_KIND.SUBMIT_REMINDER
            : EMAIL_KIND.REMINDER,
      };
    });

    const delivery = await emailService.sendEmail({
      kind: result.kind,
      invitation: result.invitation,
      link: buildInviteLink(result.invitation.token),
    });

    return { ...result, delivery };
  },

  async markOpened(token) {
    await delay(150);
    return mutateDatabase((database) => {
      const index = database.invitations.findIndex((item) => item.token === token);
      if (index === -1) return null;
      const invitation = normalizeInvitation(database.invitations[index]);
      const updated = {
        ...invitation,
        openedAt: invitation.openedAt || new Date().toISOString(),
      };
      database.invitations[index] = updated;
      return updated;
    });
  },

  /**
   * Stores the employee draft. The completion percentage is recalculated from
   * the saved values, the CV reference is kept and the invitation moves to
   * "In Progress" without ever being marked as completed.
   */
  async saveDraft(token, payload) {
    await delay(280);
    return mutateDatabase((database) => {
      const index = database.invitations.findIndex((item) => item.token === token);
      if (index === -1) {
        throw createServiceError('This invitation link is not valid.');
      }

      const invitation = normalizeInvitation(database.invitations[index]);
      if (invitation.status === INVITATION_STATUS.COMPLETED) {
        throw createServiceError('This invitation has already been completed.');
      }

      const profileDraft = normalizeProfileData(payload || {}, payload?.cv || null);
      const profileCompletion = computeProfileCompletion(profileDraft);
      const updated = {
        ...invitation,
        profileDraft,
        profileCompletion,
        draftUpdatedAt: new Date().toISOString(),
        status: resolveStatus({
          hasDraft: true,
          hasSubmission: Boolean(invitation.submissionId),
          isCompleted: false,
          startedFields: countEmployeeProvidedFields(profileDraft),
        }),
      };

      database.invitations[index] = updated;
      return updated;
    });
  },

  async requestOtp(token) {
    await delay(520);
    return mutateDatabase((database) => {
      const index = database.invitations.findIndex((item) => item.token === token);
      if (index === -1) {
        throw createServiceError('This invitation link is not valid.');
      }

      const invitation = normalizeInvitation(database.invitations[index]);
      if (invitation.status === INVITATION_STATUS.COMPLETED) {
        throw createServiceError('This invitation has already been completed.');
      }
      if (invitation.status === INVITATION_STATUS.EXPIRED) {
        throw createServiceError('This invitation has expired. Ask HR to resend it.');
      }

      const now = new Date();
      const otpCode = generateOtp();
      const otpExpiresAt = new Date(now.getTime() + OTP_EXPIRY_MINUTES * 60000).toISOString();

      const updated = {
        ...invitation,
        otpCode,
        otpExpiresAt,
        otpRequestedAt: now.toISOString(),
      };

      database.invitations[index] = updated;

      return {
        email: invitation.email,
        expiresAt: otpExpiresAt,
        otpLength: OTP_LENGTH,
        delivery: {
          mode: 'mock',
          sent: false,
          message:
            'Mock mode: no email was sent. The demonstration code is shown on screen so the OTP flow can be tested.',
          code: otpCode,
        },
      };
    });
  },

  async verifyOtp(token, code) {
    await delay(420);
    return mutateDatabase((database) => {
      const index = database.invitations.findIndex((item) => item.token === token);
      if (index === -1) {
        throw createServiceError('This invitation link is not valid.');
      }

      const invitation = normalizeInvitation(database.invitations[index]);
      if (invitation.status === INVITATION_STATUS.EXPIRED) {
        throw createServiceError('This invitation has expired. Ask HR to resend it.');
      }
      if (invitation.status === INVITATION_STATUS.COMPLETED) {
        throw createServiceError('This invitation has already been completed.');
      }
      if (!invitation.otpCode) {
        throw createServiceError('Request an OTP before trying to verify.');
      }

      if (new Date(invitation.otpExpiresAt).getTime() < Date.now()) {
        throw createServiceError('This OTP has expired. Request a new code.');
      }

      if (String(code).trim() !== invitation.otpCode) {
        throw createServiceError('The OTP entered is incorrect. Please try again.');
      }

      const updated = {
        ...invitation,
        emailVerified: true,
        emailVerifiedAt: new Date().toISOString(),
        otpCode: null,
        otpExpiresAt: null,
      };

      database.invitations[index] = updated;
      return updated;
    });
  },

  async markCompleted(token, submissionId) {
    await delay(120);
    return mutateDatabase((database) => {
      const index = database.invitations.findIndex((item) => item.token === token);
      if (index === -1) return null;
      const updated = {
        ...database.invitations[index],
        status: INVITATION_STATUS.COMPLETED,
        completedAt: new Date().toISOString(),
        submissionId,
      };
      database.invitations[index] = updated;
      return updated;
    });
  },
};

export default invitationService;
