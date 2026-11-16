import {
  appendActivity,
  createServiceError,
  delay,
  findRecord,
  makeId,
  mutateDatabase,
  readDatabase,
} from '../../../services/mockBackend.js';
import { INTERVIEW_STATUS, getInterviewType, getRoundLabel } from '../../../constants/interviewStatus.js';
import {
  APPLICATION_STATUS,
  canTransitionApplication,
} from '../../../constants/applicationStatus.js';
import {
  transitionApplication,
  assertApplicationNotOnHold,
} from '../../candidate-applications/services/candidateApplicationService.js';
import { buildApplicationRow } from '../../../utils/formatCandidateData.js';
import interviewEmailService from './interviewEmailService.js';
import interviewerNotificationService, {
  deliverInterviewerNotifications,
} from './interviewerNotificationService.js';
import {
  mergeInterviewerEntries,
  normalizeEmail,
  normalizeInterviewers,
  splitLegacyInterviewerNames,
} from '../utils/interviewers.js';

function applicationStatus(database, applicationId) {
  const application = findRecord(
    database.applications,
    (item) => item.applicationId === applicationId
  );
  return application?.status || null;
}

function assertInterviewApplicationNotOnHold(database, interview) {
  const application = findRecord(
    database.applications,
    (item) => item.applicationId === interview.applicationId
  );
  assertApplicationNotOnHold(application);
}

function buildInterviewerList(payload = {}) {
  const incoming = Array.isArray(payload.interviewers) ? payload.interviewers : [];
  const list = incoming
    .map((item) => ({
      id: item?.id,
      name: String(item?.name || '').trim(),
      email: String(item?.email || '').trim(),
    }))
    .filter((item) => item.name || item.email);

  if (list.length > 0) return list;
  return splitLegacyInterviewerNames(payload.interviewer).map((name) => ({
    name,
    email: '',
  }));
}

function assertValidInterviewers(list = []) {
  if (list.length === 0 || !list.some((item) => item.name)) {
    throw createServiceError('Add at least one interviewer to the interview.', {
      interviewers: 'Add at least one interviewer.',
    });
  }
  if (list.some((item) => !item.name)) {
    throw createServiceError('Every interviewer needs a name.', {
      interviewers: 'Enter the name of every interviewer.',
    });
  }

  const seen = new Set();
  list.forEach((item) => {
    const email = normalizeEmail(item.email);
    if (!email) return;
    if (seen.has(email)) {
      throw createServiceError(
        'Each interviewer must have a unique email address.',
        { interviewers: 'Duplicate interviewer email addresses are not allowed.' }
      );
    }
    seen.add(email);
  });
}

function assertRoundAvailable(database, applicationId, round, excludeInterviewId) {
  const existing = database.interviews.find(
    (item) =>
      item.applicationId === applicationId &&
      item.round === round &&
      item.status !== INTERVIEW_STATUS.CANCELLED &&
      item.interviewId !== excludeInterviewId
  );

  if (existing) {
    throw createServiceError(
      `The ${getRoundLabel(round).toLowerCase()} is already scheduled for this candidate.`
    );
  }
}

export const interviewService = {  async getInterviews() {
    await delay(240);
    const database = readDatabase();

    return database.interviews
      .map((interview) => {
        const application = findRecord(
          database.applications,
          (item) => item.applicationId === interview.applicationId
        );
        const candidate = findRecord(
          database.candidates,
          (item) => item.candidateId === interview.candidateId
        );
        const job = findRecord(database.jobs, (item) => item.jobId === interview.jobId);

        return {
          interview,
          application: application
            ? buildApplicationRow(application, { candidate, job })
            : null,
          candidate,
          job,
        };
      })
      .filter((entry) => entry.application);
  },

  async scheduleInterview(payload = {}) {
    await delay(320);
    return mutateDatabase((database) => {
      const application = findRecord(
        database.applications,
        (item) => item.applicationId === payload.applicationId
      );
      if (!application) {
        throw createServiceError('The application record could not be found.');
      }

      assertApplicationNotOnHold(application);

      if (
        application.status !== APPLICATION_STATUS.SHORTLISTED &&
        application.status !== APPLICATION_STATUS.INTERVIEW
      ) {
        throw createServiceError(
          'Only shortlisted candidates can be scheduled for an interview.'
        );
      }

      const scheduledAt = new Date(payload.scheduledAt);
      if (Number.isNaN(scheduledAt.getTime())) {
        throw createServiceError('A valid interview date and time is required.', {
          scheduledAt: 'Select a valid date and time.',
        });
      }

      const round = payload.round || 'hr';
      assertRoundAvailable(database, application.applicationId, round);

      const incomingInterviewers = buildInterviewerList(payload);
      assertValidInterviewers(incomingInterviewers);

      const now = new Date().toISOString();
      const interviewId = makeId('int');
      const interviewers = mergeInterviewerEntries(
        incomingInterviewers,
        [],
        interviewId
      );
      const interviewerNames = interviewers
        .map((interviewer) => interviewer.name)
        .filter(Boolean)
        .join(', ');

      const record = {
        interviewId,
        applicationId: application.applicationId,
        candidateId: application.candidateId,
        jobId: application.jobId,
        round,
        interviewer: interviewerNames,
        interviewers,
        interviewerCount: interviewers.length,
        interviewType: getInterviewType(interviewers.length),
        scheduledAt: scheduledAt.toISOString(),
        mode: payload.mode || 'online',
        meetingLink: payload.mode === 'online' ? payload.meetingLink?.trim() || '' : '',
        location: payload.mode === 'offline' ? payload.location?.trim() || '' : '',
        status: INTERVIEW_STATUS.SCHEDULED,
        notes: payload.notes?.trim() || '',
        feedback: null,
        createdAt: now,
      };

      database.interviews.push(record);

      // Interviewers are notified automatically after the schedule is saved.
      // A failed notification never rolls back the interview; it can be
      // retried from the interview details dialog.
      deliverInterviewerNotifications(database, record, {
        user: payload.user || 'HR Administrator',
      });

      if (application.status === APPLICATION_STATUS.SHORTLISTED) {
        transitionApplication(database, application.applicationId, APPLICATION_STATUS.INTERVIEW, {
          note: `${record.round} round scheduled with ${interviewerNames}`,
          at: now,
        });
      }

      const candidate = findRecord(
        database.candidates,
        (item) => item.candidateId === application.candidateId
      );
      appendActivity(database, {
        type: 'interview',
        applicationId: application.applicationId,
        candidateId: application.candidateId,
        action: 'Interview Scheduled',
        previousStatus: application.status,
        status:
          application.status === APPLICATION_STATUS.SHORTLISTED
            ? APPLICATION_STATUS.INTERVIEW
            : application.status,
        note: `${record.round} round scheduled with ${interviewerNames}`,
        message: `${record.round} round scheduled for ${candidate?.fullName || 'candidate'}`,
      });

      return record;
    });
  },

  async updateInterview(interviewId, payload = {}) {
    await delay(300);
    return mutateDatabase((database) => {
      const interview = findRecord(
        database.interviews,
        (item) => item.interviewId === interviewId
      );
      if (!interview) {
        throw createServiceError('The interview record could not be found.');
      }
      if (interview.status === INTERVIEW_STATUS.COMPLETED) {
        throw createServiceError('A completed interview can no longer be edited.');
      }
      assertInterviewApplicationNotOnHold(database, interview);

      const scheduledAt = payload.scheduledAt
        ? new Date(payload.scheduledAt)
        : new Date(interview.scheduledAt);
      if (Number.isNaN(scheduledAt.getTime())) {
        throw createServiceError('A valid interview date and time is required.', {
          scheduledAt: 'Select a valid date and time.',
        });
      }

      const round = payload.round || interview.round;
      if (round !== interview.round) {
        assertRoundAvailable(
          database,
          interview.applicationId,
          round,
          interview.interviewId
        );
      }

      const postedInterviewers =
        Array.isArray(payload.interviewers) || typeof payload.interviewer === 'string';
      const previousInterviewers = normalizeInterviewers(interview);
      const incomingInterviewers = postedInterviewers
        ? buildInterviewerList(payload)
        : previousInterviewers;
      assertValidInterviewers(incomingInterviewers);

      const interviewers = postedInterviewers
        ? mergeInterviewerEntries(
            incomingInterviewers,
            previousInterviewers,
            interview.interviewId
          )
        : previousInterviewers;
      const interviewerNames = interviewers
        .map((interviewer) => interviewer.name)
        .filter(Boolean)
        .join(', ');

      const updated = {
        ...interview,
        round,
        interviewer: interviewerNames,
        interviewers,
        interviewerCount: interviewers.length,
        interviewType: getInterviewType(interviewers.length),
        scheduledAt: scheduledAt.toISOString(),
        mode: payload.mode || interview.mode,
        meetingLink:
          (payload.mode || interview.mode) === 'online'
            ? payload.meetingLink?.trim() || ''
            : '',
        location:
          (payload.mode || interview.mode) === 'offline'
            ? payload.location?.trim() || ''
            : '',
        notes: payload.notes ?? interview.notes,
        status: payload.status || interview.status,
      };

      database.interviews = database.interviews.map((item) =>
        item.interviewId === interviewId ? updated : item
      );

      // Notify interviewers added by the edit (already-sent recipients keep
      // their status and are never notified twice).
      deliverInterviewerNotifications(database, updated, {
        user: payload.user || 'HR Administrator',
      });

      return updated;
    });
  },

  async rescheduleInterview(interviewId, payload = {}) {
    await delay(300);
    return mutateDatabase((database) => {
      const interview = findRecord(
        database.interviews,
        (item) => item.interviewId === interviewId
      );
      if (!interview) {
        throw createServiceError('The interview record could not be found.');
      }
      if (interview.status === INTERVIEW_STATUS.CANCELLED) {
        throw createServiceError('A cancelled interview cannot be rescheduled.');
      }
      assertInterviewApplicationNotOnHold(database, interview);

      const scheduledAt = new Date(payload.scheduledAt);
      if (Number.isNaN(scheduledAt.getTime())) {
        throw createServiceError('A valid interview date and time is required.', {
          scheduledAt: 'Select a valid date and time.',
        });
      }

      const now = new Date().toISOString();
      const round = payload.round || interview.round;
      if (round !== interview.round) {
        assertRoundAvailable(
          database,
          interview.applicationId,
          round,
          interview.interviewId
        );
      }

      const postedInterviewers =
        Array.isArray(payload.interviewers) || typeof payload.interviewer === 'string';
      const previousInterviewers = normalizeInterviewers(interview);
      const incomingInterviewers = postedInterviewers
        ? buildInterviewerList(payload)
        : previousInterviewers;
      assertValidInterviewers(incomingInterviewers);

      const interviewers = postedInterviewers
        ? mergeInterviewerEntries(
            incomingInterviewers,
            previousInterviewers,
            interview.interviewId
          )
        : previousInterviewers;
      const interviewerNames = interviewers
        .map((interviewer) => interviewer.name)
        .filter(Boolean)
        .join(', ');

      const updated = {
        ...interview,
        round,
        interviewer: interviewerNames,
        interviewers,
        interviewerCount: interviewers.length,
        interviewType: getInterviewType(interviewers.length),
        scheduledAt: scheduledAt.toISOString(),
        mode: payload.mode || interview.mode,
        meetingLink:
          (payload.mode || interview.mode) === 'online'
            ? payload.meetingLink?.trim() || ''
            : '',
        location:
          (payload.mode || interview.mode) === 'offline'
            ? payload.location?.trim() || ''
            : '',
        notes: payload.notes ?? interview.notes,
        status: INTERVIEW_STATUS.RESCHEDULED,
        rescheduledAt: now,
      };

      database.interviews = database.interviews.map((item) =>
        item.interviewId === interviewId ? updated : item
      );

      deliverInterviewerNotifications(database, updated, {
        user: payload.user || 'HR Administrator',
      });

      const candidate = findRecord(
        database.candidates,
        (item) => item.candidateId === interview.candidateId
      );
      appendActivity(database, {
        type: 'interview',
        applicationId: interview.applicationId,
        candidateId: interview.candidateId,
        action: 'Interview Rescheduled',
        previousStatus: applicationStatus(database, interview.applicationId),
        status: applicationStatus(database, interview.applicationId),
        note: 'Interview rescheduled',
        message: `Interview rescheduled for ${candidate?.fullName || 'candidate'}`,
      });

      return updated;
    });
  },

  async cancelInterview(interviewId, { remarks = '' } = {}) {
    await delay(280);
    return mutateDatabase((database) => {
      const interview = findRecord(
        database.interviews,
        (item) => item.interviewId === interviewId
      );
      if (!interview) {
        throw createServiceError('The interview record could not be found.');
      }
      if (interview.status === INTERVIEW_STATUS.COMPLETED) {
        throw createServiceError('A completed interview cannot be cancelled.');
      }
      assertInterviewApplicationNotOnHold(database, interview);

      const updated = {
        ...interview,
        status: INTERVIEW_STATUS.CANCELLED,
        notes: remarks ? `${interview.notes ? `${interview.notes} · ` : ''}${remarks}` : interview.notes,
        cancelledAt: new Date().toISOString(),
      };

      database.interviews = database.interviews.map((item) =>
        item.interviewId === interviewId ? updated : item
      );

      return updated;
    });
  },

  async sendInterviewInvitation(interviewId) {
    await delay(320);
    return interviewEmailService.sendInterviewInvitation(interviewId);
  },

  async retryInterviewerNotifications(interviewId, interviewerId) {
    await delay(320);
    return interviewerNotificationService.retryInterviewerNotifications(
      interviewId,
      interviewerId
    );
  },

  async submitFeedback(interviewId, feedback = {}) {
    await delay(320);
    return mutateDatabase((database) => {
      const interview = findRecord(
        database.interviews,
        (item) => item.interviewId === interviewId
      );
      if (!interview) {
        throw createServiceError('The interview record could not be found.');
      }
      if (interview.status === INTERVIEW_STATUS.CANCELLED) {
        throw createServiceError('Feedback cannot be recorded for a cancelled interview.');
      }
      assertInterviewApplicationNotOnHold(database, interview);

      const now = new Date().toISOString();
      const updated = {
        ...interview,
        status: INTERVIEW_STATUS.COMPLETED,
        notes: feedback.notes?.trim() || interview.notes,
        feedback: {
          technicalKnowledge: Number(feedback.technicalKnowledge) || 0,
          communicationSkills: Number(feedback.communicationSkills) || 0,
          problemSolving: Number(feedback.problemSolving) || 0,
          overallRating: Number(feedback.overallRating) || 0,
          remarks: feedback.remarks?.trim() || '',
          recommendation: feedback.recommendation || 'further_evaluation',
          submittedBy: feedback.submittedBy || interview.interviewer,
          submittedAt: now,
        },
      };

      database.interviews = database.interviews.map((item) =>
        item.interviewId === interviewId ? updated : item
      );

      // When every round of the application is evaluated, the application
      // enters the final selection stage where HR records the decision.
      const pendingRounds = database.interviews.filter(
        (item) =>
          item.applicationId === interview.applicationId &&
          item.interviewId !== interviewId &&
          item.status !== INTERVIEW_STATUS.COMPLETED &&
          item.status !== INTERVIEW_STATUS.CANCELLED
      );

      const currentStatus = applicationStatus(database, interview.applicationId);

      if (
        pendingRounds.length === 0 &&
        canTransitionApplication(currentStatus, APPLICATION_STATUS.FINAL_SELECTION)
      ) {
        transitionApplication(
          database,
          interview.applicationId,
          APPLICATION_STATUS.FINAL_SELECTION,
          {
            note: 'All interview rounds are evaluated and ready for the HR decision',
            at: now,
          }
        );
      }

      const candidate = findRecord(
        database.candidates,
        (item) => item.candidateId === interview.candidateId
      );
      appendActivity(database, {
        type: 'interview',
        applicationId: interview.applicationId,
        candidateId: interview.candidateId,
        action: 'Feedback Submitted',
        previousStatus: applicationStatus(database, interview.applicationId),
        status: applicationStatus(database, interview.applicationId),
        note: feedback.remarks?.trim() || 'Interview feedback recorded',
        message: `Interview feedback submitted for ${candidate?.fullName || 'candidate'}`,
      });

      return updated;
    });
  },
};

export default interviewService;
