import { Search } from 'lucide-react';

export default function EmployeeSearch({
  value,
  onChange,
  placeholder = 'Search by name, email, ID or designation…',
  label = 'Search employees',
}) {
  return (
    <div className="search-box">
      <span className="search-box__icon">
        <Search size={16} aria-hidden="true" />
      </span>
      <input
        type="search"
        className="input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={label}
      />
    </div>
  );
}
