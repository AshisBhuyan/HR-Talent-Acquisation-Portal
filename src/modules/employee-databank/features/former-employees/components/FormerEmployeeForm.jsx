import { useState } from 'react';
import {
  AlertCircle,
  BriefcaseBusiness,
  History,
  Save,
  UserRound,
} from 'lucide-react';
import Button from '../../../../../shared/components/Button.jsx';
import { Input, Select, Textarea } from '../../../../../shared/components/Input.jsx';
import CVUpload from '../../cv-management/components/CVUpload.jsx';
import EmploymentHistory from './EmploymentHistory.jsx';
import { DEPARTMENTS } from '../../../constants/employeeStatus.js';
import { EMAIL_REGEX, PHONE_REGEX } from '../../employees/validation/employeeSchema.js';

const EMPTY_FORM = {
  previousEmployeeId: '',
  fullName: '',
  email: '',
  contactNumber: '',
  previousDepartment: '',
  previousDesignation: '',
  joiningDate: '',
  leavingDate: '',
  employmentHistory: [],
  notes: '',
};

function buildInitial(initialData) {
  if (!initialData) return { ...EMPTY_FORM };
  return {
    ...EMPTY_FORM,
    ...initialData,
    employmentHistory: initialData.employmentHistory
      ? initialData.employmentHistory.map((entry) => ({ ...entry }))
      : [],
  };
}

function validateFormerEmployee(values) {
  const errors = {};

  if (!values.previousEmployeeId?.trim()) {
    errors.previousEmployeeId = 'Previous employee ID is required.';
  }
  if (!values.fullName?.trim()) {
    errors.fullName = 'Full name is required.';
  }
  if (!values.email?.trim()) {
    errors.email = 'Email address is required.';
  } else if (!EMAIL_REGEX.test(values.email.trim())) {
    errors.email = 'Enter a valid email address.';
  }
  if (!values.contactNumber?.trim()) {
    errors.contactNumber = 'Contact number is required.';
  } else if (!PHONE_REGEX.test(values.contactNumber.trim())) {
    errors.contactNumber = 'Enter a valid contact number (7–20 digits).';
  }
  if (!values.previousDepartment) {
    errors.previousDepartment = 'Previous department is required.';
  }
  if (!values.previousDesignation?.trim()) {
    errors.previousDesignation = 'Previous designation is required.';
  }
  if (!values.joiningDate) {
    errors.joiningDate = 'Joining date is required.';
  }
  if (!values.leavingDate) {
    errors.leavingDate = 'Leaving date is required.';
  }
  if (
    values.joiningDate &&
    values.leavingDate &&
    new Date(values.leavingDate).getTime() < new Date(values.joiningDate).getTime()
  ) {
    errors.leavingDate = 'Leaving date cannot be before the joining date.';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export default function FormerEmployeeForm({
  initialData = null,
  onSubmit,
  onCancel,
  submitLabel = 'Save Former Employee',
}) {
  const [values, setValues] = useState(() => buildInitial(initialData));
  const [cv, setCv] = useState(initialData?.cv || null);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [saving, setSaving] = useState(false);

  const setField = (key, value) => {
    setValues((current) => ({ ...current, [key]: value }));
    if (errors[key]) {
      setErrors((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving) return;

    const validation = validateFormerEmployee(values);
    if (!validation.valid) {
      setErrors(validation.errors);
      setSubmitError('Please review the highlighted fields before continuing.');
      return;
    }

    setErrors({});
    setSubmitError('');
    setSaving(true);

    try {
      await onSubmit?.({ ...values, cv });
    } catch (error) {
      if (error.fieldErrors) {
        setErrors((current) => ({ ...current, ...error.fieldErrors }));
      }
      setSubmitError(error.message || 'The former employee record could not be saved.');
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

      <section className="form-section">
        <div className="form-section__header">
          <span className="form-section__icon">
            <UserRound size={16} aria-hidden="true" />
          </span>
          <div>
            <h3 className="form-section__title">Former Employee Identity</h3>
            <p className="form-section__desc">
              Historical records stay separate from current employee records.
            </p>
          </div>
        </div>
        <div className="form-section__body">
          <div className="form-grid">
            <Input
              label="Previous Employee ID"
              required
              value={values.previousEmployeeId}
              onChange={(event) => setField('previousEmployeeId', event.target.value)}
              placeholder="e.g. EMP-0931"
              error={errors.previousEmployeeId}
              disabled={saving}
            />
            <Input
              label="Full Name"
              required
              value={values.fullName}
              onChange={(event) => setField('fullName', event.target.value)}
              placeholder="e.g. Rohan Gupta"
              error={errors.fullName}
              disabled={saving}
            />
            <Input
              label="Email Address"
              required
              type="email"
              value={values.email}
              onChange={(event) => setField('email', event.target.value)}
              placeholder="name@company.com"
              error={errors.email}
              disabled={saving}
            />
            <Input
              label="Contact Number"
              required
              type="tel"
              value={values.contactNumber}
              onChange={(event) => setField('contactNumber', event.target.value)}
              placeholder="+91 98765 43210"
              error={errors.contactNumber}
              disabled={saving}
            />
          </div>
        </div>
      </section>

      <section className="form-section">
        <div className="form-section__header">
          <span className="form-section__icon">
            <BriefcaseBusiness size={16} aria-hidden="true" />
          </span>
          <div>
            <h3 className="form-section__title">Previous Employment</h3>
            <p className="form-section__desc">Role, department and employment dates.</p>
          </div>
        </div>
        <div className="form-section__body">
          <div className="form-grid">
            <Select
              label="Previous Department"
              required
              value={values.previousDepartment}
              onChange={(event) => setField('previousDepartment', event.target.value)}
              options={DEPARTMENTS}
              placeholder="Select department"
              error={errors.previousDepartment}
              disabled={saving}
            />
            <Input
              label="Previous Designation"
              required
              value={values.previousDesignation}
              onChange={(event) => setField('previousDesignation', event.target.value)}
              placeholder="e.g. Senior QA Engineer"
              error={errors.previousDesignation}
              disabled={saving}
            />
            <Input
              label="Joining Date"
              required
              type="date"
              value={values.joiningDate}
              onChange={(event) => setField('joiningDate', event.target.value)}
              error={errors.joiningDate}
              disabled={saving}
            />
            <Input
              label="Leaving Date"
              required
              type="date"
              value={values.leavingDate}
              onChange={(event) => setField('leavingDate', event.target.value)}
              error={errors.leavingDate}
              disabled={saving}
            />
            <Textarea
              label="Internal Notes"
              optional
              value={values.notes}
              onChange={(event) => setField('notes', event.target.value)}
              placeholder="Exit reason, rehire eligibility or other internal notes."
              rows={3}
              className="field--full"
              disabled={saving}
            />
          </div>
        </div>
      </section>

      <section className="form-section">
        <div className="form-section__header">
          <span className="form-section__icon">
            <History size={16} aria-hidden="true" />
          </span>
          <div>
            <h3 className="form-section__title">Employment History</h3>
            <p className="form-section__desc">Optional record of roles held over time.</p>
          </div>
        </div>
        <div className="form-section__body">
          <EmploymentHistory
            entries={values.employmentHistory}
            onChange={(entries) => setField('employmentHistory', entries)}
            disabled={saving}
          />
        </div>
      </section>

      <section className="form-section">
        <div className="form-section__header">
          <span className="form-section__icon">
            <History size={16} aria-hidden="true" />
          </span>
          <div>
            <h3 className="form-section__title">Previous CV</h3>
            <p className="form-section__desc">Upload or keep the last CV on record.</p>
          </div>
        </div>
        <div className="form-section__body">
          <CVUpload
            value={cv}
            onChange={setCv}
            label="Previous CV"
            disabled={saving}
            hint="Optional for former employee records."
          />
        </div>
      </section>

      <div className="form-actions">
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
