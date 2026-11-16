import {
  INTERVIEWER_NOTIFICATION_STATUS,
  getInterviewType,
  getInterviewTypeMeta,
} from '../../../constants/interviewStatus.js';

let draftCounter = 0;

export function makeInterviewerId() {
  draftCounter += 1;
  return `intr_${Date.now().toString(36)}${draftCounter.toString(36)}`;
}

export function normalizeEmail(value = '') {
  return String(value || '').trim().toLowerCase();
}

export function isValidEmail(value = '') {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

/**
 * A single interviewer record. New interviewers start as "pending" and are
 * marked "sent" once the simulated notification has been recorded.
 */
export function createInterviewerRecord(interviewer = {}, fallbackId) {
  return {
    id: interviewer.id || fallbackId || makeInterviewerId(),
    name: String(interviewer.name || '').trim(),
    email: String(interviewer.email || '').trim(),
    notificationStatus:
      interviewer.notificationStatus || INTERVIEWER_NOTIFICATION_STATUS.PENDING,
    attempts: Number(interviewer.attempts) || 0,
    sentAt: interviewer.sentAt || null,
    error: interviewer.error || '',
    history: Array.isArray(interviewer.history) ? interviewer.history : [],
  };
}

export function splitLegacyInterviewerNames(value = '') {
  return String(value || '')
    .split(/[,;]/)
    .map((name) => name.trim())
    .filter(Boolean);
}

/**
 * Read-time normalization keeps legacy records (a single `interviewer` string)
 * usable without rewriting the stored database. Records that already carry an
 * `interviewers` array are returned as-is with missing fields filled in.
 */
export function normalizeInterviewers(interview) {
  const seed = interview?.interviewId || 'interview';
  const stored = Array.isArray(interview?.interviewers) ? interview.interviewers : [];
  const records = stored
    .filter((item) => item && (item.name || item.email))
    .map((item, index) =>
      createInterviewerRecord(item, `${seed}-interviewer-${index + 1}`)
    );

  if (records.length > 0) return records;

  return splitLegacyInterviewerNames(interview?.interviewer).map((name, index) => ({
    id: `${seed}-interviewer-${index + 1}`,
    name,
    email: '',
    notificationStatus: INTERVIEWER_NOTIFICATION_STATUS.SKIPPED,
    attempts: 0,
    sentAt: null,
    error: '',
    history: [],
  }));
}

export function getInterviewerNames(interview) {
  return normalizeInterviewers(interview)
    .map((interviewer) => interviewer.name)
    .filter(Boolean)
    .join(', ');
}

export function getInterviewerCount(interview) {
  const list = normalizeInterviewers(interview);
  return list.length || (interview?.interviewer ? 1 : 0);
}

export function getInterviewerSummary(interview) {
  const names = normalizeInterviewers(interview)
    .map((interviewer) => interviewer.name)
    .filter(Boolean);

  if (names.length === 0) return interview?.interviewer || 'Not assigned';
  if (names.length === 1) return names[0];
  return `${names[0]} +${names.length - 1} more`;
}

export function getInterviewerTypeMeta(interview) {
  return getInterviewTypeMeta(getInterviewerCount(interview));
}

export function getInterviewTypeForInterview(interview) {
  return getInterviewType(getInterviewerCount(interview));
}

/**
 * Merges the submitted interviewer list with the stored list. A notification
 * already sent to the same email address is preserved; a changed email address
 * resets the notification so the new recipient is notified.
 */
export function mergeInterviewerEntries(incoming = [], previous = [], seed = 'interview') {
  return incoming.map((item, index) => {
    const email = normalizeEmail(item.email);
    const name = String(item.name || '').trim();
    const prior =
      previous.find((entry) => item.id && entry.id === item.id) ||
      previous.find(
        (entry) =>
          (email && normalizeEmail(entry.email) === email) ||
          (!email && entry.name && entry.name.toLowerCase() === name.toLowerCase())
      );

    if (!prior) {
      return createInterviewerRecord(
        { name, email: item.email },
        `${seed}-interviewer-${index + 1}`
      );
    }

    const emailChanged = normalizeEmail(prior.email) !== email;
    return {
      ...prior,
      name,
      email: item.email,
      notificationStatus: emailChanged
        ? INTERVIEWER_NOTIFICATION_STATUS.PENDING
        : prior.notificationStatus,
      attempts: emailChanged ? 0 : prior.attempts,
      sentAt: emailChanged ? null : prior.sentAt,
      error: emailChanged ? '' : prior.error,
      history: prior.history || [],
    };
  });
}
