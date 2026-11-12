import { X } from 'lucide-react';
import Button from '../../../shared/components/Button.jsx';

export default function EmployeeFilters({ filters = [], onClear }) {
  const hasActive = filters.some((filter) => Boolean(filter.value));

  return (
    <div className="filters">
      {filters.map((filter) => (
        <select
          key={filter.key}
          className="select"
          value={filter.value}
          onChange={(event) => filter.onChange(event.target.value)}
          aria-label={filter.label}
        >
          <option value="">{filter.placeholder || `All ${filter.label}`}</option>
          {filter.options.map((option) => {
            const value = typeof option === 'string' ? option : option.value;
            const label = typeof option === 'string' ? option : option.label;
            return (
              <option key={value} value={value}>
                {label}
              </option>
            );
          })}
        </select>
      ))}
      {hasActive && onClear && (
        <Button variant="ghost" size="sm" icon={X} onClick={onClear}>
          Clear filters
        </Button>
      )}
    </div>
  );
}
