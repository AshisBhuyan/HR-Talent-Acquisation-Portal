import {
  appendActivity,
  createServiceError,
  delay,
  findRecord,
  mutateDatabase,
  readDatabase,
} from '../../../services/mockBackend.js';
import { APPROVAL_STATUS, canTransitionApproval } from '../../../constants/approvalStatus.js';
import { APPLICATION_STATUS } from '../../../constants/applicationStatus.js';
import {
  transitionApplication,
  assertApplicationNotOnHold,
} from '../../candidate-applications/services/candidateApplicationService.js';
import { buildApplicationRow } from '../../../utils/formatCandidateData.js';

/**
 * Admin approval service. The approval decision is kept separate from the HR
 * selection so both stages remain auditable.
 */
export const approvalService = {
  async getApprovals() {
    await delay(240);
    const database = readDatabase();

    return database.approvals
      .map((approval) => {
        const application = findRecord(
          database.applications,
          (item) => item.applicationId === approval.applicationId
        );
        const candidate = findRecord(
          database.candidates,
          (item) => item.candidateId === approval.candidateId
        );
        const job = findRecord(database.jobs, (item) => item.jobId === approval.jobId);
        const selection = findRecord(
          database.selections,
          (item) => item.applicationId === approval.applicationId
        );
        const screening = findRecord(
          database.screenings,
          (item) => item.applicationId === approval.applicationId
        );
        const interviews = database.interviews.filter(
          (item) => item.applicationId === approval.applicationId
        );

        return {
          approval,
          selection,
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

  async decideApproval(approvalId, { status, remarks = '' } = {}) {
    await delay(340);
    return mutateDatabase((database) => {
      const approval = findRecord(database.approvals, (item) => item.approvalId === approvalId);
      if (!approval) {
        throw createServiceError('The approval record could not be found.');
      }

      assertApplicationNotOnHold(
        findRecord(
          database.applications,
          (item) => item.applicationId === approval.applicationId
        )
      );

      if (!canTransitionApproval(approval.status, status)) {
        throw createServiceError(
          `An approval cannot move from "${approval.status}" to "${status}".`
        );
      }

      if (status !== APPROVAL_STATUS.CLARIFICATION_REQUESTED && !remarks.trim()) {
        throw createServiceError('Record the approval remarks before deciding.', {
          remarks: 'Approval remarks are required.',
        });
      }

      const now = new Date().toISOString();
      const actionLabel = {
        [APPROVAL_STATUS.APPROVED]: 'Approved',
        [APPROVAL_STATUS.REJECTED]: 'Rejected',
        [APPROVAL_STATUS.CLARIFICATION_REQUESTED]: 'Clarification Requested',
      }[status];

      const updated = {
        ...approval,
        status,
        remarks,
        decidedAt: now,
        decidedBy: 'Hiring Manager',
        history: [
          ...(approval.history || []),
          { at: now, action: actionLabel, by: 'Hiring Manager', remarks },
        ],
      };

      database.approvals = database.approvals.map((item) =>
        item.approvalId === approvalId ? updated : item
      );

      if (status === APPROVAL_STATUS.REJECTED) {
        transitionApplication(database, approval.applicationId, APPLICATION_STATUS.REJECTED, {
          remarks,
          note: remarks || 'Hiring recommendation rejected by the administrator',
          at: now,
        });
      }

      const candidate = findRecord(
        database.candidates,
        (item) => item.candidateId === approval.candidateId
      );
      const application = findRecord(
        database.applications,
        (item) => item.applicationId === approval.applicationId
      );
      appendActivity(database, {
        type: 'approval',
        applicationId: approval.applicationId,
        candidateId: approval.candidateId,
        action: actionLabel,
        previousStatus: application?.status,
        status: status === APPROVAL_STATUS.REJECTED ? APPLICATION_STATUS.REJECTED : application?.status,
        note: remarks,
        message: `Approval ${actionLabel.toLowerCase()} for ${candidate?.fullName || 'candidate'}`,
      });

      return updated;
    });
  },

  async resubmitForApproval(applicationId, { remarks = '' } = {}) {
    await delay(320);
    return mutateDatabase((database) => {
      const approval = findRecord(
        database.approvals,
        (item) => item.applicationId === applicationId
      );
      if (!approval) {
        throw createServiceError('The approval record could not be found.');
      }
      assertApplicationNotOnHold(
        findRecord(
          database.applications,
          (item) => item.applicationId === applicationId
        )
      );
      if (approval.status !== APPROVAL_STATUS.REJECTED) {
        throw createServiceError('Only a rejected recommendation can be resubmitted.');
      }

      const now = new Date().toISOString();
      const updated = {
        ...approval,
        status: APPROVAL_STATUS.PENDING,
        remarks: '',
        decidedAt: null,
        decidedBy: '',
        submittedAt: now,
        hrRemarks: remarks || approval.hrRemarks,
        history: [
          ...(approval.history || []),
          {
            at: now,
            action: 'Resubmitted for Approval',
            by: 'HR Administrator',
            remarks: remarks || 'Recommendation resubmitted for approval.',
          },
        ],
      };

      database.approvals = database.approvals.map((item) =>
        item.applicationId === applicationId ? updated : item
      );

      return updated;
    });
  },
};

export default approvalService;
