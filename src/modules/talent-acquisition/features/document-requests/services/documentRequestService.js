import {
  appendActivity,
  appendEmailEvent,
  createServiceError,
  delay,
  findRecord,
  makeId,
  mutateDatabase,
  readDatabase,
} from '../../../services/mockBackend.js';
import {
  DOCUMENT_REQUEST_STATUS,
  createDocumentRequestRequirements,
  getRequestDocumentLabel,
  CHECKLIST_KEYS_BY_REQUEST_TYPE,
} from '../../../constants/documentRequestRules.js';
import {
  APPLICATION_STATUS,
} from '../../../constants/applicationStatus.js';
import {
  CHECKLIST_ITEM_STATUS,
  JOINING_STATUS,
  createDefaultChecklist,
  getChecklistDefinition,
} from '../../../constants/joiningStatus.js';
import {
  transitionApplication,
  assertApplicationNotOnHold,
} from '../../candidate-applications/services/candidateApplicationService.js';
import { ensureJoiningForOffer } from '../../../services/joiningCreation.js';
import {
  buildDocumentRequestEmail,
  buildDocumentSubmissionUrl,
} from '../../offer-emails/services/offerEmailService.js';

const CANDIDATE = 'Candidate';

export function isCurrentDocument(document) {
  return document?.isCurrent !== false;
}

/**
 * Normalizes a requirement/document type so comparisons stay stable across
 * seeded and persisted records.
 */
function normalizeDocumentType(value) {
  return String(value ?? '').trim().toLowerCase();
}

/**
 * Resolves the document types that belong to one document request.
 *
 * The request persists its own requirement snapshot, so that snapshot is the
 * authoritative scope. A joining record may also hold documents from other
 * requests or unrelated joining requirements; those types must not influence
 * this request's status.
 */
function getRequestDocumentTypes(requiredDocuments) {
  const types = new Set();
  (requiredDocuments || []).forEach((requirement) => {
    const type = normalizeDocumentType(requirement?.type);
    if (type) types.add(type);
  });
  return types;
}

/**
 * Derives the document-request status from the mandatory requirements and
 * the current documentation set.
 *
 * Only current versions of documents whose type belongs to this request's
 * requirement snapshot participate in the calculation. Documents outside the
 * request scope (for example an unrelated marksheets record kept on the
 * joining record) cannot force the request into `resubmission_required`.
 */
export function deriveRequestStatus(requiredDocuments, currentDocs) {
  const requirements = Array.isArray(requiredDocuments) ? requiredDocuments : [];
  const requestedTypes = getRequestDocumentTypes(requirements);

  const relevantDocuments = (currentDocs || []).filter(
    (document) =>
      isCurrentDocument(document) &&
      requestedTypes.has(normalizeDocumentType(document.type))
  );

  const mandatoryOutstanding = requirements
    .filter((item) => item.mandatory)
    .some((item) => {
      const type = normalizeDocumentType(item.type);
      const doc = relevantDocuments.find(
        (entry) => normalizeDocumentType(entry.type) === type
      );
      return !doc || ['pending', 'resubmission_required'].includes(doc.status);
    });
  const anyResubmission = relevantDocuments.some(
    (doc) => doc.status === 'resubmission_required'
  );

  if (anyResubmission) return DOCUMENT_REQUEST_STATUS.RESUBMISSION_REQUIRED;
  if (mandatoryOutstanding) return DOCUMENT_REQUEST_STATUS.REQUESTED;
  return DOCUMENT_REQUEST_STATUS.SUBMITTED;
}

export function currentDocuments(joining) {
  return (joining?.documents || []).filter(isCurrentDocument);
}

function upsertChecklistForType(database, joining, type, status, remark = '') {
  const keys = CHECKLIST_KEYS_BY_REQUEST_TYPE[type] || [];
  if (keys.length === 0) return;

  const now = new Date().toISOString();
  // Re-read fresh state so sequential updates of several checklist items
  // (e.g. degree + marksheets) do not clobber each other.
  const current =
    findRecord(database.joinings, (item) => item.joiningId === joining.joiningId) ||
    joining;
  const checklist = createDefaultChecklist(current.checklist).map((item) => {
    if (!keys.includes(item.key)) return item;
    return {
      ...item,
      status,
      remarks: remark || item.remarks,
      verifiedBy: status === CHECKLIST_ITEM_STATUS.VERIFIED ? 'Candidate' : item.verifiedBy,
      updatedAt: now,
      history: [
        ...item.history,
        {
          at: now,
          action: status === 'submitted' ? 'Submitted' : status,
          by: CANDIDATE,
          remarks: remark,
        },
      ],
    };
  });

  database.joinings = database.joinings.map((item) =>
    item.joiningId === joining.joiningId ? { ...item, checklist, updatedAt: now } : item
  );
}

function findApplicationBundle(database, offer) {
  const application = findRecord(
    database.applications,
    (item) => item.applicationId === offer.applicationId
  );
  const candidate = findRecord(
    database.candidates,
    (item) => item.candidateId === offer.candidateId
  );
  const job = findRecord(database.jobs, (item) => item.jobId === application?.jobId);
  return { application, candidate, job };
}

/**
 * Creates the document-submission request and its mock email event for an
 * accepted offer. Idempotent: an offer that already has a request is left
 * untouched and no second email is recorded.
 */
export function ensureDocumentRequestForOffer(
  database,
  offer,
  { user = 'HR Administrator', now = new Date().toISOString() } = {}
) {
  const existing = findRecord(
    database.documentRequests,
    (item) => item.offerId === offer.offerId
  );
  if (existing) return { request: existing, created: false, email: null };

  const { application, candidate, job } = findApplicationBundle(database, offer);
  if (!application || !candidate) {
    throw createServiceError('The application or candidate behind the offer is missing.');
  }

  const token = makeId('docs');
  const link = buildDocumentSubmissionUrl(token);
  const request = {
    requestId: makeId('dreq'),
    applicationId: application.applicationId,
    candidateId: candidate.candidateId,
    offerId: offer.offerId,
    token,
    status: DOCUMENT_REQUEST_STATUS.REQUESTED,
    requiredDocuments: createDocumentRequestRequirements(),
    stagedDocuments: {},
    requestedAt: now,
    submittedAt: null,
    emailId: null,
    updatedAt: now,
  };

  const { subject, body } = buildDocumentRequestEmail({ candidate, job, offer, link });
  const email = appendEmailEvent(database, {
    type: 'document_request',
    applicationId: application.applicationId,
    candidateId: candidate.candidateId,
    offerId: offer.offerId,
    to: candidate.email || '',
    subject,
    body,
    link,
    status: 'simulated_sent',
    sentBy: user,
  });
  request.emailId = email.id;

  database.documentRequests.push(request);

  appendActivity(database, {
    type: 'joining',
    applicationId: application.applicationId,
    candidateId: candidate.candidateId,
    action: 'Document Submission Requested',
    status: 'requested',
    note: 'Candidate was asked (simulated email) to submit the joining documents.',
    message: `Document submission requested from ${candidate.fullName || 'candidate'}`,
    user,
  });

  return { request, created: true, email };
}

async function loadRequestBundle(token) {
  const database = readDatabase();
  const request = findRecord(database.documentRequests, (item) => item.token === token);
  if (!request) return null;

  const offer = findRecord(database.offers, (item) => item.offerId === request.offerId);
  const application = findRecord(
    database.applications,
    (item) => item.applicationId === request.applicationId
  );
  const candidate = findRecord(
    database.candidates,
    (item) => item.candidateId === request.candidateId
  );
  const job = findRecord(database.jobs, (item) => item.jobId === application?.jobId);
  const joining = findRecord(
    database.joinings,
    (item) => item.offerId === request.offerId
  );

  return { request, offer, application, candidate, job, joining, database };
}

/**
 * Builds the per-document status list shown in the candidate portal.
 */
export function buildPortalDocumentStates(request, joining) {
  const required = Array.isArray(request?.requiredDocuments)
    ? request.requiredDocuments
    : [];
  const current = currentDocuments(joining);
  const staged = request?.stagedDocuments || {};

  return required.map((requirement) => {
    const currentDoc = current.find((document) => document.type === requirement.type);
    const stagedDoc = staged[requirement.type];

    let state = 'awaiting';
    if (currentDoc) state = currentDoc.status; // submitted | verified | under_verification | resubmission_required | pending
    if (stagedDoc) state = 'staged';

    return {
      ...requirement,
      label: requirement.label || getRequestDocumentLabel(requirement.type),
      currentDocument: currentDoc || null,
      stagedDocument: stagedDoc || null,
      state,
      canUpload:
        !currentDoc ||
        currentDoc.status === 'resubmission_required' ||
        currentDoc.status === 'pending',
      verified: currentDoc?.status === 'verified',
    };
  });
}

export function portalProgress(states) {
  const mandatory = states.filter((item) => item.mandatory);
  const done = mandatory.filter((item) =>
    ['submitted', 'under_verification', 'verified', 'staged'].includes(item.state)
  );
  return {
    mandatoryTotal: mandatory.length,
    mandatoryDone: done.length,
    totalDocuments: states.length,
    percent: mandatory.length
      ? Math.round((done.length / mandatory.length) * 100)
      : 0,
  };
}

export const documentRequestService = {
  /**
   * Reads the request behind a DEV-ONLY mock token. Returns null when the
   * token does not match any request.
   */
  async getPortalState(token) {
    await delay(120);
    const bundle = await loadRequestBundle(token);
    if (!bundle) return null;
    const states = buildPortalDocumentStates(bundle.request, bundle.joining);
    return { ...bundle, states, progress: portalProgress(states) };
  },

  /**
   * Stages a validated file for submission. The blob is stored in IndexedDB
   * by the caller; this records only metadata.
   */
  async stageDocument(token, meta) {
    await delay(120);
    return mutateDatabase((database) => {
      const request = findRecord(
        database.documentRequests,
        (item) => item.token === token
      );
      if (!request) {
        throw createServiceError('This document submission link is not valid.');
      }

      const requirement = (request.requiredDocuments || []).find(
        (item) => item.type === meta.type
      );
      if (!requirement) {
        throw createServiceError('This document type is not part of the request.');
      }

      const now = new Date().toISOString();
      const stagedDocuments = {
        ...(request.stagedDocuments || {}),
        [meta.type]: {
          type: meta.type,
          fileName: meta.fileName,
          mimeType: meta.mimeType,
          sizeBytes: Number(meta.sizeBytes) || 0,
          storageKey: meta.storageKey || '',
          stagedAt: now,
        },
      };

      database.documentRequests = database.documentRequests.map((item) =>
        item.requestId === request.requestId
          ? { ...item, stagedDocuments, updatedAt: now }
          : item
      );

      return stagedDocuments[meta.type];
    });
  },

  async unstageDocument(token, type) {
    await delay(80);
    return mutateDatabase((database) => {
      const request = findRecord(
        database.documentRequests,
        (item) => item.token === token
      );
      if (!request) {
        throw createServiceError('This document submission link is not valid.');
      }

      const stagedDocuments = { ...(request.stagedDocuments || {}) };
      const removed = stagedDocuments[type] || null;
      delete stagedDocuments[type];

      database.documentRequests = database.documentRequests.map((item) =>
        item.requestId === request.requestId
          ? { ...item, stagedDocuments, updatedAt: new Date().toISOString() }
          : item
      );

      return removed;
    });
  },

  /**
   * Final submission of the staged documents. Creates (or reuses) the
   * joining record, supersedes previous versions of re-uploaded documents,
   * preserves every previous version and returns the portal confirmation.
   */
  async submitDocuments(token, { user = CANDIDATE } = {}) {
    await delay(320);
    return mutateDatabase((database) => {
      const request = findRecord(
        database.documentRequests,
        (item) => item.token === token
      );
      if (!request) {
        throw createServiceError('This document submission link is not valid.');
      }

      const offer = findRecord(database.offers, (item) => item.offerId === request.offerId);
      if (!offer) {
        throw createServiceError('The offer behind this request could not be found.');
      }

      const { application, candidate, job } = findApplicationBundle(database, offer);
      if (!application || !candidate) {
        throw createServiceError('The application or candidate behind this request is missing.');
      }

      assertApplicationNotOnHold(application);

      const staged = request.stagedDocuments || {};
      const stagedList = Object.values(staged);
      if (stagedList.length === 0) {
        throw createServiceError('Stage at least one document before submitting.');
      }

      const { joining } = ensureJoiningForOffer(
        database,
        offer,
        {
          user,
          note: 'Joining record opened when the candidate submitted the documents',
        }
      );

      const now = new Date().toISOString();
      const requiredTypes = new Set(
        (request.requiredDocuments || []).map((item) => item.type)
      );

      let documents = Array.isArray(joining.documents) ? [...joining.documents] : [];

      for (const stagedDoc of stagedList) {
        if (!requiredTypes.has(stagedDoc.type)) continue;

        // Supersede the current version of the same document type, if any.
        documents = documents.map((document) =>
          document.type === stagedDoc.type && isCurrentDocument(document)
            ? {
                ...document,
                isCurrent: false,
                history: [
                  ...(document.history || []),
                  {
                    at: now,
                    action: 'Replaced',
                    by: CANDIDATE,
                    remarks: 'Replaced by a newer version submitted through the portal.',
                  },
                ],
              }
            : document
        );

        const previous = documents.filter((document) => document.type === stagedDoc.type);
        const version = previous.length + 1;

        documents.push({
          documentId: makeId('jd'),
          type: stagedDoc.type,
          fileName: stagedDoc.fileName,
          mimeType: stagedDoc.mimeType,
          sizeBytes: stagedDoc.sizeBytes,
          storageKey: stagedDoc.storageKey || '',
          submittedAt: now,
          status: 'submitted',
          verifiedBy: '',
          remarks: '',
          version,
          isCurrent: true,
          history: [
            {
              at: now,
              action: version > 1 ? 'Resubmitted' : 'Submitted',
              by: CANDIDATE,
              remarks:
                version > 1
                  ? 'Replacement document submitted through the candidate portal.'
                  : 'Document submitted through the candidate portal.',
            },
          ],
        });
      }

      // Refresh the joining record with the new document set.
      database.joinings = database.joinings.map((item) =>
        item.joiningId === joining.joiningId ? { ...item, documents, updatedAt: now } : item
      );

      const refreshedJoining = findRecord(
        database.joinings,
        (item) => item.joiningId === joining.joiningId
      );
      for (const stagedDoc of stagedList) {
        upsertChecklistForType(database, refreshedJoining, stagedDoc.type, 'submitted', '');
      }

      // Progress state for the request: submitted when every mandatory
      // document is in a submitted-or-better status.
      const refreshedDocs = currentDocuments(
        findRecord(database.joinings, (item) => item.joiningId === joining.joiningId)
      );
      const nextRequestStatus = deriveRequestStatus(
        request.requiredDocuments,
        refreshedDocs
      );

      database.documentRequests = database.documentRequests.map((item) =>
        item.requestId === request.requestId
          ? {
              ...item,
              status: nextRequestStatus,
              submittedAt: now,
              stagedDocuments: {},
              updatedAt: now,
            }
          : item
      );

      appendActivity(database, {
        type: 'joining',
        applicationId: application.applicationId,
        candidateId: candidate.candidateId,
        action: 'Documents Submitted',
        note: `${stagedList.length} document(s) submitted through the candidate portal.`,
        message: `Joining documents submitted for ${candidate.fullName || 'candidate'}`,
        user,
      });

      return {
        requestId: request.requestId,
        joiningId: joining.joiningId,
        submittedAt: now,
        documentsSubmitted: stagedList.length,
        requestStatus: nextRequestStatus,
      };
    });
  },
};

export default documentRequestService;
