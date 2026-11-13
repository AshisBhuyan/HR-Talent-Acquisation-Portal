import {
  appendActivity,
  createServiceError,
  delay,
  findRecord,
  mutateDatabase,
  readDatabase,
} from '../../../services/mockBackend.js';
import { SCREENING_STATUS } from '../../../constants/screeningStatus.js';
import { APPLICATION_STATUS } from '../../../constants/applicationStatus.js';
import {
  transitionApplication,
  assertApplicationNotOnHold,
} from '../../candidate-applications/services/candidateApplicationService.js';
import { buildApplicationRow } from '../../../utils/formatCandidateData.js';

/**
 * CV screening service. Screening decisions are stored on their own record so
 * they stay independent from the application status.
 */
export const screeningService = {
  async getQueue() {
    await delay(240);
    const database = readDatabase();

    return database.screenings
      .map((screening) => {
        const application = findRecord(
          database.applications,
          (item) => item.applicationId === screening.applicationId
        );
        if (!application || application.status === 'on_hold') return null;
        const candidate = findRecord(
          database.candidates,
          (item) => item.candidateId === screening.candidateId
        );
        const job = findRecord(database.jobs, (item) => item.jobId === application?.jobId);

        return {
          screening,
          application: application
            ? buildApplicationRow(application, { candidate, job })
            : null,
          candidate,
          job,
        };
      })
      .filter((entry) => entry !== null);
  },

  async getByApplicationId(applicationId) {
    await delay(140);
    const database = readDatabase();
    return findRecord(database.screenings, (item) => item.applicationId === applicationId);
  },

  /**
   * Saves the HR screening decision together with the score and the remarks.
   */
  async saveScreeningDecision(applicationId, payload = {}) {
    await delay(300);
    return mutateDatabase((database) => {
      const application = findRecord(
        database.applications,
        (item) => item.applicationId === applicationId
      );
      assertApplicationNotOnHold(application);

      const screening = findRecord(
        database.screenings,
        (item) => item.applicationId === applicationId
      );
      if (!screening) {
        throw createServiceError('No screening record exists for this application.');
      }

      const status = payload.status || SCREENING_STATUS.COMPLETED;
      const score =
        payload.score === null || payload.score === undefined || payload.score === ''
          ? screening.score
          : Number(payload.score);

      if (Number.isFinite(score) && (score < 0 || score > 100)) {
        throw createServiceError('The screening score must be between 0 and 100.', {
          score: 'Enter a score between 0 and 100.',
        });
      }

      const now = new Date().toISOString();
      const updated = {
        ...screening,
        status,
        score,
        hrRemarks: payload.hrRemarks ?? screening.hrRemarks,
        reviewedBy: payload.reviewedBy || 'HR Administrator',
        reviewedAt: now,
        aiResult: payload.aiResult ?? screening.aiResult,
      };

      database.screenings = database.screenings.map((item) =>
        item.applicationId === applicationId ? updated : item
      );

      if (application) {
        application.screeningStatus = status;
        application.updatedAt = now;
      }

      const candidate = findRecord(
        database.candidates,
        (item) => item.candidateId === screening.candidateId
      );

      appendActivity(database, {
        type: 'screening',
        applicationId,
        candidateId: screening.candidateId,
        action: 'Screening Decision',
        previousStatus: application?.status,
        status: application?.status,
        note: status === SCREENING_STATUS.PASSED ? 'Screening passed' : 'Screening decision recorded',
        message: `Screening decision saved for ${candidate?.fullName || 'candidate'}`,
      });

      return updated;
    });
  },

  /**
   * Marks the screening as failed and rejects the application.
   */
  async failScreening(applicationId, { remarks = '' } = {}) {
    await delay(300);
    return mutateDatabase((database) => {
      const application = findRecord(
        database.applications,
        (item) => item.applicationId === applicationId
      );
      assertApplicationNotOnHold(application);

      const screening = findRecord(
        database.screenings,
        (item) => item.applicationId === applicationId
      );
      if (!screening) {
        throw createServiceError('No screening record exists for this application.');
      }

      const now = new Date().toISOString();
      const updated = {
        ...screening,
        status: SCREENING_STATUS.FAILED,
        reviewedBy: 'HR Administrator',
        reviewedAt: now,
        hrRemarks: remarks || screening.hrRemarks,
      };

      database.screenings = database.screenings.map((item) =>
        item.applicationId === applicationId ? updated : item
      );

      if (application) {
        application.screeningStatus = SCREENING_STATUS.FAILED;
      }

      transitionApplication(database, applicationId, APPLICATION_STATUS.REJECTED, {
        remarks,
        note: remarks || 'Screening failed by HR',
        at: now,
      });

      const candidate = findRecord(
        database.candidates,
        (item) => item.candidateId === screening.candidateId
      );
      appendActivity(database, {
        type: 'screening',
        applicationId,
        candidateId: screening.candidateId,
        action: 'Rejected at Screening',
        previousStatus: application?.status,
        status: APPLICATION_STATUS.REJECTED,
        note: remarks || 'Screening failed by HR',
        message: `${candidate?.fullName || 'Candidate'} did not pass the CV screening`,
      });

      return updated;
    });
  },

  /**
   * Stores an AI screening result received from the backend. The record is
   * kept separate from the HR decision.
   */
  async attachAiResult(applicationId, aiResult) {
    await delay(200);
    return mutateDatabase((database) => {
      assertApplicationNotOnHold(
        findRecord(database.applications, (item) => item.applicationId === applicationId)
      );

      const screening = findRecord(
        database.screenings,
        (item) => item.applicationId === applicationId
      );
      if (!screening) {
        throw createServiceError('No screening record exists for this application.');
      }

      const updated = {
        ...screening,
        aiResult: { ...aiResult, receivedAt: new Date().toISOString() },
      };
      database.screenings = database.screenings.map((item) =>
        item.applicationId === applicationId ? updated : item
      );
      return updated;
    });
  },
};

export default screeningService;
