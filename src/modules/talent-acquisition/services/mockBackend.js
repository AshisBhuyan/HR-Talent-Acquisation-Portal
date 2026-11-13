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
export const STORAGE_VERSION = 5;

let memoryDatabase = null;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function createSeedDatabase() {
  const now = new Date().toISOString();
  return {
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
  };
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

function getDatabase() {
  if (memoryDatabase) return memoryDatabase;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);

      // The seeded demonstration records change with the seed version. An
      // older record set is refreshed so the workflow stays consistent; the
      // storage of every other module is never touched.
      if (!parsed.version || parsed.version < STORAGE_VERSION) {
        memoryDatabase = createSeedDatabase();
        persist(memoryDatabase);
        return memoryDatabase;
      }

      memoryDatabase = ensureCollections(parsed);
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

