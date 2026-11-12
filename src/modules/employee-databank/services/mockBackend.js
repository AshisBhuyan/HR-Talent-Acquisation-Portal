import { createSeedDatabase } from '../data/employeeMockData.js';
import { computeProfileCompletion } from '../utils/formatEmployeeData.js';

const STORAGE_KEY = 'ecm_mock_database_v1';

let memoryDatabase = null;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function persist(database) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(database));
  } catch {
    // localStorage can be unavailable (private mode/quota). The in-memory
    // database keeps the demo usable for the current session.
  }
}

function getDatabase() {
  if (memoryDatabase) return memoryDatabase;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      memoryDatabase = JSON.parse(raw);
      // Non-destructive migration: new collections are added without touching
      // any existing record.
      if (!Array.isArray(memoryDatabase.emailEvents)) memoryDatabase.emailEvents = [];
      return memoryDatabase;
    }
  } catch {
    // Ignore storage read failures and fall back to seed data.
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

export function delay(milliseconds = 320) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

export function makeId(prefix) {
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now().toString(36)}${random}`;
}

export function makeToken(label = 'invite') {
  const random = Math.random().toString(36).slice(2, 10);
  const date = Date.now().toString(36);
  return `${label}_${random}${date}`;
}

export function createServiceError(message, fieldErrors = {}) {
  const error = new Error(message);
  error.fieldErrors = fieldErrors;
  return error;
}

export function isDuplicateEmail(database, email, excludeId = null) {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized) return false;

  const people = [
    ...database.employees,
    ...database.formerEmployees,
  ];

  return people.some(
    (person) =>
      person.id !== excludeId && String(person.email || '').trim().toLowerCase() === normalized
  );
}

export function nextEmployeeCode(database) {
  const codes = [...database.employees, ...database.formerEmployees]
    .map((person) => String(person.employeeId || person.previousEmployeeId || ''))
    .map((code) => {
      const match = code.match(/(\d+)$/);
      return match ? Number(match[1]) : 0;
    });

  const next = Math.max(1204, ...codes) + 1;
  return `EMP-${String(next).padStart(4, '0')}`;
}

export function isInvitationExpired(invitation) {
  if (!invitation || invitation.status === 'completed') return false;
  if (!invitation.expiresAt) return false;
  return new Date(invitation.expiresAt).getTime() < Date.now();
}

export function normalizeInvitation(invitation) {
  if (!invitation) return invitation;

  const reminders = Array.isArray(invitation.reminders) ? invitation.reminders : [];
  const profileDraft = invitation.profileDraft || null;
  // A stored draft is the source of truth: the completion is always
  // recalculated from the saved values so the percentage can never drift.
  const profileCompletion = profileDraft
    ? computeProfileCompletion(profileDraft)
    : Number.isFinite(Number(invitation.profileCompletion))
      ? Number(invitation.profileCompletion)
      : invitation.status === 'completed'
        ? 100
        : 0;

  const normalized = {
    ...invitation,
    // Legacy "sent" records are pending invitations: issued but not started.
    status: invitation.status === 'sent' ? 'pending' : invitation.status,
    profileDraft,
    profileCompletion,
    reminders,
    reminderCount:
      Number.isFinite(Number(invitation.reminderCount))
        ? Number(invitation.reminderCount)
        : reminders.length,
    lastReminderSentAt:
      invitation.lastReminderSentAt ||
      reminders[reminders.length - 1]?.sentAt ||
      null,
    initialSentAt: invitation.initialSentAt || invitation.sentAt || invitation.createdAt || null,
    openedAt: invitation.openedAt || null,
    draftUpdatedAt: invitation.draftUpdatedAt || null,
    tokenRenewedAt: invitation.tokenRenewedAt || null,
    tokenRenewalCount: Number(invitation.tokenRenewalCount) || 0,
  };

  // A completed submission is never downgraded because its token expired.
  if (
    normalized.status !== 'completed' &&
    !normalized.submissionId &&
    isInvitationExpired(normalized)
  ) {
    normalized.status = 'expired';
  }

  return normalized;
}
