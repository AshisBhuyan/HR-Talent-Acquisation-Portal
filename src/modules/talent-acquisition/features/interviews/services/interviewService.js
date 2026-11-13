import {
  appendActivity,
  createServiceError,
  delay,
  findRecord,
  makeId,
  mutateDatabase,
  readDatabase,
} from '../../../services/mockBackend.js';
import { INTERVIEW_STATUS } from '../../../constants/interviewStatus.js';
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

      const now = new Date().toISOString();
      const record = {
        interviewId: makeId('int'),
        applicationId: application.applicationId,
        candidateId: application.candidateId,
        jobId: application.jobId,
        round: payload.round || 'hr',
        interviewer: payload.interviewer?.trim() || '',
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

      if (application.status === APPLICATION_STATUS.SHORTLISTED) {
        transitionApplication(database, application.applicationId, APPLICATION_STATUS.INTERVIEW, {
          note: `${record.round} round scheduled with ${record.interviewer}`,
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
        note: `${record.round} round scheduled with ${record.interviewer}`,
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

      const updated = {
        ...interview,
        round: payload.round || interview.round,
        interviewer: payload.interviewer?.trim() || interview.interviewer,
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
      const updated = {
        ...interview,
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
        notes: remarks ? `${interview.notes ? `${interview.notes} Ã‚Â· ` : ''}${remarks}` : interview.notes,
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
