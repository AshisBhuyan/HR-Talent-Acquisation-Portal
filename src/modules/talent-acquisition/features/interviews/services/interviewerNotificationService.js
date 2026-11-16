import {
  appendEmailEvent,
  createServiceError,
  delay,
  findRecord,
  mutateDatabase,
} from '../../../services/mockBackend.js';
import {
  INTERVIEWER_NOTIFICATION_STATUS,
  INTERVIEW_STATUS,
  getRoundLabel,
} from '../../../constants/interviewStatus.js';
import { formatDate, formatTimeOfDay } from '../../../utils/formatDate.js';
import { isValidEmail, normalizeEmail, normalizeInterviewers } from '../utils/interviewers.js';

function buildInterviewerEmail({ candidate, job, interview, interviewer }) {
  const modeLabel = interview.mode === 'online' ? 'Online' : 'Offline';
  const venue =
    interview.mode === 'online'
      ? `Meeting link: ${interview.meetingLink || 'To be shared'}`
      : `Venue: ${interview.location || 'To be confirmed'}`;
  const subject = `Interview Assigned: ${getRoundLabel(interview.round)} for ${
    candidate?.fullName || 'a candidate'
  }`;

  const body = [
    `Dear ${interviewer.name},`,
    '',
    'You have been assigned as an interviewer for the following interview.',
    '',
    `Candidate: ${candidate?.fullName || 'Candidate'}`,
    `Position: ${job?.title || 'Open position'}`,
    `Round: ${getRoundLabel(interview.round)}`,
    `Date: ${formatDate(interview.scheduledAt)}`,
    `Time: ${formatTimeOfDay(interview.scheduledAt)}`,
    `Mode: ${modeLabel}`,
    venue,
    interview.notes ? `Notes: ${interview.notes}` : '',
    '',
    'Please make yourself available at the scheduled time.',
    '',
    'Best Regards,',
    'HR Recruitment Team',
    'Ecometrix',
  ]
    .filter((line) => line !== '')
    .join('\n');

  return { subject, body };
}

/**
 * Records the interviewer notifications for an interview in the mock email
 * log. The delivery is simulated and clearly labelled as such. A failed or
 * skipped notification never rolls back the interview schedule.
 *
 * mode "auto" targets only pending interviewers (used right after scheduling).
 * mode "retry" targets pending, failed and skipped-with-email interviewers so a
 * failed attempt can be repeated without resending anything already sent.
 */
export function deliverInterviewerNotifications(
  database,
  interview,
  { user = 'HR Administrator', mode = 'auto', onlyInterviewerId = null } = {}
) {
  const candidate = findRecord(
    database.candidates,
    (item) => item.candidateId === interview.candidateId
  );
  const job = findRecord(database.jobs, (item) => item.jobId === interview.jobId);
  const now = new Date().toISOString();

  let sent = 0;
  let failed = 0;
  let skipped = 0;
  let attempted = 0;

  const interviewers = normalizeInterviewers(interview).map((interviewer) => {
    const targetable = !onlyInterviewerId || interviewer.id === onlyInterviewerId;
    if (!targetable) return interviewer;

    const status =
      interviewer.notificationStatus || INTERVIEWER_NOTIFICATION_STATUS.PENDING;
    const eligible =
      mode === 'retry'
        ? status === INTERVIEWER_NOTIFICATION_STATUS.FAILED ||
          status === INTERVIEWER_NOTIFICATION_STATUS.PENDING ||
          (status === INTERVIEWER_NOTIFICATION_STATUS.SKIPPED &&
            Boolean(interviewer.email))
        : status === INTERVIEWER_NOTIFICATION_STATUS.PENDING;

    if (!eligible) return interviewer;

    attempted += 1;
    const recipient = normalizeEmail(interviewer.email);

    if (!recipient) {
      skipped += 1;
      return {
        ...interviewer,
        notificationStatus: INTERVIEWER_NOTIFICATION_STATUS.SKIPPED,
        error: 'No email address provided for this interviewer.',
      };
    }

    const { subject, body } = buildInterviewerEmail({
      candidate,
      job,
      interview,
      interviewer,
    });

    if (!isValidEmail(recipient)) {
      failed += 1;
      appendEmailEvent(database, {
        type: 'interviewer_notification',
        applicationId: interview.applicationId,
        candidateId: interview.candidateId,
        to: recipient,
        subject,
        body,
        status: 'failed',
        sentAt: now,
        sentBy: user,
        note: `Simulated: interviewer notification for ${interviewer.name} failed because the email address is invalid.`,
      });
      return {
        ...interviewer,
        notificationStatus: INTERVIEWER_NOTIFICATION_STATUS.FAILED,
        attempts: (Number(interviewer.attempts) || 0) + 1,
        error: 'Enter a valid email address for this interviewer.',
        history: [
          ...(interviewer.history || []),
          {
            at: now,
            action: 'Interviewer Notification Failed (Simulated)',
            by: user,
            to: recipient,
            remarks: 'Invalid email address.',
          },
        ],
      };
    }

    sent += 1;
    appendEmailEvent(database, {
      type: 'interviewer_notification',
      applicationId: interview.applicationId,
      candidateId: interview.candidateId,
      to: recipient,
      subject,
      body,
      status: 'simulated_sent',
      sentAt: now,
      sentBy: user,
      note: `Simulated: notification for interviewer ${interviewer.name} recorded in the mock email log. No real email was delivered.`,
    });

    return {
      ...interviewer,
      notificationStatus: INTERVIEWER_NOTIFICATION_STATUS.SENT,
      attempts: (Number(interviewer.attempts) || 0) + 1,
      sentAt: now,
      error: '',
      history: [
        ...(interviewer.history || []),
        {
          at: now,
          action: 'Interviewer Notification Sent (Simulated)',
          by: user,
          to: recipient,
          subject,
        },
      ],
    };
  });

  interview.interviewers = interviewers;

  return { sent, failed, skipped, attempted, interviewers };
}

export const interviewerNotificationService = {
  /**
   * Retries the notification for one interviewer, or every retryable
   * interviewer when no id is supplied. Already-sent notifications are never
   * re-sent.
   */
  async retryInterviewerNotifications(interviewId, interviewerId) {
    await delay(280);
    return mutateDatabase((database) => {
      const interview = findRecord(
        database.interviews,
        (item) => item.interviewId === interviewId
      );
      if (!interview) {
        throw createServiceError('The interview record could not be found.');
      }
      if (interview.status === INTERVIEW_STATUS.CANCELLED) {
        throw createServiceError(
          'Interviewer notifications cannot be sent for a cancelled interview.'
        );
      }

      const summary = deliverInterviewerNotifications(database, interview, {
        mode: 'retry',
        onlyInterviewerId: interviewerId || null,
      });

      if (summary.attempted === 0) {
        throw createServiceError(
          'There are no interviewer notifications waiting to be sent.'
        );
      }

      return { interview, ...summary };
    });
  },
};

export default interviewerNotificationService;
