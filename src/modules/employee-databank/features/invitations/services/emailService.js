import { makeId, mutateDatabase, readDatabase } from '../../../services/mockBackend.js';

export const EMAIL_KIND = {
  INVITATION: 'invitation',
  REMINDER: 'reminder',
  SUBMIT_REMINDER: 'submit_reminder',
  RESEND: 'resend',
  RENEW: 'renew',
};

export const EMAIL_SUBJECT = {
  [EMAIL_KIND.INVITATION]: 'Complete Your Ecometrix Employee Profile',
  [EMAIL_KIND.REMINDER]: 'Complete Your Ecometrix Employee Profile',
  [EMAIL_KIND.SUBMIT_REMINDER]: 'Submit Your Ecometrix Employee Profile',
  [EMAIL_KIND.RESEND]: 'Complete Your Ecometrix Employee Profile',
  [EMAIL_KIND.RENEW]: 'Your Ecometrix Employee Profile Invitation Has Been Renewed',
};

function greeting(name = '') {
  return name ? `Dear ${name},` : 'Dear Employee,';
}

export function buildEmailBody({
  kind = EMAIL_KIND.REMINDER,
  fullName = '',
  completion = 0,
  link = '',
  expiryDate = '',
}) {
  const signature = 'Regards,\nHR Team\nEcometrix';

  if (kind === EMAIL_KIND.INVITATION || kind === EMAIL_KIND.RESEND) {
    return [
      greeting(fullName),
      '',
      'You have been invited to complete your Ecometrix employee profile.',
      '',
      'Please use your invitation link to complete the required details and attach your CV.',
      '',
      link,
      '',
      signature,
    ].join('\n');
  }

  if (kind === EMAIL_KIND.RENEW) {
    const lines = [
      greeting(fullName),
      '',
      `Your employee profile is ${completion}% complete and your previous invitation link has expired.`,
      '',
      'Please use your new invitation link to continue completing the remaining details.',
      '',
      'Your previously saved information will remain available.',
    ];

    if (expiryDate) {
      lines.push('', `This renewed invitation link is valid until ${expiryDate}.`);
    }

    lines.push('', link, '', signature);
    return lines.join('\n');
  }

  if (kind === EMAIL_KIND.SUBMIT_REMINDER) {
    return [
      greeting(fullName),
      '',
      'Your employee profile is fully complete but has not been submitted yet.',
      '',
      'Please use your invitation link to submit your profile so the HR team can review it.',
      '',
      'Your previously saved information will remain available.',
      '',
      link,
      '',
      signature,
    ].join('\n');
  }

  return [
    greeting(fullName),
    '',
    'Your employee profile is currently incomplete.',
    '',
    'Please use your invitation link to continue completing the remaining details.',
    '',
    'Your previously saved information will remain available.',
    '',
    'Please complete all required information and submit your profile.',
    '',
    link,
    '',
    signature,
  ].join('\n');
}

export function buildEmail({ kind = EMAIL_KIND.REMINDER, invitation = {}, link = '' }) {
  const completion = Number(invitation.profileCompletion) || 0;
  const expiryDate = invitation.expiresAt
    ? new Date(invitation.expiresAt).toISOString().slice(0, 10)
    : '';

  return {
    subject: EMAIL_SUBJECT[kind] || EMAIL_SUBJECT[EMAIL_KIND.REMINDER],
    body: buildEmailBody({
      kind,
      fullName: invitation.fullName || '',
      completion,
      link,
      expiryDate,
    }),
  };
}

/**
 * Mock email provider.
 *
 * The application currently runs in mock mode: nothing is delivered to a real
 * mailbox. Every attempt is recorded in the mock database so the delivery flow
 * can be verified in the UI and in tests. Swapping this implementation for a
 * backend email provider only requires replacing `deliver` — the rest of the
 * application talks to `sendEmail` and never to a provider directly.
 */
const mockProvider = {
  mode: 'mock',
  deliver(event) {
    return {
      mode: 'mock',
      sent: false,
      delivered: false,
      message:
        'Mock mode: no real email was sent. The email content and invitation link are recorded in the mock email log.',
      ...event,
    };
  },
};

export const emailService = {
  provider: mockProvider,

  /**
   * Records a mock email delivery attempt and returns the delivery result.
   * No credentials or network calls are involved in the frontend build.
   */
  async sendEmail({ kind = EMAIL_KIND.REMINDER, invitation = {}, link = '' }) {
    const { subject, body } = buildEmail({ kind, invitation, link });
    const now = new Date().toISOString();

    const event = {
      id: makeId('mail'),
      kind,
      invitationId: invitation.id || null,
      to: invitation.email || '',
      subject,
      body,
      link,
      createdAt: now,
      mode: 'mock',
      sent: false,
    };

    mutateDatabase((database) => {
      if (!Array.isArray(database.emailEvents)) database.emailEvents = [];
      database.emailEvents.unshift(event);
      return event;
    });

    return {
      ...mockProvider.deliver(event),
      subject,
      body,
      link,
      // Kept under the historic key so existing screens that read
      // `delivery.inviteLink` keep working.
      inviteLink: link,
    };
  },

  /**
   * Mock email log. Useful for testing the delivery flow and for showing HR
   * what was "sent" for an invitation.
   */
  async getEmailEvents(invitationId = null) {
    const database = readDatabase();
    const events = Array.isArray(database.emailEvents) ? database.emailEvents : [];
    return events
      .filter((event) => !invitationId || event.invitationId === invitationId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },
};

export default emailService;
