import { Briefcase, Search, SlidersHorizontal, X } from 'lucide-react';
import { Select } from '../../../../../shared/components/Input.jsx';
import Button from '../../../../../shared/components/Button.jsx';
import { APPLICATION_STATUS_OPTIONS } from '../../../constants/applicationStatus.js';
import { SCREENING_STATUS_OPTIONS } from '../../../constants/screeningStatus.js';

function findOptionLabel(options, value) {
  const match = options.find((option) => option.value === value);
  return match ? match.label : value;
}

/**
 * Search and filter controls of the candidate application list.
 *
 * The position filter is visually distinct and every active filter is shown
 * as a removable chip so HR always knows what is applied.
 */
export default function ApplicationFilters({
  filters,
  positions,
  activeFilterCount,
  totalCount,
  onChange,
  onReset,
}) {
  const positionLabel = filters.jobId
    ? findOptionLabel(positions, filters.jobId)
    : '';
  const statusLabel = filters.status
    ? findOptionLabel(APPLICATION_STATUS_OPTIONS, filters.status)
    : '';
  const screeningLabel = filters.screeningStatus
    ? findOptionLabel(SCREENING_STATUS_OPTIONS, filters.screeningStatus)
    : '';

  const activeChips = [
    filters.search ? { key: 'search', label: `Search: ${filters.search}` } : null,
    positionLabel ? { key: 'jobId', label: `Position: ${positionLabel}` } : null,
    statusLabel ? { key: 'status', label: `Status: ${statusLabel}` } : null,
    screeningLabel ? { key: 'screeningStatus', label: `Screening: ${screeningLabel}` } : null,
    filters.dateFrom ? { key: 'dateFrom', label: `From: ${filters.dateFrom}` } : null,
    filters.dateTo ? { key: 'dateTo', label: `To: ${filters.dateTo}` } : null,
  ].filter(Boolean);

  return (
    <section className="ta-applications-toolbar" aria-label="Application filters">
      <div className="ta-applications-toolbar__row">
        <div className="search-box ta-applications-toolbar__search">
          <span className="search-box__icon">
            <Search size={16} aria-hidden="true" />
          </span>
          <input
            type="search"
            className="input"
            value={filters.search}
            onChange={(event) => onChange('search', event.target.value)}
            placeholder="Search candidate name, email or application ID..."
            aria-label="Search candidates"
          />
        </div>

        <div className="ta-position-filter">
          <label className="ta-position-filter__label" htmlFor="applications-position">
            <Briefcase size={15} aria-hidden="true" />
            Position
          </label>
          <Select
            id="applications-position"
            aria-label="Filter by position"
            value={filters.jobId}
            onChange={(event) => onChange('jobId', event.target.value)}
            placeholder="All Positions"
            options={positions}
          />
        </div>

        <Select
          aria-label="Filter by application status"
          value={filters.status}
          onChange={(event) => onChange('status', event.target.value)}
          placeholder="All statuses"
          options={APPLICATION_STATUS_OPTIONS}
        />
        <Select
          aria-label="Filter by screening status"
          value={filters.screeningStatus}
          onChange={(event) => onChange('screeningStatus', event.target.value)}
          placeholder="All screening states"
          options={SCREENING_STATUS_OPTIONS}
        />

        <label className="ta-inline-field">
          <span className="ta-inline-field__label">From</span>
          <input
            type="date"
            className="input"
            value={filters.dateFrom}
            onChange={(event) => onChange('dateFrom', event.target.value)}
            aria-label="Applications from date"
          />
        </label>
        <label className="ta-inline-field">
          <span className="ta-inline-field__label">To</span>
          <input
            type="date"
            className="input"
            value={filters.dateTo}
            onChange={(event) => onChange('dateTo', event.target.value)}
            aria-label="Applications to date"
          />
        </label>
      </div>

      {activeChips.length > 0 && (
        <div className="ta-applications-toolbar__active">
          <span className="filters-summary">
            <SlidersHorizontal size={13} aria-hidden="true" /> Active filters
          </span>
          <ul className="ta-active-filters" aria-label="Active filters">
            {activeChips.map((chip) => (
              <li key={chip.key}>
                <button
                  type="button"
                  className="ta-active-filter"
                  onClick={() => onChange(chip.key, '')}
                  aria-label={`Remove filter ${chip.label}`}
                >
                  {chip.label}
                  <X size={12} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
          <div className="ta-applications-toolbar__spacer" />
          <span className="ta-applications-toolbar__count" aria-live="polite">
            {totalCount} matching application{totalCount === 1 ? '' : 's'}
          </span>
          <Button variant="ghost" size="sm" icon={X} onClick={onReset}>
            Clear Filters
          </Button>
        </div>
      )}

      {activeChips.length === 0 && (
        <div className="ta-applications-toolbar__meta">
          <span className="filters-summary">
            <SlidersHorizontal size={13} aria-hidden="true" /> All applications shown
          </span>
          <div className="ta-applications-toolbar__spacer" />
          <span className="ta-applications-toolbar__count" aria-live="polite">
            {totalCount} application{totalCount === 1 ? '' : 's'}
          </span>
        </div>
      )}
    </section>
  );
}
