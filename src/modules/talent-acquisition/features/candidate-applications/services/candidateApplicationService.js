import {
  appendActivity,
  createServiceError,
  delay,
  findRecord,
  makeId,
  mutateDatabase,
  readDatabase,
} from '../../../services/mockBackend.js';
import {
  APPLICATION_STATUS,
  canTransitionApplication,
  HOLD_BLOCK_MESSAGE,
} from '../../../constants/applicationStatus.js';
import { buildApplicationRow } from '../../../utils/formatCandidateData.js';

/**
 * Application service. It owns the application record lifecycle and exposes
 * the transition helper that the downstream features (screening, shortlisting,
 * interviews, selection, approval, offer and joining) use to move an
 * application forward.
 *
 * The on-hold guard lives here so every recruitment workflow respects the
 * hold, regardless of which action the HR user clicks.
 */

export const APPLICATION_EVENT_LABELS = {
  [APPLICATION_STATUS.APPLIED]: 'Applied',
  [APPLICATION_STATUS.UNDER_SCREENING]: 'Moved to Screening',
  [APPLICATION_STATUS.SHORTLISTED]: 'Shortlisted',
  [APPLICATION_STATUS.INTERVIEW]: 'Interview Scheduled',
  [APPLICATION_STATUS.FINAL_SELECTION]: 'Final Selection',
  [APPLICATION_STATUS.APPROVAL]: 'Submitted for Approval',
  [APPLICATION_STATUS.OFFER]: 'Offer Issued',
  [APPLICATION_STATUS.JOINING]: 'Joining Started',
  [APPLICATION_STATUS.SELECTED]: 'Joined',
  [APPLICATION_STATUS.ON_HOLD]: 'Put On Hold',
  [APPLICATION_STATUS.REJECTED]: 'Rejected',
};

export const DEFAULT_HR_USER = 'HR Administrator';

export const HOLD_REASON_DEFAULT = 'Application placed on hold by HR';
export const RESUME_REMARK_DEFAULT = 'Application resumed by HR';

function findApplication(database, applicationId) {
  return findRecord(database.applications, (item) => item.applicationId === applicationId);
}

function getCandidate(database, candidateId) {
  return findRecord(database.candidates, (item) => item.candidateId === candidateId);
}

function getJob(database, jobId) {
  return findRecord(database.jobs, (item) => item.jobId === jobId);
}

export function buildApplicationRows(database) {
  return database.applications.map((application) =>
    buildApplicationRow(application, {
      candidate: getCandidate(database, application.candidateId),
      job: getJob(database, application.jobId),
    })
  );
}

function buildTimelineEntry(at, event, note, previousStatus, status, user) {
  return {
    at,
    event,
    note: note || '',
    previousStatus,
    status,
    user: user || DEFAULT_HR_USER,
  };
}

function replaceApplication(database, updated) {
  database.applications = database.applications.map((item) =>
    item.applicationId === updated.applicationId ? updated : item
  );
}

/**
 * Throws a user-facing error when the application is on hold. Every workflow
 * service calls this before touching the record so the hold is enforced.
 */
export function assertApplicationNotOnHold(application) {
  if (application?.status === APPLICATION_STATUS.ON_HOLD) {
    throw createServiceError(HOLD_BLOCK_MESSAGE);
  }
  return application;
}

export function isApplicationOnHold(application) {
  return application?.status === APPLICATION_STATUS.ON_HOLD;
}

function recordActivity(database, payload) {
  return appendActivity(database, {
    user: payload.user || DEFAULT_HR_USER,
    ...payload,
  });
}

export function transitionApplication(database, applicationId, nextStatus, options = {}) {
  const application = findApplication(database, applicationId);
  if (!application) {
    throw createServiceError('The application record could not be found.');
  }

  assertApplicationNotOnHold(application);

  if (nextStatus === APPLICATION_STATUS.ON_HOLD) {
    throw createServiceError(
      'Use the Put on Hold action so the previous application status can be restored on resume.'
    );
  }

  if (application.status === nextStatus) {
    return application;
  }

  if (!canTransitionApplication(application.status, nextStatus)) {
    throw createServiceError(
      `An application cannot move from "${application.status}" to "${nextStatus}".`
    );
  }

  const now = options.at || new Date().toISOString();
  const user = options.user || DEFAULT_HR_USER;
  const updated = {
    ...application,
    status: nextStatus,
    remarks: options.remarks ?? application.remarks,
    updatedAt: now,
    timeline: [
      ...(Array.isArray(application.timeline) ? application.timeline : []),
      buildTimelineEntry(
        now,
        options.event || APPLICATION_EVENT_LABELS[nextStatus] || 'Status updated',
        options.note || options.remarks || '',
        application.status,
        nextStatus,
        user
      ),
    ],
  };

  replaceApplication(database, updated);
  return updated;
}

/**
 * Converts the application to on hold. The previous status, the reason, the
 * timestamp and the HR user are stored so the exact state can be restored.
 */
export function applyHoldToRecord(application, { remarks = '', heldBy = DEFAULT_HR_USER, at } = {}) {
  const now = at || new Date().toISOString();
  const previousStatus = application.status;
  const remark = remarks || HOLD_REASON_DEFAULT;

  return {
    ...application,
    status: APPLICATION_STATUS.ON_HOLD,
    statusBeforeHold: previousStatus,
    holdReason: remark,
    heldAt: now,
    heldBy,
    remarks: remarks || application.remarks,
    updatedAt: now,
    timeline: [
      ...(Array.isArray(application.timeline) ? application.timeline : []),
      buildTimelineEntry(
        now,
        'Put On Hold',
        remark,
        previousStatus,
        APPLICATION_STATUS.ON_HOLD,
        heldBy
      ),
    ],
  };
}

/**
 * Restores the status the application held before it was placed on hold.
 * The previous screening and interview records are left untouched.
 */
export function restoreFromHoldToRecord(
  application,
  { remarks = '', heldBy = DEFAULT_HR_USER, at } = {}
) {
  const now = at || new Date().toISOString();
  const resumeTarget = application.statusBeforeHold || APPLICATION_STATUS.APPLIED;
  const remark = remarks || RESUME_REMARK_DEFAULT;

  return {
    ...application,
    status: resumeTarget,
    statusBeforeHold: null,
    holdReason: '',
    heldAt: null,
    heldBy: '',
    remarks: remarks || application.remarks,
    updatedAt: now,
    timeline: [
      ...(Array.isArray(application.timeline) ? application.timeline : []),
      buildTimelineEntry(now, 'Resumed', remark, APPLICATION_STATUS.ON_HOLD, resumeTarget, heldBy),
    ],
  };
}

export const candidateApplicationService = {
  async getApplications() {
    await delay(240);
    const database = readDatabase();
    return buildApplicationRows(database);
  },

  async getApplicationById(applicationId) {
    await delay(160);
    const database = readDatabase();
    const application = findApplication(database, applicationId);
    if (!application) return null;

    const candidate = getCandidate(database, application.candidateId);
    const job = getJob(database, application.jobId);

    return {
      application: buildApplicationRow(application, { candidate, job }),
      candidate,
      job,
      screening: findRecord(
        database.screenings,
        (item) => item.applicationId === applicationId
      ),
      shortlisting: findRecord(
        database.shortlistings,
        (item) => item.applicationId === applicationId
      ),
      interviews: database.interviews.filter((item) => item.applicationId === applicationId),
      selection: findRecord(
        database.selections,
        (item) => item.applicationId === applicationId
      ),
      approval: findRecord(database.approvals, (item) => item.applicationId === applicationId),
      offer: findRecord(database.offers, (item) => item.applicationId === applicationId),
      joining: findRecord(database.joinings, (item) => item.applicationId === applicationId),
    };
  },

  /**
   * Records an HR remark without changing the application status. The remark
   * becomes the latest HR remark shown on the table and the profile page.
   */
  async addRemark(applicationId, { remarks = '', user = DEFAULT_HR_USER } = {}) {
    await delay(220);
    return mutateDatabase((database) => {
      const application = findApplication(database, applicationId);
      if (!application) {
        throw createServiceError('The application record could not be found.');
      }

      const remark = String(remarks || '').trim();
      if (!remark) {
        throw createServiceError('Enter the HR remark before saving it.', {
          remarks: 'The remark cannot be empty.',
        });
      }

      const now = new Date().toISOString();
      const updated = {
        ...application,
        remarks: remark,
        updatedAt: now,
        timeline: [
          ...(Array.isArray(application.timeline) ? application.timeline : []),
          buildTimelineEntry(
            now,
            'Remark',
            remark,
            application.status,
            application.status,
            user
          ),
        ],
      };

      replaceApplication(database, updated);

      recordActivity(database, {
        type: 'application',
        applicationId,
        candidateId: application.candidateId,
        action: 'Remark',
        previousStatus: application.status,
        status: application.status,
        note: remark,
        user,
        message: `HR remark recorded for the candidate`,
      });

      return updated;
    });
  },

  async moveToScreening(applicationId, { remarks = '', user = DEFAULT_HR_USER } = {}) {
    await delay(280);
    return mutateDatabase((database) => {
      const target = findApplication(database, applicationId);
      if (!target) {
        throw createServiceError('The application record could not be found.');
      }

      // HR must explicitly review the application before it can be screened.
      assertApplicationNotOnHold(target);

      if (target.status === APPLICATION_STATUS.REJECTED) {
        throw createServiceError(
          'A rejected application cannot be moved to screening.'
        );
      }

      if (target.status === APPLICATION_STATUS.UNDER_SCREENING) {
        throw createServiceError(
          'This application has already been transferred to CV screening.'
        );
      }

      if (target.status !== APPLICATION_STATUS.APPLIED) {
        throw createServiceError(
          `Only an application in the applied state can be moved to screening. Current status is "${target.status.replace(/_/g, ' ')}".`
        );
      }

      if (!database.candidates.some((item) => item.candidateId === target.candidateId)) {
        throw createServiceError(
          'The candidate behind this application could not be found.'
        );
      }

      const now = new Date().toISOString();
      const updated = transitionApplication(
        database,
        applicationId,
        APPLICATION_STATUS.UNDER_SCREENING,
        {
          remarks,
          note: remarks || 'CV opened for screening',
          user,
          at: now,
        }
      );

      updated.screenedAt = now;
      updated.screenedBy = user;
      replaceApplication(database, updated);

      const candidate = getCandidate(database, updated.candidateId);
      const job = getJob(database, updated.jobId);

      if (
        !findRecord(database.screenings, (item) => item.applicationId === applicationId)
      ) {
        database.screenings.push({
          screeningId: makeId('scr'),
          applicationId,
          candidateId: updated.candidateId,
          status: 'pending',
          score: null,
          hrRemarks: '',
          reviewedBy: '',
          reviewedAt: null,
          aiResult: null,
          createdAt: new Date().toISOString(),
        });
      }

      recordActivity(database, {
        type: 'screening',
        applicationId,
        candidateId: updated.candidateId,
        action: 'Moved to Screening',
        previousStatus: target?.status,
        status: updated.status,
        note: remarks || 'CV opened for screening',
        user,
        message: `${candidate?.fullName || 'Candidate'} moved to CV screening for ${job?.title || 'the position'}`,
      });

      return updated;
    });
  },

  async rejectApplication(applicationId, { remarks = '', user = DEFAULT_HR_USER } = {}) {
    await delay(280);
    return mutateDatabase((database) => {
      const target = findApplication(database, applicationId);
      assertApplicationNotOnHold(target);

      const updated = transitionApplication(
        database,
        applicationId,
        APPLICATION_STATUS.REJECTED,
        { remarks, note: remarks || 'Application rejected by HR', user }
      );

      const candidate = getCandidate(database, updated.candidateId);
      recordActivity(database, {
        type: 'application',
        applicationId,
        candidateId: updated.candidateId,
        action: 'Rejected',
        previousStatus: target?.status,
        status: updated.status,
        note: remarks || 'Application rejected by HR',
        user,
        message: `${candidate?.fullName || 'Candidate'} application was rejected`,
      });

      return updated;
    });
  },

  async putOnHold(applicationId, { remarks = '', heldBy = DEFAULT_HR_USER } = {}) {
    await delay(260);
    return mutateDatabase((database) => {
      const application = findApplication(database, applicationId);
      if (!application) {
        throw createServiceError('The application record could not be found.');
      }

      if (application.status === APPLICATION_STATUS.ON_HOLD) {
        return application;
      }

      if (
        application.status === APPLICATION_STATUS.REJECTED ||
        application.status === APPLICATION_STATUS.SELECTED
      ) {
        throw createServiceError(
          `A ${application.status} application cannot be placed on hold.`
        );
      }

      const updated = applyHoldToRecord(application, { remarks, heldBy });
      replaceApplication(database, updated);

      const candidate = getCandidate(database, updated.candidateId);
      recordActivity(database, {
        type: 'application',
        applicationId,
        candidateId: updated.candidateId,
        action: 'Put On Hold',
        previousStatus: application.status,
        status: APPLICATION_STATUS.ON_HOLD,
        note: remarks || HOLD_REASON_DEFAULT,
        user: heldBy,
        message: `${candidate?.fullName || 'Candidate'} application placed on hold`,
      });

      return updated;
    });
  },

  async resumeApplication(applicationId, { remarks = '', heldBy = DEFAULT_HR_USER } = {}) {
    await delay(260);
    return mutateDatabase((database) => {
      const application = findApplication(database, applicationId);
      if (!application) {
        throw createServiceError('The application record could not be found.');
      }
      if (application.status !== APPLICATION_STATUS.ON_HOLD) {
        throw createServiceError('Only an application that is on hold can be resumed.');
      }

      const updated = restoreFromHoldToRecord(application, { remarks, heldBy });
      replaceApplication(database, updated);

      const candidate = getCandidate(database, updated.candidateId);
      recordActivity(database, {
        type: 'application',
        applicationId,
        candidateId: updated.candidateId,
        action: 'Resumed',
        previousStatus: APPLICATION_STATUS.ON_HOLD,
        status: updated.status,
        note: remarks || RESUME_REMARK_DEFAULT,
        user: heldBy,
        message: `${candidate?.fullName || 'Candidate'} application resumed`,
      });

      return updated;
    });
  },

};

export default candidateApplicationService;
