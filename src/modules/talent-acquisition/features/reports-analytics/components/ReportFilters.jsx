import { Download, RotateCcw } from 'lucide-react';
import { Select } from '../../../../../shared/components/Input.jsx';
import Button from '../../../../../shared/components/Button.jsx';
import { RECRUITMENT_STAGE_OPTIONS } from '../../../constants/recruitmentStages.js';

/**
 * Report filters: date range, recruitment stage and position.
 */
export default function ReportFilters({
  filters,
  jobOptions,
  onChange,
  onReset,
  onExport,
  loading,
}) {
  return (
    <div className="page-toolbar">
      <label className="ta-inline-field">
        <span className="ta-inline-field__label">From</span>
        <input
          type="date"
          className="input"
          value={filters.dateFrom}
          onChange={(event) => onChange('dateFrom', event.target.value)}
          aria-label="Report start date"
        />
      </label>
      <label className="ta-inline-field">
        <span className="ta-inline-field__label">To</span>
        <input
          type="date"
          className="input"
          value={filters.dateTo}
          onChange={(event) => onChange('dateTo', event.target.value)}
          aria-label="Report end date"
        />
      </label>

      <div className="filters">
        <Select
          aria-label="Filter by recruitment stage"
          value={filters.stage}
          onChange={(event) => onChange('stage', event.target.value)}
          placeholder="All stages"
          options={RECRUITMENT_STAGE_OPTIONS}
        />
        <Select
          aria-label="Filter by position"
          value={filters.jobId}
          onChange={(event) => onChange('jobId', event.target.value)}
          placeholder="All positions"
          options={jobOptions}
        />
      </div>

      <div className="page-toolbar__spacer" />

      <Button variant="ghost" size="sm" icon={RotateCcw} onClick={onReset} disabled={loading}>
        Reset
      </Button>
      <Button variant="outline" size="sm" icon={Download} onClick={onExport} disabled={loading}>
        Export CSV
      </Button>
    </div>
  );
}
