import { useCallback, useEffect, useMemo, useState } from 'react';
import reportsService from '../services/reportsService.js';

const DEFAULT_FILTERS = {
  dateFrom: '',
  dateTo: '',
  jobId: '',
  stage: '',
};

/**
 * Recruitment reporting hook. The report figures are calculated by the
 * reporting service from the stored recruitment records.
 */
export function useRecruitmentReports(jobs = []) {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (activeFilters) => {
    setLoading(true);
    try {
      const result = await reportsService.getReports(activeFilters);
      setReport(result);
      setError('');
    } catch (loadError) {
      setError(loadError.message || 'Unable to build the recruitment report.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(filters);
  }, [filters, load]);

  const updateFilter = useCallback((key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  const jobOptions = useMemo(
    () => jobs.map((job) => ({ value: job.jobId, label: job.title })),
    [jobs]
  );

  return {
    filters,
    report,
    loading,
    error,
    jobOptions,
    updateFilter,
    resetFilters,
    reload: () => load(filters),
  };
}

export default useRecruitmentReports;
