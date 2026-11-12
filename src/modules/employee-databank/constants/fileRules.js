const MEGABYTE = 1024 * 1024;

function readPositiveNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const CV_MAX_SIZE_MB = readPositiveNumber(import.meta.env.VITE_CV_MAX_SIZE_MB, 5);
export const CV_MAX_SIZE_BYTES = CV_MAX_SIZE_MB * MEGABYTE;

export const PHOTO_MAX_SIZE_MB = readPositiveNumber(import.meta.env.VITE_PHOTO_MAX_SIZE_MB, 2);
export const PHOTO_MAX_SIZE_BYTES = PHOTO_MAX_SIZE_MB * MEGABYTE;

export const CV_ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx'];

export const CV_ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export const CV_ACCEPT_ATTRIBUTE =
  '.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export const PHOTO_ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const PHOTO_ACCEPT_ATTRIBUTE = '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp';

export const FILE_RULES = {
  cv: {
    maxSizeMb: CV_MAX_SIZE_MB,
    maxSizeBytes: CV_MAX_SIZE_BYTES,
    allowedExtensions: CV_ALLOWED_EXTENSIONS,
    allowedMimeTypes: CV_ALLOWED_MIME_TYPES,
    accept: CV_ACCEPT_ATTRIBUTE,
  },
  photo: {
    maxSizeMb: PHOTO_MAX_SIZE_MB,
    maxSizeBytes: PHOTO_MAX_SIZE_BYTES,
    allowedMimeTypes: PHOTO_ALLOWED_MIME_TYPES,
    accept: PHOTO_ACCEPT_ATTRIBUTE,
  },
};
