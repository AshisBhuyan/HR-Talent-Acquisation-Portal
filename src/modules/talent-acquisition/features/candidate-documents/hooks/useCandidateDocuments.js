import { useCallback, useEffect, useMemo, useState } from 'react';
import candidateDocumentService from '../services/candidateDocumentService.js';

/**
 * Loads the document metadata of a candidate and exposes the preview and
 * download actions.
 */
export function useCandidateDocuments(candidate, job) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!candidate) {
      setDocuments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const result = await candidateDocumentService.getDocuments(candidate);
      setDocuments(result);
      setError('');
    } catch (loadError) {
      setError(loadError.message || 'Unable to load the candidate documents.');
    } finally {
      setLoading(false);
    }
  }, [candidate]);

  useEffect(() => {
    load();
  }, [load]);

  const getPreviewUrl = useCallback(
    (document) => candidateDocumentService.getPreviewUrl(document, { candidate, job }),
    [candidate, job]
  );

  const download = useCallback(
    (document) => candidateDocumentService.downloadDocument(document, { candidate, job }),
    [candidate, job]
  );

  const cv = useMemo(
    () => documents.find((document) => document.type === 'cv') || null,
    [documents]
  );

  return {
    documents,
    cv,
    loading,
    error,
    reload: load,
    getPreviewUrl,
    download,
  };
}

export default useCandidateDocuments;
