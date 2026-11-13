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
  JOINING_STATUS,
  JOINING_DOCUMENT_TYPES,
  HANDOVER_STATUS,
  CHECKLIST_ITEM_STATUS,
  createDefaultChecklist,
  getChecklistDefinition,
  canTransitionJoining,
  MANDATORY_CHECKLIST_KEYS,
} from '../../../constants/joiningStatus.js';
import { OFFER_STATUS } from '../../../constants/offerStatus.js';
import { APPLICATION_STATUS } from '../../../constants/applicationStatus.js';
import {
  transitionApplication,
  assertApplicationNotOnHold,
} from '../../candidate-applications/services/candidateApplicationService.js';
import {
  assertHandoverPossible,
  buildEmployeeHandoverPayload,
  describeHandover,
  getHandoverReadiness,
  getMandatoryIncomplete,
  validateEmployeeHandover,
} from '../../../services/candidateToEmployeeService.js';
import employeeService from '../../../../employee-databank/features/employees/services/employeeService.js';
import { buildApplicationRow } from '../../../utils/formatCandidateData.js';

const HR = 'HR Administrator';

function assertJoiningApplicationNotOnHold(database, joining) {
  assertApplicationNotOnHold(
    findRecord(
      database.applications,
      (item) => item.applicationId === joining.applicationId
    )
  );
}

function enrichJoining(database, joining) {
  const application = findRecord(
    database.applications,
    (item) => item.applicationId === joining.applicationId
  );
  const candidate = findRecord(
    database.candidates,
    (item) => item.candidateId === joining.candidateId
  );
  const job = findRecord(database.jobs, (item) => item.jobId === application?.jobId);
  const offer = findRecord(database.offers, (item) => item.offerId === joining.offerId);

  const checklist = createDefaultChecklist(joining.checklist);
  const documents = (Array.isArray(joining.documents) ? joining.documents : []).map(
    (document) => ({
      ...document,
      label: getDocumentLabel(document.type),
      status: document.status || 'pending',
      verified: document.status === 'verified',
      history: Array.isArray(document.history) ? document.history : [],
    })
  );

  const mandatoryTotal = MANDATORY_CHECKLIST_KEYS.length;
  const mandatoryCompleted = checklist.filter(
    (item) => MANDATORY_CHECKLIST_KEYS.includes(item.key) && item.status === 'verified'
  ).length;
  const checklistCompleted = checklist.filter((item) =>
    ['verified', 'not_applicable'].includes(item.status)
  ).length;

  const documentsVerified = documents.filter((item) => item.status === 'verified').length;
  const documentsPending = documents.filter(
    (item) => !['verified', 'not_applicable'].includes(item.status)
  ).length;

  return {
    ...joining,
    checklist,
    documents,
    checklistProgress: {
      completed: checklistCompleted,
      total: checklist.length,
      mandatoryCompleted,
      mandatoryTotal,
      percent: checklist.length ? Math.round((checklistCompleted / checklist.length) * 100) : 0,
    },
    documentsVerified,
    documentsPending,
    application: application
      ? buildApplicationRow(application, { candidate, job })
      : null,
    candidate,
    job,
    offer,
    handover: joining.handover || null,
    readiness: getHandoverReadiness(
      { ...joining, documents, checklist },
      { offer, application }
    ),
  };
}

function getDocumentLabel(type) {
  const match = JOINING_DOCUMENT_TYPES.find((item) => item.value === type);
  return match ? match.label : 'Document';
}

function upsertChecklistItem(database, joining, key, status, remark = '', user = HR) {
  const now = new Date().toISOString();
  const checklist = createDefaultChecklist(joining.checklist).map((item) => {
    if (item.key !== key) return item;
    const definition = getChecklistDefinition(key);
    return {
      ...item,
      status,
      remarks: remark,
      verifiedBy: status === 'verified' ? user : item.verifiedBy,
      updatedAt: now,
      history: [
        ...item.history,
        {
          at: now,
          action: statusLabel(status),
          by: user,
          remarks: remark,
        },
      ],
    };
  });

  database.joinings = database.joinings.map((item) =>
    item.joiningId === joining.joiningId ? { ...item, checklist, updatedAt: now } : item
  );

  const map = new Map(checklist.map((item) => [item.key, item]));
  return { checklist, item: map.get(key) };
}

function statusLabel(status) {
  switch (status) {
    case 'submitted':
      return 'Submitted';
    case 'under_verification':
      return 'Under Verification';
    case 'verified':
      return 'Verified';
    case 'rejected':
      return 'Resubmission Required';
    case 'not_applicable':
      return 'Marked Not Applicable';
    default:
      return 'Pending';
  }
}

function updateDocumentStatus(database, joining, documentId, status, remark, user = HR) {
  const now = new Date().toISOString();
  const documents = (joining.documents || []).map((document) => {
    if (document.documentId !== documentId) return document;
    return {
      ...document,
      status,
      verifiedBy: status === 'verified' ? user : document.verifiedBy,
      remarks: remark ?? document.remarks,
      history: [
        ...(document.history || []),
        {
          at: now,
          action: statusLabel(status),
          by: user,
          remarks: remark || '',
        },
      ],
    };
  });

  database.joinings = database.joinings.map((item) =>
    item.joiningId === joining.joiningId ? { ...item, documents, updatedAt: now } : item
  );

  return documents;
}

function decideVerificationStatus(documents, checklist, currentStatus) {
  const mandatoryDocuments = documents.filter((document) =>
    MANDATORY_CHECKLIST_KEYS.includes(document.type)
  );
  const allMandatoryDocumentsVerified = mandatoryDocuments.every(
    (document) => document.status === 'verified'
  );
  const mandatoryChecklistComplete = checklist
    .filter((item) => MANDATORY_CHECKLIST_KEYS.includes(item.key))
    .every((item) => item.status === 'verified');

  if (allMandatoryDocumentsVerified && mandatoryChecklistComplete) {
    return JOINING_STATUS.READY_TO_JOIN;
  }

  const anyInProgress = documents.some((document) =>
    ['submitted', 'under_verification'].includes(document.status)
  );
  const anyVerified = documents.some((document) => document.status === 'verified');

  if (anyInProgress || anyVerified) return JOINING_STATUS.VERIFICATION_IN_PROGRESS;
  return currentStatus === JOINING_STATUS.JOINED ? currentStatus : JOINING_STATUS.DOCUMENTS_PENDING;
}

export const joiningService = {
  async getJoinings() {
    await delay(240);
    const database = readDatabase();
    return database.joinings
      .map((joining) => enrichJoining(database, joining))
      .filter((entry) => entry.application);
  },

  /**
   * Aggregated import history across every joining record. Used by the
   * handover history panel and the summary cards.
   */
  getImportHistory() {
    const database = readDatabase();
    const history = [];

    for (const joining of database.joinings) {
      if (!joining.handover) continue;
      const application = findRecord(
        database.applications,
        (item) => item.applicationId === joining.applicationId
      );
      const candidate = findRecord(
        database.candidates,
        (item) => item.candidateId === joining.candidateId
      );

      history.push({
        joiningId: joining.joiningId,
        applicationId: joining.applicationId,
        candidateId: joining.candidateId,
        candidateName: candidate?.fullName || 'Candidate',
        designation: joining.handover.designation || '',
        handoverId: joining.handover.handoverId,
        preparedAt: joining.handover.preparedAt,
        importedAt: joining.handover.importedAt,
        status: joining.handover.status,
        error: joining.handover.error || '',
        employeeRef: joining.handover.employeeRef || '',
        employeeId: joining.handover.employeeId || '',
      });
    }

    return history.sort(
      (a, b) =>
        new Date(b.preparedAt || 0).getTime() - new Date(a.preparedAt || 0).getTime()
    );
  },

  /**
   * Opens a joining record for a candidate that accepted an offer.
   */
  async startJoining(offerId) {
    await delay(340);
    return mutateDatabase((database) => {
      const offer = findRecord(database.offers, (item) => item.offerId === offerId);
      if (!offer) {
        throw createServiceError('The offer record could not be found.');
      }
      assertApplicationNotOnHold(
        findRecord(
          database.applications,
          (item) => item.applicationId === offer.applicationId
        )
      );
      if (offer.status !== OFFER_STATUS.ACCEPTED) {
        throw createServiceError(
          'A joining record can only be opened for an offer the candidate has accepted.'
        );
      }

      const existing = findRecord(
        database.joinings,
        (item) => item.applicationId === offer.applicationId
      );
      if (existing) {
        throw createServiceError('A joining record already exists for this offer.');
      }

      const now = new Date().toISOString();
      const record = {
        joiningId: makeId('jng'),
        applicationId: offer.applicationId,
        candidateId: offer.candidateId,
        offerId: offer.offerId,
        status: JOINING_STATUS.DOCUMENTS_PENDING,
        joiningDate: offer.joiningDate,
        joinedAt: null,
        joinedBy: '',
        documents: [],
        checklist: createDefaultChecklist(),
        handover: null,
        updatedAt: now,
      };

      database.joinings.push(record);

      transitionApplication(database, offer.applicationId, APPLICATION_STATUS.JOINING, {
        note: 'Joining checklist opened after the offer was accepted',
        at: now,
      });

      const candidate = findRecord(
        database.candidates,
        (item) => item.candidateId === offer.candidateId
      );
      appendActivity(database, {
        type: 'joining',
        applicationId: offer.applicationId,
        candidateId: offer.candidateId,
        action: 'Joining Started',
        previousStatus: APPLICATION_STATUS.OFFER,
        status: APPLICATION_STATUS.JOINING,
        note: 'Joining checklist opened after the offer was accepted',
        message: `Joining started for ${candidate?.fullName || 'candidate'}`,
      });

      return record;
    });
  },

  async updateStatus(joiningId, status, { remarks = '' } = {}) {
    await delay(300);
    return mutateDatabase((database) => {
      const joining = findRecord(database.joinings, (item) => item.joiningId === joiningId);
      if (!joining) {
        throw createServiceError('The joining record could not be found.');
      }
      assertJoiningApplicationNotOnHold(database, joining);
      if (!canTransitionJoining(joining.status, status)) {
        throw createServiceError(
          `A joining record cannot move from "${joining.status}" to "${status}".`
        );
      }

      const now = new Date().toISOString();
      const updated = { ...joining, status, remarks, updatedAt: now };
      database.joinings = database.joinings.map((item) =>
        item.joiningId === joiningId ? updated : item
      );

      return updated;
    });
  },

  async addDocument(joiningId, payload = {}) {
    await delay(300);
    return mutateDatabase((database) => {
      const joining = findRecord(database.joinings, (item) => item.joiningId === joiningId);
      if (!joining) {
        throw createServiceError('The joining record could not be found.');
      }
      assertJoiningApplicationNotOnHold(database, joining);
      if (joining.status === JOINING_STATUS.JOINED) {
        throw createServiceError('Documents cannot be changed after the candidate joined.');
      }
      if (!payload.type) {
        throw createServiceError('A document type is required.');
      }
      const fileName = String(payload.fileName || '').trim();
      if (!fileName) {
        throw createServiceError('A document file name is required.');
      }

      const now = new Date().toISOString();
      const document = {
        documentId: makeId('jd'),
        type: payload.type,
        fileName,
        mimeType: payload.mimeType || 'application/pdf',
        sizeBytes: Number(payload.sizeBytes) || 0,
        submittedAt: now,
        status: 'submitted',
        verifiedBy: '',
        remarks: payload.remarks || '',
        history: [
          {
            at: now,
            action: 'Submitted',
            by: 'Candidate',
            remarks: payload.remarks || 'Document submitted through the joining portal.',
          },
        ],
      };

      const documents = [...(joining.documents || []), document];

      database.joinings = database.joinings.map((item) =>
        item.joiningId === joiningId ? { ...item, documents, updatedAt: now } : item
      );
      upsertChecklistItem(database, joining, payload.type, 'submitted', payload.remarks || '');

      appendActivity(database, {
        type: 'joining',
        applicationId: joining.applicationId,
        candidateId: joining.candidateId,
        action: 'Document Submitted',
        note: `${getDocumentLabel(payload.type)} submitted`,
        message: `Joining document submitted for ${joining.applicationId}`,
      });

      return document;
    });
  },

  /**
   * Verifies or rejects a joining document. A rejection is recorded as a
   * resubmission request with the reason in the document and checklist
   * history.
   */
  async verifyDocument(joiningId, documentId, { verified = true, remarks = '' } = {}) {
    await delay(280);
    return mutateDatabase((database) => {
      const joining = findRecord(database.joinings, (item) => item.joiningId === joiningId);
      if (!joining) {
        throw createServiceError('The joining record could not be found.');
      }
      assertJoiningApplicationNotOnHold(database, joining);

      const target = (joining.documents || []).find((item) => item.documentId === documentId);
      if (!target) {
        throw createServiceError('The document record could not be found.');
      }
      if (!target.submittedAt) {
        throw createServiceError('The document has not been submitted yet.');
      }

      const status = verified ? 'verified' : 'resubmission_required';
      const documents = updateDocumentStatus(database, joining, documentId, status, remarks);

      const checklistKey = CHECKLIST_KEYS_FOR_DOCUMENT(target.type);
      if (checklistKey) {
        upsertChecklistItem(
          database,
          joining,
          checklistKey,
          verified ? 'verified' : 'rejected',
          remarks
        );
      }

      // Recompute the joining progress after verification.
      const refreshed = findRecord(database.joinings, (item) => item.joiningId === joiningId);
      const checklist = createDefaultChecklist(refreshed.checklist);
      const nextStatus = decideVerificationStatus(
        documents,
        checklist,
        joining.status
      );
      if (nextStatus !== joining.status && joining.status !== JOINING_STATUS.JOINED) {
        database.joinings = database.joinings.map((item) =>
          item.joiningId === joiningId
            ? { ...item, status: nextStatus, updatedAt: new Date().toISOString() }
            : item
        );
      }

      appendActivity(database, {
        type: 'joining',
        applicationId: joining.applicationId,
        candidateId: joining.candidateId,
        action: verified ? 'Document Verified' : 'Resubmission Requested',
        note: remarks || (verified ? 'Document verified.' : 'Document rejected, resubmission requested.'),
        message: `${getDocumentLabel(target.type)} ${verified ? 'verified' : 'rejected'} for ${joining.applicationId}`,
      });

      return documents.find((item) => item.documentId === documentId);
    });
  },

  async requestResubmission(joiningId, documentId, { remarks = '' } = {}) {
    return this.verifyDocument(joiningId, documentId, { verified: false, remarks });
  },

  async setChecklistStatus(joiningId, key, status, remarks = '') {
    await delay(240);
    return mutateDatabase((database) => {
      const joining = findRecord(database.joinings, (item) => item.joiningId === joiningId);
      if (!joining) {
        throw createServiceError('The joining record could not be found.');
      }
      assertJoiningApplicationNotOnHold(database, joining);

      if (!getChecklistDefinition(key)) {
        throw createServiceError('Unknown checklist item.');
      }
      if (!Object.values(CHECKLIST_ITEM_STATUS).includes(status)) {
        throw createServiceError('Unknown checklist status.');
      }

      const { checklist } = upsertChecklistItem(database, joining, key, status, remarks);

      const refreshed = findRecord(database.joinings, (item) => item.joiningId === joiningId);
      const nextStatus = decideVerificationStatus(
        refreshed.documents || [],
        createDefaultChecklist(refreshed.checklist),
        joining.status
      );
      if (nextStatus !== joining.status && joining.status !== JOINING_STATUS.JOINED) {
        database.joinings = database.joinings.map((item) =>
          item.joiningId === joiningId
            ? { ...item, status: nextStatus, updatedAt: new Date().toISOString() }
            : item
        );
      }

      appendActivity(database, {
        type: 'joining',
        applicationId: joining.applicationId,
        candidateId: joining.candidateId,
        action: `Checklist: ${statusLabel(status)}`,
        note: remarks || getChecklistDefinition(key)?.label || key,
        message: `Checklist item ${key} updated to ${status}`,
      });

      return checklist.find((item) => item.key === key);
    });
  },

  /**
   * Kept for backwards compatibility with the checklist toggle used by the
   * existing UI. A toggle maps to verified / pending.
   */
  async toggleChecklistItem(joiningId, key, completed) {
    return this.setChecklistStatus(
      joiningId,
      key,
      completed ? 'verified' : 'pending',
      completed ? 'Marked verified.' : ''
    );
  },

  /**
   * Marks the candidate as joined. The offer must be accepted and every
   * mandatory document and checklist item must be verified. Returns the
   * updated record with the missing reasons when the requirements are not met.
   */
  async markJoined(joiningId, { joinedBy = HR } = {}) {
    await delay(340);
    return mutateDatabase((database) => {
      const joining = findRecord(database.joinings, (item) => item.joiningId === joiningId);
      if (!joining) {
        throw createServiceError('The joining record could not be found.');
      }
      assertJoiningApplicationNotOnHold(database, joining);

      const offer = findRecord(database.offers, (item) => item.offerId === joining.offerId);
      if (!offer || offer.status !== OFFER_STATUS.ACCEPTED) {
        throw createServiceError(
          'An accepted offer is required before a candidate can be marked as joined.',
          { accepted_offer: 'The candidate must accept the offer before joining.' }
        );
      }

      const checklist = createDefaultChecklist(joining.checklist);
      const enriched = { ...joining, checklist, documents: joining.documents || [] };
      const missing = getMandatoryIncomplete(enriched);

      if (missing.length > 0) {
        throw createServiceError(
          `The candidate cannot be marked as joined yet: ${missing.join(' ')}`,
          { missing: missing.join(' | ') }
        );
      }

      const now = new Date().toISOString();
      const handover = {
        status: HANDOVER_STATUS.READY_FOR_REVIEW,
        handoverId: makeId('hov').toUpperCase(),
        preparedAt: now,
        importedAt: null,
        employeeRef: '',
        employeeId: '',
        designation: offer.designation || '',
        department: offer.department || '',
        error: '',
        history: [
          {
            at: now,
            action: 'Marked as Joined',
            by: joinedBy,
            remarks: 'All mandatory requirements are satisfied.',
          },
        ],
      };

      const updated = {
        ...joining,
        status: JOINING_STATUS.JOINED,
        joinedAt: now,
        joinedBy,
        handover,
        updatedAt: now,
      };

      database.joinings = database.joinings.map((item) =>
        item.joiningId === joiningId ? updated : item
      );

      transitionApplication(database, joining.applicationId, APPLICATION_STATUS.SELECTED, {
        note: 'Candidate joined and completed the recruitment workflow',
        at: now,
      });

      const candidate = findRecord(
        database.candidates,
        (item) => item.candidateId === joining.candidateId
      );
      appendActivity(database, {
        type: 'joining',
        applicationId: joining.applicationId,
        candidateId: joining.candidateId,
        action: 'Joined',
        previousStatus: APPLICATION_STATUS.JOINING,
        status: APPLICATION_STATUS.SELECTED,
        note: 'Candidate marked as joined',
        message: `${candidate?.fullName || 'Candidate'} joined`,
      });

      return updated;
    });
  },

  /**
   * Prepares the employee handover payload for review. The databank is not
   * called yet — this only validates and stores the handover metadata.
   */
  async prepareEmployeeHandover(joiningId) {
    await delay(340);
    return mutateDatabase((database) => {
      const joining = findRecord(database.joinings, (item) => item.joiningId === joiningId);
      if (!joining) {
        throw createServiceError('The joining record could not be found.');
      }

      const offer = findRecord(database.offers, (item) => item.offerId === joining.offerId);
      assertHandoverPossible(joining, offer);

      if (joining.handover?.status === HANDOVER_STATUS.IMPORTED) {
        throw createServiceError(
          'The employee has already been imported into the Employee Databank.'
        );
      }

      const application = findRecord(
        database.applications,
        (item) => item.applicationId === joining.applicationId
      );
      const candidate = findRecord(
        database.candidates,
        (item) => item.candidateId === joining.candidateId
      );
      const job = findRecord(database.jobs, (item) => item.jobId === application?.jobId);

      const payload = buildEmployeeHandoverPayload({
        candidate,
        application,
        job,
        offer,
        joining,
      });
      const validation = validateEmployeeHandover(payload);

      const now = new Date().toISOString();
      const previousHandover = joining.handover;

      const handover = {
        status: HANDOVER_STATUS.READY_FOR_REVIEW,
        handoverId: previousHandover?.handoverId || makeId('hov').toUpperCase(),
        preparedAt: now,
        importedAt: null,
        designation: offer?.designation || '',
        department: offer?.department || '',
        employeeRef: '',
        employeeId: '',
        error: validation.valid ? '' : validation.missing.join(' '),
        validationMissing: validation.missing,
        payloadSummary: describeHandover(payload),
        history: [
          ...(Array.isArray(previousHandover?.history) ? previousHandover.history : []),
          {
            at: now,
            action: 'Handover Prepared',
            by: HR,
            remarks: validation.valid
              ? 'Payload reviewed and ready for import to the Employee Databank.'
              : `Payload is incomplete: ${validation.missing.join(' ')}`,
          },
        ],
      };

      const updated = {
        ...joining,
        handover,
        updatedAt: now,
      };

      database.joinings = database.joinings.map((item) =>
        item.joiningId === joiningId ? updated : item
      );

      appendActivity(database, {
        type: 'joining',
        applicationId: joining.applicationId,
        candidateId: joining.candidateId,
        action: 'Handover Prepared',
        note: handover.payloadSummary,
        message: `Employee handover payload prepared for ${candidate?.fullName || 'candidate'}`,
      });

      return { handover, validation, payload };
    });
  },

  /**
   * Imports the employee into the existing Employee Databank through its
   * public contract (`employeeService.createEmployee`). The handover is
   * marked Imported only after the databank confirms the record.
   *
   * Duplicate prevention: an already-imported joining cannot be imported
   * again, and an employee with the same email is rejected by the databank.
   */
  async importEmployeeToDatabank(joiningId) {
    await delay(180);

    // Preconditions are validated inside one synchronous mutation.
    const prepared = mutateDatabase((database) => {
      const joining = findRecord(database.joinings, (item) => item.joiningId === joiningId);
      if (!joining) {
        throw createServiceError('The joining record could not be found.');
      }
      assertJoiningApplicationNotOnHold(database, joining);
      if (joining.status !== JOINING_STATUS.JOINED) {
        throw createServiceError(
          'The candidate must be marked as joined before the employee record can be imported.'
        );
      }
      if (joining.handover?.status === HANDOVER_STATUS.IMPORTED) {
        throw createServiceError(
          `The employee has already been imported (reference ${joining.handover.employeeId || joining.handover.handoverId}).`
        );
      }

      const offer = findRecord(database.offers, (item) => item.offerId === joining.offerId);
      assertHandoverPossible(joining, offer);

      const application = findRecord(
        database.applications,
        (item) => item.applicationId === joining.applicationId
      );
      const candidate = findRecord(
        database.candidates,
        (item) => item.candidateId === joining.candidateId
      );
      const job = findRecord(database.jobs, (item) => item.jobId === application?.jobId);

      const payload = buildEmployeeHandoverPayload({
        candidate,
        application,
        job,
        offer,
        joining,
      });
      const validation = validateEmployeeHandover(payload);

      if (!validation.valid) {
        throw createServiceError(
          `The employee payload is incomplete: ${validation.missing.join(' ')}`,
          { missing: validation.missing.join(' | ') }
        );
      }

      const now = new Date().toISOString();
      const databankPayload = {
        fullName: candidate?.fullName || '',
        email: candidate?.email || '',
        contactNumber: candidate?.phone || '',
        department: offer?.department || '',
        designation: offer?.designation || '',
        reportingManager: offer?.reportingManager || '',
        joiningDate: joining.joinedAt || joining.joiningDate || '',
        employmentType: offer?.employmentType || '',
        education: {
          qualification: payload.education?.[0]?.qualification || '',
          institution: payload.education?.[0]?.institution || '',
          specialization: payload.education?.[0]?.specialization || '',
          passingYear: payload.education?.[0]?.passingYear || '',
        },
        experience: {
          previousCompany: payload.experienceHistory?.[0]?.company || '',
          previousDesignation: payload.experienceHistory?.[0]?.designation || '',
          totalExperience:
            candidate?.totalExperienceYears != null
              ? `${candidate.totalExperienceYears} years`
              : '',
          jobResponsibilities: payload.experienceHistory?.[0]?.responsibilities || '',
        },
        cv: null,
      };

      // Mark the attempt so a concurrent duplicate import is visible in the history.
      const attemptedHistory = [
        ...(Array.isArray(joining.handover?.history) ? joining.handover.history : []),
        {
          at: now,
          action: 'Import Started',
          by: HR,
          remarks: 'Handover transferred to the Employee Databank public contract.',
        },
      ];
      database.joinings = database.joinings.map((item) =>
        item.joiningId === joiningId
          ? { ...item, handover: { ...item.handover, history: attemptedHistory }, updatedAt: now }
          : item
      );

      return { databankPayload, email: candidate?.email?.trim().toLowerCase() || '' };
    });

    // The Employee Databank public contract is called outside of the
    // synchronous mutation so failures can be recorded afterwards.
    let employee = null;
    let importError = null;
    try {
      const employees = await employeeService.getEmployees();
      const duplicate = employees.find(
        (item) =>
          String(item.email || '').trim().toLowerCase() === prepared.email
      );
      if (duplicate) {
        throw createServiceError(
          'An employee with this email already exists in the Employee Databank.'
        );
      }

      employee = await employeeService.createEmployee(prepared.databankPayload);
    } catch (error) {
      importError = error;
    }

    if (!importError) {
      return mutateDatabase((database) => {
        const joining = findRecord(
          database.joinings,
          (item) => item.joiningId === joiningId
        );
        const now = new Date().toISOString();
        const employeeId = employee.employeeId || employee.id || '';
        const handover = {
          ...joining.handover,
          status: HANDOVER_STATUS.IMPORTED,
          importedAt: now,
          employeeRef: `EMP imported (${employeeId})`,
          employeeId,
          error: '',
          history: [
            ...(joining.handover?.history || []),
            {
              at: now,
              action: 'Imported',
              by: 'Employee Databank',
              remarks: `Current employee record created (${employeeId}).`,
            },
          ],
        };

        const updated = { ...joining, handover, updatedAt: now };
        database.joinings = database.joinings.map((item) =>
          item.joiningId === joiningId ? updated : item
        );

        appendActivity(database, {
          type: 'joining',
          applicationId: joining.applicationId,
          candidateId: joining.candidateId,
          action: 'Employee Imported',
          note: `Employee record created in the Employee Databank (${employeeId}).`,
          message: `Employee record created in the Employee Databank (${employeeId}).`,
        });

        return { status: 'imported', employee, handover };
      });
    }

    // The databank rejected the record: mark the handover as failed and keep
    // the history so the import can be retried safely.
    mutateDatabase((database) => {
      const joining = findRecord(
        database.joinings,
        (item) => item.joiningId === joiningId
      );
      const now = new Date().toISOString();
      const handover = {
        ...joining.handover,
        status: HANDOVER_STATUS.IMPORT_FAILED,
        error: importError.message || 'The employee record could not be created.',
        history: [
          ...(joining.handover?.history || []),
          {
            at: now,
            action: 'Import Failed',
            by: 'Employee Databank',
            remarks: importError.message || 'The employee record could not be created.',
          },
        ],
      };

      const updated = { ...joining, handover, updatedAt: now };
      database.joinings = database.joinings.map((item) =>
        item.joiningId === joiningId ? updated : item
      );

      appendActivity(database, {
        type: 'joining',
        applicationId: joining.applicationId,
        candidateId: joining.candidateId,
        action: 'Import Failed',
        note: importError.message || 'The employee record could not be created.',
        message: `Employee handover failed for ${joining.applicationId}`,
      });
    });

    throw importError;
  },
};

function CHECKLIST_KEYS_FOR_DOCUMENT(documentType) {
  const map = {
    identity: 'identity',
    address: 'address',
    photograph: 'photograph',
    degree: 'degree',
    marksheets: 'marksheets',
    professional_certificate: 'professional_certificate',
    previous_employment: 'previous_employment',
    experience_certificate: 'experience_certificate',
    relieving_letter: 'relieving_letter',
    bank: 'bank',
    emergency_contact: 'emergency_contact',
    employment_details: 'employment_details',
  };
  return map[documentType] || null;
}

export default joiningService;
