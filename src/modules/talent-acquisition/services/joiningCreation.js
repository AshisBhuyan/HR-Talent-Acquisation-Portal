import {
  appendActivity,
  findRecord,
  makeId,
} from './mockBackend.js';
import {
  JOINING_STATUS,
  createDefaultChecklist,
} from '../constants/joiningStatus.js';
import { APPLICATION_STATUS } from '../constants/applicationStatus.js';
import {
  transitionApplication,
  assertApplicationNotOnHold,
} from '../features/candidate-applications/services/candidateApplicationService.js';

/**
 * Shared construction of joining records. Used by the manual HR action and
 * by the candidate portal when a candidate submits documents, so both open
 * the same kind of record.
 */
export function buildJoiningRecord(offer, { note = '' } = {}) {
  const now = new Date().toISOString();
  return {
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
}

/**
 * Finds the joining record for an offer or creates it. Returns the joining
 * record (existing or new) and whether it was created.
 */
export function ensureJoiningForOffer(
  database,
  offer,
  { user = 'HR Administrator', note = '' } = {}
) {
  assertApplicationNotOnHold(
    findRecord(database.applications, (item) => item.applicationId === offer.applicationId)
  );

  const existing = findRecord(
    database.joinings,
    (item) => item.offerId === offer.offerId
  );
  if (existing) return { joining: existing, created: false };

  const record = buildJoiningRecord(offer, { note });
  database.joinings.push(record);

  try {
    transitionApplication(database, offer.applicationId, APPLICATION_STATUS.JOINING, {
      note: note || 'Joining checklist opened after the offer was accepted',
      at: record.updatedAt,
    });
  } catch {
    // The application may already be in the joining stage; do not fail the
    // document submission because of the pipeline bookkeeping.
  }

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
    note: note || 'Joining checklist opened after the offer was accepted',
    message: `Joining started for ${candidate?.fullName || 'candidate'}`,
    user,
  });

  return { joining: record, created: true };
}
