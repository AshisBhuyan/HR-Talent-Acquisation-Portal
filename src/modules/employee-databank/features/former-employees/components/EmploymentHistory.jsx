import { Building2, Plus, Trash2 } from 'lucide-react';
import Button from '../../../../../shared/components/Button.jsx';
import { Input } from '../../../../../shared/components/Input.jsx';
import { formatDate } from '../../../utils/formatDate.js';

export default function EmploymentHistory({
  entries = [],
  onChange,
  disabled = false,
  readOnly = false,
}) {
  const updateEntry = (index, key, value) => {
    onChange?.(
      entries.map((entry, entryIndex) =>
        entryIndex === index ? { ...entry, [key]: value } : entry
      )
    );
  };

  const addEntry = () => {
    onChange?.([...entries, { company: '', designation: '', from: '', to: '' }]);
  };

  const removeEntry = (index) => {
    onChange?.(entries.filter((_, entryIndex) => entryIndex !== index));
  };

  if (readOnly) {
    if (!entries.length) {
      return <p className="cell-muted">No employment history recorded.</p>;
    }

    return (
      <ol className="history-timeline">
        {entries.map((entry, index) => (
          <li className="history-timeline__item" key={`${entry.company}-${index}`}>
            <span className="history-timeline__marker" aria-hidden="true" />
            <div>
              <div className="history-timeline__role">
                {entry.designation || 'Role not recorded'}
              </div>
              <div className="history-timeline__company">
                <Building2 size={13} aria-hidden="true" />
                {entry.company || 'Company not recorded'}
              </div>
              <div className="history-timeline__dates">
                {formatDate(entry.from)} — {entry.to ? formatDate(entry.to) : 'Present'}
              </div>
            </div>
          </li>
        ))}
      </ol>
    );
  }

  return (
    <div className="employment-history">
      {entries.length === 0 && (
        <p className="cell-muted" style={{ marginBottom: '0.6rem' }}>
          Add previous roles held at the company or earlier employers. This section is optional.
        </p>
      )}

      {entries.map((entry, index) => (
        <div className="employment-history__row" key={`history-${index}`}>
          <Input
            label="Company"
            value={entry.company}
            onChange={(event) => updateEntry(index, 'company', event.target.value)}
            placeholder="Company name"
            disabled={disabled}
          />
          <Input
            label="Designation"
            value={entry.designation}
            onChange={(event) => updateEntry(index, 'designation', event.target.value)}
            placeholder="Job title"
            disabled={disabled}
          />
          <Input
            label="From"
            type="date"
            value={entry.from}
            onChange={(event) => updateEntry(index, 'from', event.target.value)}
            disabled={disabled}
          />
          <Input
            label="To"
            type="date"
            value={entry.to}
            onChange={(event) => updateEntry(index, 'to', event.target.value)}
            disabled={disabled}
          />
          <Button
            variant="danger-ghost"
            size="sm"
            icon={Trash2}
            onClick={() => removeEntry(index)}
            disabled={disabled}
            type="button"
            className="employment-history__remove"
            aria-label="Remove employment history entry"
          >
            Remove
          </Button>
        </div>
      ))}

      <Button variant="outline" size="sm" icon={Plus} onClick={addEntry} disabled={disabled} type="button">
        Add employment history
      </Button>
    </div>
  );
}
