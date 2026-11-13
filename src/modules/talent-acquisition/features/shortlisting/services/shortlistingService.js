import {
  appendActivity,
  createServiceError,
  delay,
  findRecord,
  makeId,
  mutateDatabase,
  readDatabase,
} from '../../../services/mockBackend.js';
import { SCREENING_STATUS } from '../../../constants/screeningStatus.js';
import { APPLICATION_STATUS } from '../../../constants/applicationStatus.js';
import {
  transitionApplication,
  assertApplicationNotOnHold,
  applyHoldToRecord,
  DEFAULT_HR_USER,
} from '../../candidate-applications/services/candidateApplicationService.js';
import { buildApplicationRow } from '../../../utils/formatCandidateData.js';

export const SHORTLIST_STATUS = {
  SHORTLISTED: 'shortlisted',
  ON_HOLD: 'on_hold',
  REJECTED: 'rejected',
};

export const SHORTLIST_STATUS_META = {
  [SHORTLIST_STATUS.SHORTLISTED]: { label: 'Shortlisted', variant: 'green' },
  [SHORTLIST_STATUS.ON_HOLD]: { label: 'On Hold', variant: 'orange' },
  [SHORTLIST_STATUS.REJECTED]: { label: 'Rejected', variant: 'red' },
};

export function getShortlistStatusMeta(status) {
  return SHORTLIST_STATUS_META[status] || { label: 'Not Shortlisted', variant: 'grey' };
}

/**
 * Shortlisting service. The shortlist record mirrors the shortlisting state
 * of a screened candidate and is kept in sync with the application status.
 */
export const shortlistingService = {
  async getShortlist() {
    await delay(240);
    const database = readDatabase();

    return database.shortlistings
        .map((shortlisting) => {
          const application = findRecord(
            database.applications,
            (item) => item.applicationId === shortlisting.applicationId
          );
          if (!application || application.status === 'on_hold') return null;
        const candidate = findRecord(
          database.candidates,
          (item) => item.candidateId === shortlisting.candidateId
        );
        const job = findRecord(database.jobs, (item) => item.jobId === application?.jobId);
        const screening = findRecord(
          database.screenings,
          (item) => item.applicationId === shortlisting.applicationId
        );
        const interviews = database.interviews.filter(
          (item) => item.applicationId === shortlisting.applicationId
        );

        return {
          shortlisting,
          screening,
          interviews,
          application: application
            ? buildApplicationRow(application, { candidate, job })
            : null,
          candidate,
          job,
        };
      })
      .filter((entry) => entry.application);
  },

  async shortlistCandidate(applicationId, { remarks = '' } = {}) {
    await delay(320);
    return mutateDatabase((database) => {
      const application = findRecord(
        database.applications,
        (item) => item.applicationId === applicationId
      );
      if (!application) {
        throw createServiceError('The application record could not be found.');
      }

      assertApplicationNotOnHold(application);

      const screening = findRecord(
        database.screenings,
        (item) => item.applicationId === applicationId
      );
      if (!screening) {
        throw createServiceError('Only screened candidates can be shortlisted.');
      }
      if (screening.status !== SCREENING_STATUS.PASSED) {
        throw createServiceError(
          'Only a candidate with a passed screening result can be shortlisted.'
        );
      }

      const now = new Date().toISOString();
      const existing = findRecord(
        database.shortlistings,
        (item) => item.applicationId === applicationId
      );

      const record = {
        shortlistingId: existing?.shortlistingId || makeId('sht'),
        applicationId,
        candidateId: application.candidateId,
        status: SHORTLIST_STATUS.SHORTLISTED,
        remarks,
        shortlistedAt: existing?.shortlistedAt || now,
        updatedAt: now,
      };

      database.shortlistings = existing
        ? database.shortlistings.map((item) =>
            item.applicationId === applicationId ? record : item
          )
        : [...database.shortlistings, record];

      transitionApplication(database, applicationId, APPLICATION_STATUS.SHORTLISTED, {
        remarks,
        note: remarks || 'Shortlisted for interview',
        at: now,
      });

      const candidate = findRecord(
        database.candidates,
        (item) => item.candidateId === application.candidateId
      );
      appendActivity(database, {
        type: 'screening',
        applicationId,
        candidateId: application.candidateId,
        action: 'Shortlisted',
        previousStatus: 'under_screening',
        status: APPLICATION_STATUS.SHORTLISTED,
        note: remarks || 'Shortlisted for interview',
        message: `${candidate?.fullName || 'Candidate'} was shortlisted`,
      });

      return record;
    });
  },

  async putOnHold(applicationId, { remarks = '' } = {}) {
    await delay(300);
    return mutateDatabase((database) => {
      const application = findRecord(
        database.applications,
        (item) => item.applicationId === applicationId
      );
      if (!application) {
        throw createServiceError('The application record could not be found.');
      }
      if (
        application.status === APPLICATION_STATUS.REJECTED ||
        application.status === APPLICATION_STATUS.SELECTED
      ) {
        throw createServiceError(
          `A ${application.status} application cannot be placed on hold.`
        );
      }
      if (application.status === APPLICATION_STATUS.ON_HOLD) {
        return application;
      }

      const now = new Date().toISOString();
      const existing = findRecord(
        database.shortlistings,
        (item) => item.applicationId === applicationId
      );

      const record = {
        shortlistingId: existing?.shortlistingId || makeId('sht'),
        applicationId,
        candidateId: application.candidateId,
        status: SHORTLIST_STATUS.ON_HOLD,
        remarks: remarks || application.remarks,
        shortlistedAt: existing?.shortlistedAt || now,
        updatedAt: now,
      };

      database.shortlistings = existing
        ? database.shortlistings.map((item) =>
            item.applicationId === applicationId ? record : item
          )
        : [...database.shortlistings, record];

      const updated = applyHoldToRecord(application, { remarks, heldBy: DEFAULT_HR_USER });
      database.applications = database.applications.map((item) =>
        item.applicationId === applicationId ? updated : item
      );

      appendActivity(database, {
        type: 'application',
        applicationId,
        candidateId: application.candidateId,
        action: 'Put On Hold',
        previousStatus: application.status,
        status: APPLICATION_STATUS.ON_HOLD,
        note: remarks || 'Shortlist placed on hold',
        message: `${application.applicationId} placed on hold`,
      });

      return record;
    });
  },

  async rejectCandidate(applicationId, { remarks = '' } = {}) {
    await delay(300);
    return mutateDatabase((database) => {
      const application = findRecord(
        database.applications,
        (item) => item.applicationId === applicationId
      );
      if (!application) {
        throw createServiceError('The application record could not be found.');
      }

      assertApplicationNotOnHold(application);

      const now = new Date().toISOString();
      const existing = findRecord(
        database.shortlistings,
        (item) => item.applicationId === applicationId
      );

      const record = {
        shortlistingId: existing?.shortlistingId || makeId('sht'),
        applicationId,
        candidateId: application.candidateId,
        status: SHORTLIST_STATUS.REJECTED,
        remarks,
        shortlistedAt: existing?.shortlistedAt || now,
        updatedAt: now,
      };

      database.shortlistings = existing
        ? database.shortlistings.map((item) =>
            item.applicationId === applicationId ? record : item
          )
        : [...database.shortlistings, record];

      transitionApplication(database, applicationId, APPLICATION_STATUS.REJECTED, {
        remarks,
        note: remarks || 'Rejected at shortlisting stage',
        at: now,
      });

      const candidate = findRecord(
        database.candidates,
        (item) => item.candidateId === application.candidateId
      );
      appendActivity(database, {
        type: 'application',
        applicationId,
        candidateId: application.candidateId,
        action: 'Rejected at Shortlisting',
        previousStatus: application.status,
        status: APPLICATION_STATUS.REJECTED,
        note: remarks || 'Rejected at shortlisting stage',
        message: `${candidate?.fullName || 'Candidate'} was rejected at the shortlisting stage`,
      });

      return record;
    });
  },
};

export default shortlistingService;
