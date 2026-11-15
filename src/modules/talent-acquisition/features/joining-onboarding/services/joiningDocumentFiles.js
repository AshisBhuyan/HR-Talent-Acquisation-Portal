import { getBlob } from '../../../services/documentStorage.js';
import candidateDocumentService from '../../candidate-documents/services/candidateDocumentService.js';

/**
 * Preview/download helpers for joining documents.
 *
 * Documents uploaded through the candidate portal carry a storage key that
 * points at the IndexedDB blob store. Older seeded records do not have a
 * blob, so those fall back to the demonstration sample document generator.
 */
export async function getJoiningDocumentUrl(document, { candidate, job } = {}) {
  if (document?.storageKey) {
    const blob = await getBlob(document.storageKey);
    if (blob) {
      return URL.createObjectURL(blob);
    }
  }
  return candidateDocumentService.getPreviewUrl(document, { candidate, job });
}

export async function downloadJoiningDocument(document, { candidate, job } = {}) {
  const url = await getJoiningDocumentUrl(document, { candidate, job });
  if (!url) {
    throw new Error('This document is unavailable for download.');
  }

  const link = window.document.createElement('a');
  link.href = url;
  link.download = document.fileName || 'joining-document';
  window.document.body.appendChild(link);
  link.click();
  link.remove();
}
