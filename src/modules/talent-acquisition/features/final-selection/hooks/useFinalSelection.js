import { useCallback, useMemo, useState } from 'react';
import { useTalentAcquisition } from '../../../context/TalentAcquisitionContext.jsx';
import { buildApplicationRow } from '../../../utils/formatCandidateData.js';
import { APPLICATION_STATUS } from '../../../constants/applicationStatus.js';
import { SELECTION_STATUS } from '../../../constants/selectionStatus.js';

/**
 * Final selection hook. Only applications at the final selection stage can
 * receive an HR decision here; the admin approval is a separate stage.
 */
export function useFinalSelection() {
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
  const [search, setSearch] = useState('');

  const entries = useMemo(
    () =>
      applications
        .filter((application) =>
          [
            APPLICATION_STATUS.FINAL_SELECTION,
            APPLICATION_STATUS.APPROVAL,
          ].includes(application.status)
        )
        .map((application) => {
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
          const selection = selections.find(
            (item) => item.applicationId === application.applicationId
          );
          const approval = approvals.find(
            (item) => item.applicationId === application.applicationId
          );

          return {
            rowKey: `sel-${application.applicationId}`,
            application: buildApplicationRow(application, { candidate, job }),
            candidate,
            job,
            screening,
            interviews: candidateInterviews,
            selection,
            approval,
            averageRating: (() => {
              const rated = candidateInterviews.filter(
                (interview) => Number.isFinite(Number(interview.feedback?.overallRating))
              );
              if (rated.length === 0) return null;
              const total = rated.reduce(
                (sum, interview) => sum + Number(interview.feedback.overallRating),
                0
              );
              return (total / rated.length).toFixed(1);
            })(),
          };
        }),
    [applications, candidates, jobs, screenings, interviews, selections, approvals]
  );

  const visibleEntries = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return entries;
    return entries.filter(
      (entry) =>
        entry.candidate.fullName.toLowerCase().includes(needle) ||
        entry.application.applicationId.toLowerCase().includes(needle) ||
        entry.job.title.toLowerCase().includes(needle)
    );
  }, [entries, search]);

  const counts = useMemo(
    () => ({
      pending: entries.filter(
        (entry) => entry.application.status === APPLICATION_STATUS.FINAL_SELECTION
      ).length,
      submitted: entries.filter((entry) => entry.approval).length,
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
    search,
    setSearch,
    loading,
    error,
    actions,
    runAction,
    decisions: Object.values(SELECTION_STATUS),
  };
}

export default useFinalSelection;
