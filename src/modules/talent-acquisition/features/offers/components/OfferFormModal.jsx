import { useEffect, useState } from 'react';
import { Info } from 'lucide-react';
import Modal from '../../../../../shared/components/Modal.jsx';
import Button from '../../../../../shared/components/Button.jsx';
import { Input, Select, Textarea } from '../../../../../shared/components/Input.jsx';
import { validateOfferForm } from '../validation/offerValidation.js';
import { EMPLOYMENT_TYPES, OFFER_DEPARTMENTS } from '../../../constants/offerStatus.js';

const EMPTY_FORM = {
  applicationId: '',
  designation: '',
  department: '',
  employmentType: 'Full-time',
  salaryPackage: '',
  joiningDate: '',
  reportingManager: '',
  expiryDate: '',
  additionalTerms: '',
};

/**
 * Creates or edits an offer. An offer can only be created for an application
 * with an approved hiring recommendation.
 */
export default function OfferFormModal({
  open,
  offer,
  eligibleApplications,
  onClose,
  onSubmit,
  loading,
}) {
  const [values, setValues] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open) return;

    if (offer) {
      setValues({
        applicationId: offer.applicationId,
        designation: offer.designation || '',
        department: offer.department || '',
        employmentType: offer.employmentType || 'Full-time',
        salaryPackage: offer.salaryPackage || '',
        joiningDate: offer.joiningDate ? offer.joiningDate.slice(0, 10) : '',
        reportingManager: offer.reportingManager || '',
        expiryDate: offer.expiryDate ? offer.expiryDate.slice(0, 10) : '',
        additionalTerms: offer.additionalTerms || '',
      });
    } else {
      setValues(EMPTY_FORM);
    }
    setErrors({});
  }, [open, offer]);

  const update = (key, value) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const handleSubmit = () => {
    const result = validateOfferForm(values);
    if (!result.valid) {
      setErrors(result.errors);
      return;
    }
    onSubmit(values, offer?.offerId);
  };

  const isEdit = Boolean(offer);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit draft offer' : 'Create offer'}
      subtitle="An offer requires an approved hiring recommendation"
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            loading={loading}
            disabled={!isEdit && eligibleApplications.length === 0}
          >
            {isEdit ? 'Save offer' : 'Create draft offer'}
          </Button>
        </>
      }
    >
      <div className="form-grid">
        {isEdit ? (
          <Input
            label="Candidate"
            value={offer.applicationId}
            readOnly
            disabled
          />
        ) : eligibleApplications.length === 0 ? (
          <div className="field field--full">
            <div className="notice notice--warning">
              <span className="notice__icon">
                <Info size={18} aria-hidden="true" />
              </span>
              <div className="notice__body">
                <div className="notice__title">No candidate is ready for an offer</div>
                An offer can only be created for an application whose hiring recommendation has
                been approved by the administrator. Approve a pending recommendation in the admin
                approval stage first.
              </div>
            </div>
          </div>
        ) : (
          <div className="field field--full">
            <Select
              label="Candidate"
              required
              value={values.applicationId}
              onChange={(event) => update('applicationId', event.target.value)}
              error={errors.applicationId}
              placeholder="Select an approved candidate"
              options={eligibleApplications.map((entry) => ({
                value: entry.application.applicationId,
                label: `${entry.candidate.fullName} · ${entry.job.title}`,
              }))}
            />
          </div>
        )}

        <Input
          label="Designation"
          required
          value={values.designation}
          onChange={(event) => update('designation', event.target.value)}
          error={errors.designation}
        />

        <Select
          label="Department"
          required
          value={values.department}
          onChange={(event) => update('department', event.target.value)}
          error={errors.department}
          placeholder="Select a department"
          options={OFFER_DEPARTMENTS.map((department) => ({
            value: department,
            label: department,
          }))}
        />

        <Select
          label="Employment type"
          required
          value={values.employmentType}
          onChange={(event) => update('employmentType', event.target.value)}
          error={errors.employmentType}
          options={EMPLOYMENT_TYPES}
        />

        <Input
          label="Salary package"
          required
          type="number"
          min="0"
          value={values.salaryPackage}
          onChange={(event) => update('salaryPackage', event.target.value)}
          error={errors.salaryPackage}
          hint="Annual package in INR"
        />

        <Input
          label="Joining date"
          required
          type="date"
          value={values.joiningDate}
          onChange={(event) => update('joiningDate', event.target.value)}
          error={errors.joiningDate}
        />

        <Input
          label="Reporting manager"
          optional
          value={values.reportingManager}
          onChange={(event) => update('reportingManager', event.target.value)}
          error={errors.reportingManager}
        />

        <Input
          label="Offer expiry date"
          optional
          type="date"
          value={values.expiryDate}
          onChange={(event) => update('expiryDate', event.target.value)}
          error={errors.expiryDate}
        />

        <div className="field field--full">
          <Textarea
            label="Additional terms"
            optional
            value={values.additionalTerms}
            onChange={(event) => update('additionalTerms', event.target.value)}
            placeholder="Bonus, relocation, probation or other conditions"
          />
        </div>
      </div>
    </Modal>
  );
}
