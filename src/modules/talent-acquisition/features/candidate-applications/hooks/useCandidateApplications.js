import { useCallback, useMemo, useState } from 'react';
import { useTalentAcquisition } from '../../../context/TalentAcquisitionContext.jsx';
import { buildApplicationRow } from '../../../utils/formatCandidateData.js';
import {
  filterApplications,
  getActiveFilterCount,
  paginate,
  sortApplications,
} from '../../../utils/candidateFilters.js';

const DEFAULT_FILTERS = {
  search: '',
  jobId: '',
  status: '',
  screeningStatus: '',
  dateFrom: '',
  dateTo: '',
};

/**
 * Provides the filtered, sorted and paginated application rows together with
 * the workflow actions used by the applications page.
 */
export function useCandidateApplications() {
  const { applications, candidates, jobs, loading, error, actions, refresh } =
    useTalentAcquisition();
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [sort, setSort] = useState('applied_desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

  const rows = useMemo(
    () =>
      applications.map((application) =>
        buildApplicationRow(application, {
          candidate: candidates.find((item) => item.candidateId === application.candidateId),
          job: jobs.find((item) => item.jobId === application.jobId),
        })
      ),
    [applications, candidates, jobs]
  );

  /**
   * Positions that actually have applications. Used by the position filter so
   * HR only sees the open positions that received applications.
   */
  const positions = useMemo(() => {
    const byJob = new Map();
    rows.forEach((row) => {
      if (!byJob.has(row.jobId)) {
        byJob.set(row.jobId, { value: row.jobId, label: row.jobTitle });
      }
    });
    return [...byJob.values()].sort((a, b) => a.label.localeCompare(b.label));
  }, [rows]);

  const filteredRows = useMemo(() => {
    const filtered = filterApplications(rows, filters);
    return sortApplications(filtered, sort);
  }, [rows, filters, sort]);

  const pageData = useMemo(
    () => paginate(filteredRows, page, pageSize),
    [filteredRows, page, pageSize]
  );

  const updateFilter = useCallback((key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setPage(1);
  }, []);

  const runAction = useCallback(
    async (action, ...args) => {
      const result = await action(...args);
      await refresh();
      return result;
    },
    [refresh]
  );

  return {
    rows,
    filteredRows,
    pageData,
    filters,
    sort,
    page,
    pageSize,
    jobs,
    positions,
    loading,
    error,
    activeFilterCount: getActiveFilterCount(filters),
    setSort,
    setPage,
    setPageSize,
    updateFilter,
    resetFilters,
    runAction,
    actions,
  };
}

export default useCandidateApplications;
