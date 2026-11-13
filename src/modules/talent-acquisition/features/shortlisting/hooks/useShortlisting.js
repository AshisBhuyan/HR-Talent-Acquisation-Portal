import { useCallback, useMemo, useState } from 'react';
import { useTalentAcquisition } from '../../../context/TalentAcquisitionContext.jsx';
import { buildApplicationRow } from '../../../utils/formatCandidateData.js';
import { INTERVIEW_STATUS } from '../../../constants/interviewStatus.js';

/**
 * Shortlisting hook. The shortlist list is derived from the shortlisting
 * records and enriched with the screening result and the interview state.
 */
export function useShortlisting() {
  const {
    applications,
    candidates,
    jobs,
    screenings,
    shortlistings,
    interviews,
    loading,
    error,
    actions,
    refresh,
  } = useTalentAcquisition();
  const [statusFilter, setStatusFilter] = useState('shortlisted');
  const [search, setSearch] = useState('');

  const entries = useMemo(
    () =>
      shortlistings
        .map((shortlisting) => {
          const application = applications.find(
            (item) => item.applicationId === shortlisting.applicationId
          );
          if (!application) return null;

          const candidate = candidates.find(
            (item) => item.candidateId === application.candidateId
          );
          const job = jobs.find((item) => item.jobId === application.jobId);
          const screening = screenings.find(
            (item) => item.applicationId === application.applicationId
          );
          const candidateInterviews = interviews.filter(
            (item) => item.applicationId === application.applicationId
          );

          const scheduled = candidateInterviews.find(
            (item) => item.status === INTERVIEW_STATUS.SCHEDULED
          );
          const completed = candidateInterviews.filter(
            (item) => item.status === INTERVIEW_STATUS.COMPLETED
          );

          return {
            rowKey: `sht-${shortlisting.shortlistingId}`,
            shortlisting,
            screening,
            application: buildApplicationRow(application, { candidate, job }),
            candidate,
            job,
            interviews: candidateInterviews,
            interviewStatus: scheduled
              ? INTERVIEW_STATUS.SCHEDULED
              : completed.length
                ? INTERVIEW_STATUS.COMPLETED
                : 'Not scheduled',
            nextInterview: scheduled || null,
          };
        })
        .filter((entry) => entry.application && entry.application.status !== 'on_hold'),
    [shortlistings, applications, candidates, jobs, screenings, interviews]
  );

  const visibleEntries = useMemo(() => {
    const needle = search.trim().toLowerCase();

    return entries.filter((entry) => {
      if (statusFilter !== 'all' && entry.shortlisting.status !== statusFilter) return false;
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
      shortlisted: entries.filter((item) => item.shortlisting.status === 'shortlisted').length,
      on_hold: entries.filter((item) => item.shortlisting.status === 'on_hold').length,
      rejected: entries.filter((item) => item.shortlisting.status === 'rejected').length,
      all: entries.length,
    }),
    [entries]
  );

  /**
   * Candidates that passed the CV screening and still wait for a shortlisting
   * decision.
   */
  const awaitingShortlist = useMemo(
    () =>
      applications
        .filter(
          (application) =>
            application.screeningStatus === 'passed' &&
            application.status === 'under_screening' &&
            !shortlistings.some(
              (shortlisting) => shortlisting.applicationId === application.applicationId
            )
        )
        .map((application) => ({
          rowKey: `pending-${application.applicationId}`,
          application,
          candidate: candidates.find((item) => item.candidateId === application.candidateId),
          job: jobs.find((item) => item.jobId === application.jobId),
          screening: screenings.find((item) => item.applicationId === application.applicationId),
        }))
        .filter((entry) => entry.candidate && entry.job),
    [applications, candidates, jobs, screenings, shortlistings]
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
    awaitingShortlist,
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

export default useShortlisting;
