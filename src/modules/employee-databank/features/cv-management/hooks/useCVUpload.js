import { useCallback, useState } from 'react';
import cvService from '../services/cvService.js';

export function useCVUpload({ value, onChange } = {}) {
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const upload = useCallback(
    async (file) => {
      if (!file) return null;
      setError('');
      setUploading(true);
      setProgress(0);

      try {
        const cv = await cvService.uploadCV(file, { onProgress: setProgress });
        onChange?.(cv);
        return cv;
      } catch (uploadError) {
        setError(uploadError.errors?.[0] || uploadError.message || 'The CV could not be uploaded.');
        return null;
      } finally {
        setUploading(false);
      }
    },
    [onChange]
  );

  const replace = useCallback(
    async (file) => {
      if (!file) return null;
      setError('');
      setUploading(true);
      setProgress(0);

      try {
        const cv = await cvService.replaceCV(value, file, { onProgress: setProgress });
        onChange?.(cv);
        return cv;
      } catch (uploadError) {
        setError(
          uploadError.errors?.[0] || uploadError.message || 'The CV could not be replaced.'
        );
        return null;
      } finally {
        setUploading(false);
      }
    },
    [value, onChange]
  );

  const remove = useCallback(() => {
    cvService.removeCV(value);
    onChange?.(null);
    setError('');
    setProgress(0);
  }, [value, onChange]);

  return {
    progress,
    uploading,
    error,
    upload,
    replace,
    remove,
    clearError: () => setError(''),
  };
}

export default useCVUpload;
