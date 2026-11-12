import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  BriefcaseBusiness,
  GraduationCap,
  History,
  ImagePlus,
  Save,
  Trash2,
  UserRound,
} from 'lucide-react';
import Button from '../../../../../shared/components/Button.jsx';
import { Input, Select, Textarea } from '../../../../../shared/components/Input.jsx';
import CVUpload from '../../cv-management/components/CVUpload.jsx';
import { validatePhotoFile } from '../../cv-management/validation/cvValidation.js';
import {
  buildInitialValues,
  employeeFormSections,
  getFieldValue,
  setFieldValue,
  validateEmployee,
} from '../validation/employeeSchema.js';
import { buildSubmissionData, computeProfileCompletion } from '../../../utils/formatEmployeeData.js';
import {
  MANUAL_COMPLETION_FIELDS,
  ONBOARDING_COMPLETION_FIELDS,
} from '../../../constants/employeeStatus.js';

const SECTION_ICONS = {
  user: UserRound,
  briefcase: BriefcaseBusiness,
  graduation: GraduationCap,
  history: History,
};

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('The selected image could not be read.'));
    reader.readAsDataURL(file);
  });
}

function PhotoField({ value, onChange, disabled }) {
  const inputRef = useRef(null);
  const [error, setError] = useState('');

  const handleFile = async (file) => {
    if (!file) return;
    const { valid, errors } = validatePhotoFile(file);
    if (!valid) {
      setError(errors[0]);
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setError('');
      onChange(dataUrl);
    } catch (readError) {
      setError(readError.message);
    }
  };

  return (
    <div className="field field--full">
      <span className="field__label">
        Profile Photo <span className="field__optional">(optional)</span>
      </span>
      <div className="photo-field">
        <div className="photo-field__preview">
          {value ? <img src={value} alt="Profile preview" /> : <ImagePlus size={24} />}
        </div>
        <div className="photo-field__actions">
          <div className="photo-field__actions-row">
            <input
              ref={inputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
              className="visually-hidden"
              tabIndex={-1}
              onChange={(event) => {
                handleFile(event.target.files?.[0]);
                event.target.value = '';
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              icon={ImagePlus}
              onClick={() => inputRef.current?.click()}
              disabled={disabled}
            >
              {value ? 'Change photo' : 'Upload photo'}
            </Button>
            {value && (
              <Button
                type="button"
                variant="danger-ghost"
                size="sm"
                icon={Trash2}
                onClick={() => {
                  setError('');
                  onChange('');
                }}
                disabled={disabled}
              >
                Remove
              </Button>
            )}
          </div>
          <span className="field__hint">JPG, PNG or WEBP · maximum 2 MB.</span>
          {error && (
            <span className="field__error" role="alert">
              <AlertCircle size={13} aria-hidden="true" />
              {error}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function EmployeeForm({
  initialData = null,
  onSubmit,
  onCancel,
  onDraftChange,
  onSaveLater,
  submitLabel = 'Save Employee',
  mode = 'manual',
  requireCv = false,
  hideFields = [],
  readOnlyFields = [],
}) {
  const [values, setValues] = useState(() => buildInitialValues(initialData || {}));
  const [cv, setCv] = useState(initialData?.cv || null);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [saving, setSaving] = useState(false);
  const [savingLater, setSavingLater] = useState(false);
  const initialDraftSignatureRef = useRef(
    JSON.stringify(buildSubmissionData(buildInitialValues(initialData || {}), initialData?.cv || null))
  );

  const sections = useMemo(
    () =>
      employeeFormSections
        .map((section) => ({
          ...section,
          fields: section.fields.filter(
            (item) =>
              !item.hideInModes?.includes(mode) && !hideFields.includes(item.name)
          ),
        }))
        .filter((section) => section.fields.length > 0),
    [mode, hideFields]
  );

  const completionFields = useMemo(
    () => (mode === 'onboarding' ? ONBOARDING_COMPLETION_FIELDS : MANUAL_COMPLETION_FIELDS),
    [mode]
  );

  const completion = useMemo(
    () =>
      computeProfileCompletion(buildSubmissionData(values, cv), {
        fields: completionFields,
      }),
    [values, cv, completionFields]
  );

  useEffect(() => {
    if (!onDraftChange) return;
    const draft = buildSubmissionData(values, cv);
    if (JSON.stringify(draft) === initialDraftSignatureRef.current) return;
    onDraftChange(draft);
  }, [values, cv, onDraftChange]);

  const setValue = (path, value) => {
    setValues((current) => setFieldValue(current, path, value));
    if (errors[path]) {
      setErrors((current) => {
        const next = { ...current };
        delete next[path];
        return next;
      });
    }
  };

  const handleSaveLater = async () => {
    if (!onSaveLater || savingLater) return;

    setSavingLater(true);
    try {
      await onSaveLater(buildSubmissionData(values, cv));
    } finally {
      setSavingLater(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving) return;

    const validation = validateEmployee(values, { requireCv, cv, mode });
    if (!validation.valid) {
      setErrors(validation.errors);
      setSubmitError('Please review the highlighted fields before continuing.');
      return;
    }

    setErrors({});
    setSubmitError('');
    setSaving(true);

    try {
      await onSubmit?.(buildSubmissionData(values, cv));
    } catch (error) {
      if (error.fieldErrors) {
        setErrors((current) => ({ ...current, ...error.fieldErrors }));
      }
      setSubmitError(error.message || 'The employee record could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      {submitError && (
        <div className="form-alert form-alert--error" role="alert">
          <AlertCircle size={17} aria-hidden="true" />
          <span>{submitError}</span>
        </div>
      )}

      <div className="form-progress">
        <div className="form-progress__head">
          <span>Profile completeness</span>
          <strong>{completion}%</strong>
        </div>
        <div className="form-progress__track" role="progressbar" aria-valuenow={completion} aria-valuemin={0} aria-valuemax={100}>
          <div className="form-progress__bar" style={{ width: `${completion}%` }} />
        </div>
      </div>

      {sections.map((section) => {
        const Icon = SECTION_ICONS[section.icon] || UserRound;

        return (
          <section className="form-section" key={section.id}>
            <div className="form-section__header">
              <span className="form-section__icon">
                <Icon size={16} aria-hidden="true" />
              </span>
              <div>
                <h3 className="form-section__title">{section.title}</h3>
                <p className="form-section__desc">{section.description}</p>
              </div>
            </div>

            <div className="form-section__body">
              <div className="form-grid">
                {section.fields.map((item) => {
                  if (item.type === 'photo') {
                    return (
                      <PhotoField
                        key={item.name}
                        value={values.profilePhoto}
                        onChange={(photo) => setValue('profilePhoto', photo)}
                        disabled={saving}
                      />
                    );
                  }

                  const readOnly = readOnlyFields.includes(item.name);
                  const common = {
                    label: item.label,
                    required: item.required,
                    optional: item.optional,
                    error: errors[item.name],
                    hint: readOnly ? 'Locked to your verified invitation email.' : item.hint,
                    value: getFieldValue(values, item.name),
                    placeholder: item.placeholder,
                    disabled: saving,
                    readOnly,
                    className: item.fullWidth ? 'field--full' : '',
                  };

                  if (item.type === 'select') {
                    return (
                      <Select
                        key={item.name}
                        {...common}
                        options={item.options}
                        placeholder={item.placeholder}
                        onChange={(event) => setValue(item.name, event.target.value)}
                      />
                    );
                  }

                  if (item.type === 'textarea') {
                    return (
                      <Textarea
                        key={item.name}
                        {...common}
                        rows={item.rows || 4}
                        onChange={(event) => setValue(item.name, event.target.value)}
                      />
                    );
                  }

                  return (
                    <Input
                      key={item.name}
                      {...common}
                      type={item.type}
                      min={item.min}
                      max={item.max}
                      autoComplete={item.autoComplete}
                      onChange={(event) => setValue(item.name, event.target.value)}
                    />
                  );
                })}
              </div>
            </div>
          </section>
        );
      })}

      <section className="form-section">
        <div className="form-section__header">
          <span className="form-section__icon">
            <History size={16} aria-hidden="true" />
          </span>
          <div>
            <h3 className="form-section__title">CV & Documents</h3>
            <p className="form-section__desc">
              Upload, preview, download or replace the employee CV. File rules are centrally
              configured.
            </p>
          </div>
        </div>
        <div className="form-section__body">
          <CVUpload value={cv} onChange={setCv} required={requireCv} disabled={saving} />
          {errors.cv && (
            <span className="field__error" role="alert">
              <AlertCircle size={13} aria-hidden="true" />
              {errors.cv}
            </span>
          )}
        </div>
      </section>

      <div className="form-actions">
        {onSaveLater && (
          <Button
            variant="outline"
            icon={Save}
            onClick={handleSaveLater}
            loading={savingLater}
            disabled={saving}
            type="button"
          >
            {savingLater ? 'Saving draft…' : 'Save and Continue Later'}
          </Button>
        )}
        {onCancel && (
          <Button variant="outline" onClick={onCancel} disabled={saving} type="button">
            Cancel
          </Button>
        )}
        <Button type="submit" icon={Save} loading={saving}>
          {saving ? 'Saving…' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
