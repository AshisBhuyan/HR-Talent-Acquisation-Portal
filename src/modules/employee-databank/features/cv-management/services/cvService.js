import { delay, makeId } from '../../../services/mockBackend.js';
import { getFileExtension, validateCVFile } from '../validation/cvValidation.js';

const localFileStore = new Map();

function inferMimeType(file) {
  if (file.type) return file.type;
  const extension = getFileExtension(file.name);
  if (extension === '.pdf') return 'application/pdf';
  if (extension === '.doc') return 'application/msword';
  if (extension === '.docx') {
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  }
  return 'application/octet-stream';
}

function validationError(errors) {
  const error = new Error(errors[0] || 'The selected CV is not valid.');
  error.errors = errors;
  return error;
}

async function simulateProgress(onProgress) {
  const steps = [15, 38, 62, 84];
  for (const step of steps) {
    await delay(110);
    onProgress?.(step);
  }
}

export const cvService = {
  async uploadCV(file, { onProgress } = {}) {
    const { valid, errors } = validateCVFile(file);
    if (!valid) throw validationError(errors);

    onProgress?.(5);
    await simulateProgress(onProgress);

    const storageKey = makeId('cv');
    const objectUrl = URL.createObjectURL(file);
    localFileStore.set(storageKey, objectUrl);

    onProgress?.(100);

    return {
      id: storageKey,
      name: file.name,
      size: file.size,
      type: inferMimeType(file),
      uploadedAt: new Date().toISOString(),
      storageKey,
      seeded: false,
    };
  },

  async replaceCV(previousCv, file, options = {}) {
    const nextCv = await this.uploadCV(file, options);
    this.removeCV(previousCv);
    return nextCv;
  },

  removeCV(cv) {
    if (!cv?.storageKey) return;
    const objectUrl = localFileStore.get(cv.storageKey);
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      localFileStore.delete(cv.storageKey);
    }
  },

  hasLocalFile(cv) {
    return Boolean(cv?.storageKey && localFileStore.has(cv.storageKey));
  },

  getCVUrl(cv) {
    if (!cv?.storageKey) return null;
    return localFileStore.get(cv.storageKey) || null;
  },

  previewCV(cv) {
    const url = this.getCVUrl(cv);
    if (!url) {
      throw new Error(
        'This document is demo metadata only. Upload a real CV to preview the file in the browser.'
      );
    }
    return url;
  },

  downloadCV(cv) {
    const url = this.getCVUrl(cv);
    if (!url) {
      throw new Error(
        'This document is demo metadata only. Upload a real CV to download the file.'
      );
    }

    const link = document.createElement('a');
    link.href = url;
    link.download = cv.name || 'employee-cv.pdf';
    document.body.appendChild(link);
    link.click();
    link.remove();
  },
};

export default cvService;
