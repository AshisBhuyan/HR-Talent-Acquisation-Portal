const DATE_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

function toValidDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(value, fallback = '—') {
  const date = toValidDate(value);
  return date ? DATE_FORMATTER.format(date) : fallback;
}

export function formatDateTime(value, fallback = '—') {
  const date = toValidDate(value);
  return date ? DATE_TIME_FORMATTER.format(date) : fallback;
}

export function toDateInputValue(value) {
  const date = toValidDate(value);
  if (!date) return '';
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 10);
}

export function toTimeInputValue(value) {
  const date = toValidDate(value);
  if (!date) return '';
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function isValidDateInput(value) {
  if (!value) return false;
  const date = toValidDate(value);
  return Boolean(date);
}

/**
 * Builds an ISO timestamp that is `amount` days away from today. Used to keep
 * the seeded demo data relevant whenever the mock database is created.
 */
export function daysAgo(amount = 0) {
  const date = new Date();
  date.setHours(10, 30, 0, 0);
  date.setDate(date.getDate() - amount);
  return date.toISOString();
}

/**
 * Builds an ISO timestamp `amount` days ahead of today at the given time.
 */
export function daysAhead(amount = 0, hour = 10, minute = 0) {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  date.setDate(date.getDate() + amount);
  return date.toISOString();
}

export function formatRelativeDay(value) {
  const date = toValidDate(value);
  if (!date) return '—';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const diffDays = Math.round((target - today) / 86400000);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays > 1 && diffDays <= 7) return `In ${diffDays} days`;
  if (diffDays < -1 && diffDays >= -7) return `${Math.abs(diffDays)} days ago`;
  return formatDate(date);
}

export function formatTimeOfDay(value) {
  const date = toValidDate(value);
  if (!date) return '—';
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}
