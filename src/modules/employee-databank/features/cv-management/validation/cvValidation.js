import {
  CV_ALLOWED_EXTENSIONS,
  CV_ALLOWED_MIME_TYPES,
  CV_MAX_SIZE_MB,
  PHOTO_ALLOWED_MIME_TYPES,
  PHOTO_MAX_SIZE_MB,
} from '../../../constants/fileRules.js';

export function getFileExtension(fileName = '') {
  const index = String(fileName).lastIndexOf('.');
  return index === -1 ? '' : String(fileName).slice(index).toLowerCase();
}

export function formatFileSize(bytes) {
  const numeric = Number(bytes);
  if (!Number.isFinite(numeric) || numeric <= 0) return '0 KB';
  if (numeric < 1024) return `${numeric} B`;
  if (numeric < 1024 * 1024) return `${(numeric / 1024).toFixed(1)} KB`;
  return `${(numeric / (1024 * 1024)).toFixed(2)} MB`;
}

export function validateCVFile(file) {
  const errors = [];

  if (!file) {
    return { valid: false, errors: ['Please select a CV file to upload.'] };
  }

  const extension = getFileExtension(file.name);
  const hasAllowedExtension = CV_ALLOWED_EXTENSIONS.includes(extension);
  const hasAllowedType = !file.type || CV_ALLOWED_MIME_TYPES.includes(file.type);

  if (!hasAllowedExtension) {
    errors.push(`Unsupported file type. Allowed formats: ${CV_ALLOWED_EXTENSIONS.join(', ')}.`);
  } else if (!hasAllowedType) {
    errors.push('The selected file does not look like a valid PDF or Word document.');
  }

  if (!file.size) {
    errors.push('The selected file appears to be empty.');
  } else if (file.size > CV_MAX_SIZE_MB * 1024 * 1024) {
    errors.push(`The CV must be ${CV_MAX_SIZE_MB} MB or smaller.`);
  }

  return { valid: errors.length === 0, errors };
}

export function validatePhotoFile(file) {
  const errors = [];

  if (!file) {
    return { valid: false, errors: ['Please select an image file.'] };
  }

  if (!PHOTO_ALLOWED_MIME_TYPES.includes(file.type)) {
    errors.push('Profile photo must be a JPG, PNG or WEBP image.');
  }

  if (!file.size) {
    errors.push('The selected image appears to be empty.');
  } else if (file.size > PHOTO_MAX_SIZE_MB * 1024 * 1024) {
    errors.push(`The profile photo must be ${PHOTO_MAX_SIZE_MB} MB or smaller.`);
  }

  return { valid: errors.length === 0, errors };
}
