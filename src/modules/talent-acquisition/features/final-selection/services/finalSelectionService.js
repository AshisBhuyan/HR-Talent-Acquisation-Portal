import {
  appendActivity,
  createServiceError,
  delay,
  findRecord,
  makeId,
  mutateDatabase,
  readDatabase,
} from '../../../services/mockBackend.js';
import { APPLICATION_STATUS } from '../../../constants/applicationStatus.js';
import { SELECTION_STATUS } from '../../../constants/selectionStatus.js';
import {
  transitionApplication,
  assertApplicationNotOnHold,
} from '../../candidate-applications/services/candidateApplicationService.js';
import { buildApplicationRow } from '../../../utils/formatCandidateData.js';

/**
 * Final selection service. This is the HR decision stage: it records the HR
 * recommendation and submits it for admin approval. The approval itself is
 * handled by the approvals feature.
 */
export const finalSelectionService = {
  async getQueue() {
    await delay(240);
    const database = readDatabase();

    return database.applications
      .filter((application) =>
        [
          APPLICATION_STATUS.FINAL_SELECTION,
          APPLICATION_STATUS.APPROVAL,
        ].includes(application.status)
      )
      .map((application) => {
        const candidate = findRecord(
          database.candidates,
          (item) => item.candidateId === application.candidateId
        );
        const job = findRecord(database.jobs, (item) => item.jobId === application.jobId);
        const selection = findRecord(
          database.selections,
          (item) => item.applicationId === application.applicationId
        );
        const approval = findRecord(
          database.approvals,
          (item) => item.applicationId === application.applicationId
        );
        const interviews = database.interviews.filter(
          (item) => item.applicationId === application.applicationId
        );
        const screening = findRecord(
          database.screenings,
          (item) => item.applicationId === application.applicationId
        );

        return {
          application: buildApplicationRow(application, { candidate, job }),
          candidate,
          job,
          selection,
          approval,
          interviews,
          screening,
        };
      });
  },

  /**
   * Records the HR decision for a candidate that finished the interview stage.
   */
  async recordDecision(applicationId, { decision, remarks = '' } = {}) {
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
      if (application.status !== APPLICATION_STATUS.FINAL_SELECTION) {
        throw createServiceError(
          'A final selection decision can only be recorded at the final selection stage.'
        );
      }
      if (!Object.values(SELECTION_STATUS).includes(decision)) {
        throw createServiceError('Select a valid final selection decision.');
      }

      const now = new Date().toISOString();
      const existing = findRecord(
        database.selections,
        (item) => item.applicationId === applicationId
      );

      const record = {
        selectionId: existing?.selectionId || makeId('sel'),
        applicationId,
        candidateId: application.candidateId,
        decision,
        remarks,
        decidedBy: 'HR Administrator',
        decidedAt: now,
        submittedForApproval: existing?.submittedForApproval || false,
      };

      database.selections = existing
        ? database.selections.map((item) =>
            item.applicationId === applicationId ? record : item
          )
        : [...database.selections, record];

      if (decision === SELECTION_STATUS.REJECTED) {
        transitionApplication(database, applicationId, APPLICATION_STATUS.REJECTED, {
          remarks,
          note: remarks || 'Rejected at the final selection stage',
          at: now,
        });
      }

      const candidate = findRecord(
        database.candidates,
        (item) => item.candidateId === application.candidateId
      );
      appendActivity(database, {
        type: 'selection',
        applicationId,
        candidateId: application.candidateId,
        action: 'Final Selection Decision',
        previousStatus: application.status,
        status: decision === SELECTION_STATUS.REJECTED ? APPLICATION_STATUS.REJECTED : application.status,
        note: remarks || `Decision: ${decision}`,
        message: `Final selection decision recorded for ${candidate?.fullName || 'candidate'}`,
      });

      return record;
    });
  },

  /**
   * Submits the HR recommendation to the admin approval stage.
   */
  async submitForApproval(applicationId, { remarks = '' } = {}) {
    await delay(340);
    return mutateDatabase((database) => {
      const application = findRecord(
        database.applications,
        (item) => item.applicationId === applicationId
      );
      if (!application) {
        throw createServiceError('The application record could not be found.');
      }
      assertApplicationNotOnHold(application);

      const selection = findRecord(
        database.selections,
        (item) => item.applicationId === applicationId
      );
      if (!selection) {
        throw createServiceError('Record the HR decision before submitting for approval.');
      }
      if (selection.decision !== SELECTION_STATUS.SELECTED) {
        throw createServiceError(
          'Only a candidate marked as selected can be submitted for admin approval.'
        );
      }
      if (selection.submittedForApproval) {
        throw createServiceError('This recommendation has already been submitted.');
      }

      const now = new Date().toISOString();
      const updatedSelection = {
        ...selection,
        submittedForApproval: true,
        remarks: remarks || selection.remarks,
      };
      database.selections = database.selections.map((item) =>
        item.applicationId === applicationId ? updatedSelection : item
      );

      const existingApproval = findRecord(
        database.approvals,
        (item) => item.applicationId === applicationId
      );

      const approval = {
        approvalId: existingApproval?.approvalId || makeId('apr'),
        applicationId,
        candidateId: application.candidateId,
        jobId: application.jobId,
        hrRecommendation: SELECTION_STATUS.SELECTED,
        hrRemarks: remarks || selection.remarks,
        status: 'pending',
        remarks: '',
        submittedAt: now,
        submittedBy: 'HR Administrator',
        decidedAt: null,
        decidedBy: '',
        history: [
          ...(existingApproval?.history || []),
          {
            at: now,
            action: 'Submitted for Approval',
            by: 'HR Administrator',
            remarks: remarks || selection.remarks || 'Hiring recommendation submitted.',
          },
        ],
      };

      database.approvals = existingApproval
        ? database.approvals.map((item) =>
            item.applicationId === applicationId ? approval : item
          )
        : [...database.approvals, approval];

      transitionApplication(database, applicationId, APPLICATION_STATUS.APPROVAL, {
        remarks,
        note: 'Hiring recommendation submitted for admin approval',
        at: now,
      });

      const candidate = findRecord(
        database.candidates,
        (item) => item.candidateId === application.candidateId
      );
      appendActivity(database, {
        type: 'approval',
        applicationId,
        candidateId: application.candidateId,
        action: 'Submitted for Approval',
        previousStatus: application.status,
        status: APPLICATION_STATUS.APPROVAL,
        note: 'Hiring recommendation submitted for admin approval',
        message: `Hiring recommendation for ${candidate?.fullName || 'candidate'} submitted for approval`,
      });

      return approval;
    });
  },
};

export default finalSelectionService;
