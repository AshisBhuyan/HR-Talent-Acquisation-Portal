import { useCallback, useMemo, useState } from 'react';
import { useTalentAcquisition } from '../../../context/TalentAcquisitionContext.jsx';
import { buildApplicationRow } from '../../../utils/formatCandidateData.js';
import { INTERVIEW_STATUS } from '../../../constants/interviewStatus.js';

/**
 * Interview management hook. Interviews are grouped into the upcoming,
 * completed and cancelled groups the page renders.
 */
export function useInterviews() {
  const {
    applications,
    candidates,
    jobs,
    interviews,
    loading,
    error,
    actions,
    refresh,
  } = useTalentAcquisition();
  const [statusFilter, setStatusFilter] = useState('scheduled');
  const [search, setSearch] = useState('');

  const entries = useMemo(
    () =>
      interviews
        .map((interview) => {
          const application = applications.find(
            (item) => item.applicationId === interview.applicationId
          );
          if (!application) return null;

          const candidate = candidates.find(
            (item) => item.candidateId === interview.candidateId
          );
          const job = jobs.find((item) => item.jobId === interview.jobId);

          return {
            rowKey: `int-${interview.interviewId}`,
            interview,
            application: buildApplicationRow(application, { candidate, job }),
            candidate,
            job,
          };
        })
        .filter(Boolean),
    [interviews, applications, candidates, jobs]
  );

  const now = Date.now();
  const upcoming = useMemo(
    () =>
      entries
        .filter(
          (entry) =>
            entry.interview.status === INTERVIEW_STATUS.SCHEDULED &&
            new Date(entry.interview.scheduledAt).getTime() >= now
        )
        .sort(
          (a, b) =>
            new Date(a.interview.scheduledAt).getTime() -
            new Date(b.interview.scheduledAt).getTime()
        ),
    [entries, now]
  );

  const completed = useMemo(
    () =>
      entries
        .filter((entry) => entry.interview.status === INTERVIEW_STATUS.COMPLETED)
        .sort(
          (a, b) =>
            new Date(b.interview.scheduledAt).getTime() -
            new Date(a.interview.scheduledAt).getTime()
        ),
    [entries]
  );

  const cancelled = useMemo(
    () =>
      entries
        .filter((entry) => entry.interview.status === INTERVIEW_STATUS.CANCELLED)
        .sort(
          (a, b) =>
            new Date(b.interview.scheduledAt).getTime() -
            new Date(a.interview.scheduledAt).getTime()
        ),
    [entries]
  );

  const visibleEntries = useMemo(() => {
    const needle = search.trim().toLowerCase();

    return entries.filter((entry) => {
      if (statusFilter !== 'all' && entry.interview.status !== statusFilter) return false;
      if (!needle) return true;
      return (
        entry.candidate.fullName.toLowerCase().includes(needle) ||
        entry.interview.interviewer.toLowerCase().includes(needle) ||
        entry.job.title.toLowerCase().includes(needle)
      );
    });
  }, [entries, statusFilter, search]);

  const counts = useMemo(
    () => ({
      scheduled: entries.filter((item) => item.interview.status === INTERVIEW_STATUS.SCHEDULED)
        .length,
      completed: entries.filter((item) => item.interview.status === INTERVIEW_STATUS.COMPLETED)
        .length,
      cancelled: entries.filter((item) => item.interview.status === INTERVIEW_STATUS.CANCELLED)
        .length,
      rescheduled: entries.filter(
        (item) => item.interview.status === INTERVIEW_STATUS.RESCHEDULED
      ).length,
      all: entries.length,
    }),
    [entries]
  );

  const shortlistableApplications = useMemo(
    () =>
      applications
        .filter((application) => application.status === 'shortlisted')
        .map((application) => ({
          application,
          candidate: candidates.find((item) => item.candidateId === application.candidateId),
          job: jobs.find((item) => item.jobId === application.jobId),
        }))
        .filter((entry) => entry.candidate && entry.job),
    [applications, candidates, jobs]
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
    upcoming,
    completed,
    cancelled,
    visibleEntries,
    counts,
    statusFilter,
    setStatusFilter,
    search,
    setSearch,
    shortlistableApplications,
    loading,
    error,
    actions,
    runAction,
  };
}

export default useInterviews;
