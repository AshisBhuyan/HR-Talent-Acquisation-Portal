import { useCallback, useMemo, useState } from 'react';
import { useTalentAcquisition } from '../../../context/TalentAcquisitionContext.jsx';
import { buildApplicationRow } from '../../../utils/formatCandidateData.js';
import { APPROVAL_STATUS } from '../../../constants/approvalStatus.js';

/**
 * Admin approval hook. The approval queue is deliberately separate from the
 * HR final selection queue.
 */
export function useApprovals() {
  const {
    applications,
    candidates,
    jobs,
    screenings,
    interviews,
    selections,
    approvals,
    loading,
    error,
    actions,
    refresh,
  } = useTalentAcquisition();
  const [statusFilter, setStatusFilter] = useState(APPROVAL_STATUS.PENDING);
  const [search, setSearch] = useState('');

  const entries = useMemo(
    () =>
      approvals
        .map((approval) => {
          const application = applications.find(
            (item) => item.applicationId === approval.applicationId
          );
          if (!application) return null;

          const candidate = candidates.find(
            (item) => item.candidateId === approval.candidateId
          );
          const job = jobs.find((item) => item.jobId === approval.jobId);
          const screening = screenings.find(
            (item) => item.applicationId === approval.applicationId
          );
          const selection = selections.find(
            (item) => item.applicationId === approval.applicationId
          );
          const candidateInterviews = interviews.filter(
            (item) => item.applicationId === approval.applicationId
          );

          return {
            rowKey: `apr-${approval.approvalId}`,
            approval,
            screening,
            selection,
            interviews: candidateInterviews,
            application: buildApplicationRow(application, { candidate, job }),
            candidate,
            job,
          };
        })
        .filter(Boolean),
    [approvals, applications, candidates, jobs, screenings, selections, interviews]
  );

  const visibleEntries = useMemo(() => {
    const needle = search.trim().toLowerCase();

    return entries.filter((entry) => {
      if (statusFilter !== 'all' && entry.approval.status !== statusFilter) return false;
      if (!needle) return true;
      return (
        entry.candidate.fullName.toLowerCase().includes(needle) ||
        entry.application.applicationId.toLowerCase().includes(needle) ||
        entry.job.title.toLowerCase().includes(needle)
      );
    });
  }, [entries, statusFilter, search]);

  const counts = useMemo(
    () => ({
      pending: entries.filter((item) => item.approval.status === APPROVAL_STATUS.PENDING).length,
      approved: entries.filter((item) => item.approval.status === APPROVAL_STATUS.APPROVED)
        .length,
      rejected: entries.filter((item) => item.approval.status === APPROVAL_STATUS.REJECTED)
        .length,
      clarification: entries.filter(
        (item) => item.approval.status === APPROVAL_STATUS.CLARIFICATION_REQUESTED
      ).length,
      all: entries.length,
    }),
    [entries]
  );

  const runAction = useCallback(
    async (action, ...args) => {
      const result = await action(...args);
      await refresh();
      return result;
    },
    [refresh]
  );

  return {
    entries,
    visibleEntries,
    counts,
    statusFilter,
    setStatusFilter,
    search,
    setSearch,
    loading,
    error,
    actions,
    runAction,
  };
}

export default useApprovals;
