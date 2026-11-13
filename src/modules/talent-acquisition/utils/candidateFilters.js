/**
 * Search, filter, sort and pagination helpers for the candidate application
 * list. The functions are pure so they can be reused by the screening and
 * reporting features.
 */

export const APPLICATION_SORT_OPTIONS = [
  { value: 'applied_desc', label: 'Newest first' },
  { value: 'applied_asc', label: 'Oldest first' },
  { value: 'name_asc', label: 'Name A–Z' },
  { value: 'position_asc', label: 'Position A–Z' },
];

export const DEFAULT_PAGE_SIZE = 8;

function normalise(value) {
  return String(value ?? '').trim().toLowerCase();
}

export function matchesSearchTerm(row, term) {
  const needle = normalise(term);
  if (!needle) return true;

  return (
    normalise(row.candidateName).includes(needle) ||
    normalise(row.candidateEmail).includes(needle) ||
    normalise(row.applicationId).includes(needle) ||
    normalise(row.candidateId).includes(needle) ||
    normalise(row.jobTitle).includes(needle)
  );
}

export function filterApplications(rows, filters = {}) {
  const {
    search = '',
    jobId = '',
    status = '',
    dateFrom = '',
    dateTo = '',
    screeningStatus = '',
  } = filters;

  return rows.filter((row) => {
    if (!matchesSearchTerm(row, search)) return false;
    if (jobId && row.jobId !== jobId) return false;
    if (status && row.status !== status) return false;
    if (screeningStatus && row.screeningStatus !== screeningStatus) return false;

    if (dateFrom) {
      const applied = new Date(row.appliedDate || 0).getTime();
      const from = new Date(`${dateFrom}T00:00:00`).getTime();
      if (!Number.isFinite(applied) || applied < from) return false;
    }

    if (dateTo) {
      const applied = new Date(row.appliedDate || 0).getTime();
      const to = new Date(`${dateTo}T23:59:59`).getTime();
      if (!Number.isFinite(applied) || applied > to) return false;
    }

    return true;
  });
}

export function sortApplications(rows, sortKey = 'applied_desc') {
  const sorted = [...rows];

  switch (sortKey) {
    case 'applied_asc':
      return sorted.sort(
        (a, b) => new Date(a.appliedDate || 0).getTime() - new Date(b.appliedDate || 0).getTime()
      );
    case 'name_asc':
      return sorted.sort((a, b) => String(a.candidateName).localeCompare(String(b.candidateName)));
    case 'position_asc':
      return sorted.sort((a, b) => String(a.jobTitle).localeCompare(String(b.jobTitle)));
    case 'applied_desc':
    default:
      return sorted.sort(
        (a, b) => new Date(b.appliedDate || 0).getTime() - new Date(a.appliedDate || 0).getTime()
      );
  }
}

export function paginate(rows, page = 1, pageSize = DEFAULT_PAGE_SIZE) {
  const total = rows.length;
  const size = Math.max(1, Number(pageSize) || DEFAULT_PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(total / size));
  const currentPage = Math.min(Math.max(1, Number(page) || 1), totalPages);
  const start = (currentPage - 1) * size;

  return {
    items: rows.slice(start, start + size),
    page: currentPage,
    pageSize: size,
    total,
    totalPages,
    from: total === 0 ? 0 : start + 1,
    to: Math.min(start + size, total),
  };
}

export function getActiveFilterCount(filters = {}) {
  return ['search', 'jobId', 'status', 'dateFrom', 'dateTo', 'screeningStatus'].filter(
    (key) => normalise(filters[key])
  ).length;
}

export function isWithinDateRange(value, dateFrom, dateTo) {
  const time = new Date(value || 0).getTime();
  if (!Number.isFinite(time)) return false;
  if (dateFrom && time < new Date(`${dateFrom}T00:00:00`).getTime()) return false;
  if (dateTo && time > new Date(`${dateTo}T23:59:59`).getTime()) return false;
  return true;
}
