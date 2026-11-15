import { allCandidateMockData, applicationMockData } from '../data/candidateMockData.js';
import { jobReferenceData } from '../data/jobReferenceData.js';
import { screeningMockData } from '../data/screeningMockData.js';
import {
  approvalMockData,
  joiningMockData,
  offerMockData,
  selectionMockData,
  shortlistingMockData,
} from '../data/offerMockData.js';
import { interviewMockData } from '../data/interviewMockData.js';
import { recruitmentActivityMockData } from '../data/recruitmentMetricsMockData.js';

/**
 * Mock persistence layer for the Talent Acquisition module.
 *
 * The storage key is namespaced so the Employee Databank records
 * (`ecm_mock_database_v1`) are never read or written from this module.
 */
export const STORAGE_KEY = 'ecometrix:talent-acquisition:v1';
export const STORAGE_VERSION = 6;

let memoryDatabase = null;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function createSeedDatabase() {
  const now = new Date().toISOString();
  const seed = {
    version: STORAGE_VERSION,
    seededAt: now,
    candidates: clone(allCandidateMockData),
    jobs: clone(jobReferenceData),
    applications: clone(applicationMockData),
    screenings: clone(screeningMockData),
    shortlistings: clone(shortlistingMockData),
    interviews: clone(interviewMockData),
    selections: clone(selectionMockData),
    approvals: clone(approvalMockData),
    offers: clone(offerMockData),
    joinings: clone(joiningMockData),
    activities: clone(recruitmentActivityMockData),
    emailEvents: [],
    documentRequests: [],
  };

  // Seeded offers that were already sent need a response token too, so the
  // candidate-facing link works in a fresh demo.
  seed.offers = seed.offers.map((offer) =>
    offer.status === 'sent' && !offer.responseToken
      ? { ...offer, responseToken: makeId('resp') }
      : offer
  );
  return seed;
}

function persist(database) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(database));
  } catch {
    // localStorage can be unavailable (private mode or quota). The in-memory
    // database keeps the demo usable for the current session.
  }
}

function ensureCollections(database) {
  const seed = createSeedDatabase();
  Object.keys(seed).forEach((key) => {
    if (key === 'version' || key === 'seededAt') return;
    if (!Array.isArray(database[key])) database[key] = seed[key];
  });
  if (!database.version) database.version = STORAGE_VERSION;
  return database;
}

/**
 * Additive, non-destructive migration. Existing candidate records are never
 * deleted or replaced. Newer collections are introduced and missing fields
 * are filled in; nothing the stored records already carry is removed.
 */
function migrateDatabase(database) {
  const migrated = { ...database };

  if (!Array.isArray(migrated.emailEvents)) migrated.emailEvents = [];
  if (!Array.isArray(migrated.documentRequests)) migrated.documentRequests = [];

  // Offers that were already sent keep working in the candidate-facing
  // response flow: a development-only mock token is issued when missing.
  migrated.offers = (migrated.offers || []).map((offer) => {
    if (offer.responseToken) return offer;
    if (!['sent'].includes(offer.status)) return offer;
    return { ...offer, responseToken: makeId('resp') };
  });

  migrated.version = STORAGE_VERSION;
  return migrated;
}

function getDatabase() {
  if (memoryDatabase) return memoryDatabase;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);

      // Additive migration only: stored records are preserved and older
      // datasets are upgraded in place. The Employee Databank storage is
      // never touched from this module.
      memoryDatabase = ensureCollections(migrateDatabase(parsed));
      if (parsed.version !== STORAGE_VERSION) {
        persist(memoryDatabase);
      }
      return memoryDatabase;
    }
  } catch {
    // Ignore storage read failures and fall back to the seed data.
  }

  memoryDatabase = createSeedDatabase();
  persist(memoryDatabase);
  return memoryDatabase;
}

export function readDatabase() {
  return clone(getDatabase());
}

export function writeDatabase(database) {
  memoryDatabase = clone(database);
  persist(memoryDatabase);
  return clone(memoryDatabase);
}

export function mutateDatabase(mutator) {
  const database = readDatabase();
  const result = mutator(database);
  writeDatabase(database);
  return result === undefined ? database : result;
}

export function resetMockDatabase() {
  memoryDatabase = createSeedDatabase();
  persist(memoryDatabase);
  return clone(memoryDatabase);
}

export function delay(milliseconds = 260) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

export function makeId(prefix) {
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now().toString(36)}${random}`;
}

export function createServiceError(message, fieldErrors = {}) {
  const error = new Error(message);
  error.fieldErrors = fieldErrors;
  return error;
}

export function findRecord(collection, predicate) {
  const list = Array.isArray(collection) ? collection : [];
  return list.find(predicate) || null;
}

export function updateRecord(collection, predicate, updater) {
  const index = collection.findIndex(predicate);
  if (index === -1) return null;
  const updated = updater(collection[index]);
  collection[index] = updated;
  return updated;
}

/**
 * Appends a simulated email operation to the mock email log. The entry is
 * explicitly marked as a mock operation; no real email is ever delivered
 * from the frontend.
 */
export function appendEmailEvent(database, event) {
  const entry = {
    id: makeId('eml'),
    type: event.type || 'generic',
    applicationId: event.applicationId || null,
    candidateId: event.candidateId || null,
    offerId: event.offerId || null,
    joiningId: event.joiningId || null,
    to: event.to || '',
    subject: event.subject || '',
    body: event.body || '',
    link: event.link || '',
    mode: 'mock',
    delivered: false,
    simulated: true,
    status: event.status || 'simulated_sent',
    sentAt: event.sentAt || new Date().toISOString(),
    sentBy: event.sentBy || 'HR Administrator',
    note:
      event.note ||
      'Simulated: no real email was delivered. The operation is recorded in the Talent Acquisition mock email log.',
  };
  if (!Array.isArray(database.emailEvents)) database.emailEvents = [];
  database.emailEvents.unshift(entry);
  database.emailEvents = database.emailEvents.slice(0, 100);
  return entry;
}

/**
 * Appends an entry to the recruitment activity feed. Activities are derived
 * from real workflow transitions so the dashboard never shows invented
 * events.
 */
export function appendActivity(database, activity) {
  const entry = {
    id: makeId('act'),
    at: activity.at || new Date().toISOString(),
    type: activity.type || 'application',
    applicationId: activity.applicationId || null,
    candidateId: activity.candidateId || null,
    action: activity.action || activity.message || '',
    message: activity.message || activity.action || '',
    note: activity.note || '',
    previousStatus: activity.previousStatus || null,
    status: activity.status || null,
    user: activity.user || 'HR Administrator',
  };
  database.activities.unshift(entry);
  database.activities = database.activities.slice(0, 60);
  return entry;
}

