import { useDatabank } from '../../../context/DatabankContext.jsx';
import submissionService from '../services/submissionService.js';

export function useSubmissions() {
  const { submissions, loading, refresh } = useDatabank();

  const validateSubmission = async (id) => {
    const result = await submissionService.validateSubmission(id);
    await refresh();
    return result;
  };

  const rejectSubmission = async (id, reason) => {
    const result = await submissionService.rejectSubmission(id, reason);
    await refresh();
    return result;
  };

  return {
    submissions,
    loading,
    refresh,
    validateSubmission,
    rejectSubmission,
    getSubmissionById: submissionService.getSubmissionById,
  };
}

export default useSubmissions;
