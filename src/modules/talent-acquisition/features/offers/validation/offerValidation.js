import { EMPLOYMENT_TYPES, OFFER_DEPARTMENTS } from '../../../constants/offerStatus.js';

/**
 * Validation for the offer form.
 */
export function validateOfferForm(values = {}) {
  const errors = {};

  if (!values.applicationId) {
    errors.applicationId = 'Select the candidate the offer is for.';
  }

  if (!values.designation?.trim()) {
    errors.designation = 'Enter the offered designation.';
  }

  if (!values.department) {
    errors.department = 'Select the department.';
  } else if (!OFFER_DEPARTMENTS.includes(values.department)) {
    errors.department = 'Select a valid department.';
  }

  if (!values.employmentType) {
    errors.employmentType = 'Select the employment type.';
  } else if (!EMPLOYMENT_TYPES.some((type) => type.value === values.employmentType)) {
    errors.employmentType = 'Select a valid employment type.';
  }

  const salary = Number(values.salaryPackage);
  if (!values.salaryPackage) {
    errors.salaryPackage = 'Enter the salary package.';
  } else if (!Number.isFinite(salary) || salary <= 0) {
    errors.salaryPackage = 'Enter a salary package greater than zero.';
  }

  if (!values.joiningDate) {
    errors.joiningDate = 'Select the joining date.';
  }

  if (values.expiryDate && values.joiningDate) {
    if (new Date(values.expiryDate) <= new Date(values.joiningDate)) {
      errors.expiryDate = 'The offer expiry date must be after the joining date.';
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}
