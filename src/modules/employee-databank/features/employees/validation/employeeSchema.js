import {
  DEPARTMENTS,
  EMPLOYMENT_TYPES,
} from '../../../constants/employeeStatus.js';

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE_REGEX = /^\+?[\d\s()-]{7,20}$/;

export const EMPTY_EMPLOYEE_VALUES = {
  employeeId: '',
  fullName: '',
  email: '',
  contactNumber: '',
  profilePhoto: '',
  department: '',
  designation: '',
  joiningDate: '',
  employmentType: '',
  reportingManager: '',
  education: {
    qualification: '',
    institution: '',
    specialization: '',
    passingYear: '',
  },
  experience: {
    previousCompany: '',
    previousDesignation: '',
    totalExperience: '',
    jobResponsibilities: '',
  },
};

function field(name, label, type, options = {}) {
  return { name, label, type, ...options };
}

export const employeeFormSections = [
  {
    id: 'basic',
    title: 'Basic Information',
    description: 'Identity, contact details and profile photo.',
    icon: 'user',
    fields: [
      field('employeeId', 'Employee ID', 'text', {
        required: true,
        placeholder: 'e.g. EMP-1211',
        hint: 'Must be unique across employee records.',
        hideInModes: ['onboarding'],
      }),
      field('fullName', 'Full Name', 'text', {
        required: true,
        placeholder: 'e.g. Ananya Sharma',
        autoComplete: 'name',
      }),
      field('email', 'Email Address', 'email', {
        required: true,
        placeholder: 'name@company.com',
        autoComplete: 'email',
      }),
      field('contactNumber', 'Contact Number', 'tel', {
        required: true,
        placeholder: '+91 98765 43210',
        autoComplete: 'tel',
      }),
      field('profilePhoto', 'Profile Photo', 'photo', {
        optional: true,
        fullWidth: true,
        hint: 'JPG, PNG or WEBP.',
      }),
    ],
  },
  {
    id: 'professional',
    title: 'Professional Information',
    description: 'Current role, department and employment terms.',
    icon: 'briefcase',
    fields: [
      field('department', 'Department', 'select', {
        required: true,
        options: DEPARTMENTS,
        placeholder: 'Select department',
      }),
      field('designation', 'Designation', 'text', {
        required: true,
        placeholder: 'e.g. Software Engineer',
      }),
      field('joiningDate', 'Joining Date', 'date', { required: true }),
      field('employmentType', 'Employment Type', 'select', {
        required: true,
        options: EMPLOYMENT_TYPES,
        placeholder: 'Select employment type',
      }),
      field('reportingManager', 'Reporting Manager', 'text', {
        optional: true,
        placeholder: 'e.g. Priya Nair',
      }),
    ],
  },
  {
    id: 'education',
    title: 'Education Details',
    description: 'Highest completed qualification.',
    icon: 'graduation',
    fields: [
      field('education.qualification', 'Qualification', 'text', {
        required: true,
        placeholder: 'e.g. B.Tech',
      }),
      field('education.institution', 'Institution Name', 'text', {
        required: true,
        placeholder: 'e.g. National Institute of Technology',
      }),
      field('education.specialization', 'Specialization', 'text', {
        optional: true,
        placeholder: 'e.g. Computer Science',
      }),
      field('education.passingYear', 'Passing Year', 'number', {
        optional: true,
        placeholder: 'e.g. 2020',
        min: 1950,
        max: new Date().getFullYear() + 6,
      }),
    ],
  },
  {
    id: 'experience',
    title: 'Professional Experience',
    description: 'Most recent employment before joining Ecometrix.',
    icon: 'history',
    fields: [
      field('experience.previousCompany', 'Previous Company', 'text', {
        optional: true,
        placeholder: 'e.g. Acme Technologies',
      }),
      field('experience.previousDesignation', 'Previous Designation', 'text', {
        optional: true,
        placeholder: 'e.g. Software Engineer',
      }),
      field('experience.totalExperience', 'Total Experience', 'text', {
        optional: true,
        placeholder: 'e.g. 5 years',
      }),
      field('experience.jobResponsibilities', 'Job Responsibilities', 'textarea', {
        optional: true,
        fullWidth: true,
        placeholder: 'Summarise key responsibilities and achievements.',
        rows: 4,
      }),
    ],
  },
];

export function getFieldValue(source, path) {
  return path.split('.').reduce((accumulator, key) => {
    if (accumulator === null || accumulator === undefined) return '';
    return accumulator[key];
  }, source);
}

export function setFieldValue(source, path, value) {
  const keys = path.split('.');
  const next = { ...source };
  let cursor = next;

  keys.forEach((key, index) => {
    if (index === keys.length - 1) {
      cursor[key] = value;
      return;
    }

    const current = cursor[key];
    cursor[key] = Array.isArray(current) ? [...current] : { ...(current || {}) };
    cursor = cursor[key];
  });

  return next;
}

export function buildInitialValues(initialData = {}) {
  return {
    ...EMPTY_EMPLOYEE_VALUES,
    ...initialData,
    education: {
      ...EMPTY_EMPLOYEE_VALUES.education,
      ...(initialData.education || {}),
    },
    experience: {
      ...EMPTY_EMPLOYEE_VALUES.experience,
      ...(initialData.experience || {}),
    },
  };
}

export function validateEmployee(values, { requireCv = false, cv = null, mode = 'manual' } = {}) {
  const errors = {};
  const currentYear = new Date().getFullYear();

  employeeFormSections.forEach((section) => {
    section.fields.forEach((item) => {
      if (item.hideInModes?.includes(mode)) return;

      const value = getFieldValue(values, item.name);
      const stringValue = value === null || value === undefined ? '' : String(value).trim();

      if (item.required && !stringValue) {
        errors[item.name] = `${item.label} is required.`;
        return;
      }

      if (!stringValue) return;

      if (item.type === 'email' && !EMAIL_REGEX.test(stringValue)) {
        errors[item.name] = 'Enter a valid email address.';
      }

      if (item.type === 'tel' && !PHONE_REGEX.test(stringValue)) {
        errors[item.name] = 'Enter a valid contact number (7–20 digits).';
      }

      if (item.name === 'education.passingYear') {
        const year = Number(stringValue);
        if (!Number.isInteger(year) || year < 1950 || year > currentYear + 6) {
          errors[item.name] = `Enter a valid passing year between 1950 and ${currentYear + 6}.`;
        }
      }

      if (item.type === 'date' && Number.isNaN(new Date(stringValue).getTime())) {
        errors[item.name] = 'Enter a valid date.';
      }
    });
  });

  if (requireCv && !cv) {
    errors.cv = 'Please upload the employee CV.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}
