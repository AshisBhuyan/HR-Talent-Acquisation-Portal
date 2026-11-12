import { useId } from 'react';
import { AlertCircle } from 'lucide-react';

function FieldShell({
  id,
  label,
  required,
  optional,
  error,
  hint,
  children,
  className = '',
}) {
  return (
    <div className={`field ${className}`.trim()}>
      {label && (
        <label className="field__label" htmlFor={id}>
          {label}
          {required && (
            <span className="field__required" aria-hidden="true">
              *
            </span>
          )}
          {optional && <span className="field__optional">(optional)</span>}
        </label>
      )}
      {children}
      {error && (
        <span className="field__error" id={`${id}-error`} role="alert">
          <AlertCircle size={13} aria-hidden="true" />
          {error}
        </span>
      )}
      {!error && hint && <span className="field__hint">{hint}</span>}
    </div>
  );
}

export function Input({
  label,
  required = false,
  optional = false,
  error,
  hint,
  id,
  icon: Icon,
  className = '',
  ...props
}) {
  const autoId = useId();
  const inputId = id || `input-${autoId}`;

  return (
    <FieldShell
      id={inputId}
      label={label}
      required={required}
      optional={optional}
      error={error}
      hint={hint}
      className={className}
    >
      {Icon ? (
        <div className="input-wrap">
          <span className="input-wrap__icon">
            <Icon size={15} aria-hidden="true" />
          </span>
          <input
            id={inputId}
            className={`input ${error ? 'input--error' : ''}`}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${inputId}-error` : undefined}
            {...props}
          />
        </div>
      ) : (
        <input
          id={inputId}
          className={`input ${error ? 'input--error' : ''}`}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : undefined}
          {...props}
        />
      )}
    </FieldShell>
  );
}

export function Select({
  label,
  required = false,
  optional = false,
  error,
  hint,
  id,
  options = [],
  placeholder = 'Select an option',
  className = '',
  ...props
}) {
  const autoId = useId();
  const selectId = id || `select-${autoId}`;

  return (
    <FieldShell
      id={selectId}
      label={label}
      required={required}
      optional={optional}
      error={error}
      hint={hint}
      className={className}
    >
      <select
        id={selectId}
        className={`select ${error ? 'select--error' : ''}`}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${selectId}-error` : undefined}
        {...props}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => {
          const value = typeof option === 'string' ? option : option.value;
          const text = typeof option === 'string' ? option : option.label;
          return (
            <option key={value} value={value}>
              {text}
            </option>
          );
        })}
      </select>
    </FieldShell>
  );
}

export function Textarea({
  label,
  required = false,
  optional = false,
  error,
  hint,
  id,
  className = '',
  ...props
}) {
  const autoId = useId();
  const textareaId = id || `textarea-${autoId}`;

  return (
    <FieldShell
      id={textareaId}
      label={label}
      required={required}
      optional={optional}
      error={error}
      hint={hint}
      className={className}
    >
      <textarea
        id={textareaId}
        className={`textarea ${error ? 'textarea--error' : ''}`}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${textareaId}-error` : undefined}
        {...props}
      />
    </FieldShell>
  );
}

export function Field({
  label,
  required = false,
  optional = false,
  error,
  hint,
  id,
  children,
  className = '',
}) {
  return (
    <FieldShell
      id={id}
      label={label}
      required={required}
      optional={optional}
      error={error}
      hint={hint}
      className={className}
    >
      {children}
    </FieldShell>
  );
}

export default Input;
