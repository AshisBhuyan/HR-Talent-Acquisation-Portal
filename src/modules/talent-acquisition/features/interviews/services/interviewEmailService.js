import {
  mutateDatabase,
  makeId,
  findRecord,
  createServiceError,
} from '../../../services/mockBackend.js';
import { getRoundLabel } from '../../../constants/interviewStatus.js';
import { formatDate, formatTimeOfDay } from '../../../utils/formatDate.js';

export const INTERVIEW_INVITATION_SUBJECT =
  'Congratulations! You Have Been Shortlisted – Interview Invitation';

export const INTERVIEW_INVITATION_STATUS = {
  NOT_SENT: 'not_sent',
  SENT: 'sent',
  FAILED: 'failed',
};

export const INTERVIEW_INVITATION_STATUS_META = {
  [INTERVIEW_INVITATION_STATUS.NOT_SENT]: { label: 'Not Sent', variant: 'grey' },
  [INTERVIEW_INVITATION_STATUS.SENT]: { label: 'Sent', variant: 'green' },
  [INTERVIEW_INVITATION_STATUS.FAILED]: { label: 'Failed', variant: 'red' },
};

export function getInterviewInvitationStatusMeta(status) {
  return INTERVIEW_INVITATION_STATUS_META[status] || INTERVIEW_INVITATION_STATUS_META.not_sent;
}

/**
 * Builds the interview invitation email from the interview record and the
 * candidate. The content follows the corporate shortlist notification.
 */
export function buildInterviewInvitationEmail({ candidate, job, interview, interviewer }) {
  const modeLabel = interview.mode === 'online' ? 'Online' : 'Offline';
  const dateLabel = formatDate(interview.scheduledAt, 'Not scheduled');
  const timeLabel = formatTimeOfDay(interview.scheduledAt, 'Not scheduled');
  const roundLabel = getRoundLabel(interview.round);

  const meetingDetails =
    interview.mode === 'online'
      ? `Meeting Link: ${interview.meetingLink || 'Link to be shared'}`
      : `Venue: ${interview.location || 'Venue to be confirmed'}`;

  const body = [
    `Dear ${candidate.fullName},`,
    '',
    `Congratulations! We are pleased to inform you that you have been shortlisted for the ${job.title} position at Ecometrix.`,
    '',
    'Your interview has been scheduled with the following details:',
    '',
    `Interview Round: ${roundLabel}`,
    `Date: ${dateLabel}`,
    `Time: ${timeLabel}`,
    `Mode: ${modeLabel}`,
    `Interviewer: ${interviewer}`,
    meetingDetails,
    '',
    'Please attend the interview at the scheduled time.',
    '',
    'We look forward to meeting you.',
    '',
    'Best Regards,',
    'HR Recruitment Team',
    'Ecometrix',
  ].join('\n');

  return { subject: INTERVIEW_INVITATION_SUBJECT, body };
}

/**
 * Mock email provider for interview invitations.
 *
 * The frontend records the invitation in the Talent Acquisition mock database
 * so the complete flow works in the demo. No credentials are used and no real
 * email leaves the browser. Every attempt is returned with mode "mock" and is
 * clearly labelled as simulated in the UI. Swapping this implementation for a
 * backend email provider only requires replacing deliver().
 */
const mockProvider = {
  mode: 'mock',
  deliver(event) {
    return {
      mode: 'mock',
      sent: false,
      delivered: false,
      message:
        'Simulated: no real email was delivered. The invitation email is recorded in the Talent Acquisition mock email log.',
      ...event,
    };
  },
};

export const interviewEmailService = {
  provider: mockProvider,

  /**
   * Sends an interview invitation to the candidate. The send happens only
   * when an HR user explicitly clicks "Send Interview Invitation".
   *
   * Duplicate sends are blocked: an interview whose invitation is already
   * marked as sent cannot be sent again unless the attempt previously failed.
   */
  async sendInterviewInvitation(interviewId, { user = 'HR Administrator' } = {}) {
    return mutateDatabase((database) => {
      const interview = findRecord(
        database.interviews,
        (item) => item.interviewId === interviewId
      );
      if (!interview) {
        throw createServiceError('The interview record could not be found.');
      }

      const application = findRecord(
        database.applications,
        (item) => item.applicationId === interview.applicationId
      );
      const candidate = findRecord(
        database.candidates,
        (item) => item.candidateId === interview.candidateId
      );
      const job = findRecord(database.jobs, (item) => item.jobId === interview.jobId);

      if (!candidate) {
        throw createServiceError('The candidate behind this interview could not be found.');
      }
      if (!job) {
        throw createServiceError('The position behind this interview could not be found.');
      }

      const recipient = String(candidate.email || '').trim();
      if (!recipient) {
        throw createServiceError(
          'The candidate does not have a personal email address. Add one before sending the invitation.',
          { email: 'The candidate must have a personal email address.' }
        );
      }

      const now = new Date().toISOString();
      const interviewer = interview.interviewer || 'HR Recruitment Team';
      const { subject, body } = buildInterviewInvitationEmail({
        candidate,
        job,
        interview,
        interviewer,
      });

      const previousInvitation = interview.invitation || null;
      const previousHistory = Array.isArray(previousInvitation?.history)
        ? previousInvitation.history
        : [];

      // Duplicate guard: an already-sent invitation cannot be re-sent.
      if (previousInvitation?.status === INTERVIEW_INVITATION_STATUS.SENT) {
        throw createServiceError(
          'An interview invitation has already been sent for this interview.'
        );
      }

      const event = {
        id: makeId('iev'),
        type: 'interview_invitation',
        interviewId: interview.interviewId,
        applicationId: interview.applicationId,
        candidateId: interview.candidateId,
        to: recipient,
        subject,
        body,
        mode: 'mock',
        sentAt: now,
        sentBy: user,
        attempt: previousHistory.length + 1,
        delivered: false,
        message:
          'Simulated: no real email was delivered. The invitation email is recorded in the Talent Acquisition mock email log.',
      };

      const historyEntry = {
        at: now,
        action: 'Interview Invitation Sent (Simulated)',
        by: user,
        to: recipient,
        subject,
      };

      const updated = {
        ...interview,
        invitation: {
          status: INTERVIEW_INVITATION_STATUS.SENT,
          recipient,
          subject,
          body,
          sentAt: now,
          sentBy: user,
          attempts: previousHistory.length + 1,
          error: '',
          history: [...previousHistory, historyEntry],
        },
      };

      database.interviews = database.interviews.map((item) =>
        item.interviewId === interviewId ? updated : item
      );

      // Keep a simple mock email log in the module for inspection/audit.
      if (!Array.isArray(database.interviewEmailEvents)) {
        database.interviewEmailEvents = [];
      }
      database.interviewEmailEvents.unshift(event);
      database.interviewEmailEvents = database.interviewEmailEvents.slice(0, 50);

      return {
        ...mockProvider.deliver(event),
        recipient,
        subject,
        body,
        interviewInvitation: updated.invitation,
      };
    });
  },
};

export default interviewEmailService;
