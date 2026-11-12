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
  return date.toISOString().slice(0, 10);
}

export function isPastDate(value) {
  const date = toValidDate(value);
  return date ? date.getTime() < Date.now() : false;
}

export function formatCountdown(targetDate, now = Date.now()) {
  const date = toValidDate(targetDate);
  if (!date) return '00:00';
  const remaining = Math.max(0, date.getTime() - now);
  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
