import { useCallback, useMemo, useState } from 'react';
import { useTalentAcquisition } from '../../../context/TalentAcquisitionContext.jsx';
import { buildApplicationRow } from '../../../utils/formatCandidateData.js';
import { OPEN_SCREENING_STATUSES, SCREENING_STATUS } from '../../../constants/screeningStatus.js';
import { APPLICATION_STATUS } from '../../../constants/applicationStatus.js';

function rankEntries(entries) {
  const scored = entries.filter(
    (entry) => Number.isFinite(Number(entry.screening?.score))
  );

  const byPosition = new Map();
  scored.forEach((entry) => {
    const key = entry.job?.jobId || 'unassigned';
    if (!byPosition.has(key)) byPosition.set(key, []);
    byPosition.get(key).push(entry);
  });

  const ranks = new Map();
  byPosition.forEach((group) => {
    const sorted = [...group].sort((a, b) => {
      const diff = Number(b.screening.score) - Number(a.screening.score);
      if (diff !== 0) return diff;
      return String(a.application.applicationId).localeCompare(
        String(b.application.applicationId)
      );
    });
    sorted.forEach((entry, index) => {
      ranks.set(entry.application.applicationId, index + 1);
    });
  });

  return ranks;
}

function deriveAiEvaluationStatus(screening) {
  if (!screening) return 'pending';
  if (screening.aiResult || Number.isFinite(Number(screening.score))) {
    return 'completed';
  }
  if (screening.status === 'in_progress') return 'processing';
  return 'pending';
}

function deriveHrDecision(screening, appStatus) {
  if (appStatus === APPLICATION_STATUS.ON_HOLD) return 'on_hold';
  if (!screening) return 'awaiting_decision';
  switch (screening.status) {
    case SCREENING_STATUS.PASSED:
      return 'passed';
    case SCREENING_STATUS.FAILED:
      return 'rejected';
    case SCREENING_STATUS.COMPLETED:
    case SCREENING_STATUS.IN_PROGRESS:
      return 'awaiting_decision';
    default:
      return 'awaiting_decision';
  }
}

/**
 * Screening queue hook.
 *
 * The queue contains ONLY applications that an HR user explicitly transferred
 * into CV Screening. Ranking is position-wise and score-descending; unscored
 * applications remain in the awaiting-AI-evaluation section.
 */
export function useScreeningQueue() {
  const { applications, candidates, jobs, screenings, loading, error, actions, refresh } =
    useTalentAcquisition();
  const [statusFilter, setStatusFilter] = useState('open');
  const [search, setSearch] = useState('');
  const [positionFilter, setPositionFilter] = useState('');
  const [aiEvaluationFilter, setAiEvaluationFilter] = useState('');
  const [hrDecisionFilter, setHrDecisionFilter] = useState('');

  // Applications transferred to screening are shown when they are actively
  // under screening or when they are held while under screening.
  const entries = useMemo(
    () =>
      applications
        .filter(
          (application) =>
            (application.status === APPLICATION_STATUS.UNDER_SCREENING ||
              (application.status === APPLICATION_STATUS.ON_HOLD &&
                application.statusBeforeHold === APPLICATION_STATUS.UNDER_SCREENING)) &&
            application.applicationId &&
            application.candidateId
        )
        .map((application) => {
          const candidate = candidates.find(
            (item) => item.candidateId === application.candidateId
          );
          if (!candidate) return null;
          const job = jobs.find((item) => item.jobId === application.jobId);

          const screeningRecord = screenings.find(
            (item) => item.applicationId === application.applicationId
          );

          const screening =
            screeningRecord || {
              screeningId: `pending-${application.applicationId}`,
              applicationId: application.applicationId,
              candidateId: application.candidateId,
              status: 'pending',
              score: null,
              hrRemarks: application.remarks || '',
              reviewedBy: '',
              reviewedAt: null,
              aiResult: null,
              createdAt: application.appliedDate || null,
              synthesised: true,
            };

          return {
            rowKey: `scr-${screening.screeningId || application.applicationId}`,
            screening,
            application: buildApplicationRow(application, { candidate, job }),
            candidate,
            job,
            aiEvaluationStatus: deriveAiEvaluationStatus(screening),
            hrDecision: deriveHrDecision(screening, application.status),
          };
        })
        .filter(Boolean),
    [applications, candidates, jobs, screenings]
  );

  const ranks = useMemo(() => rankEntries(entries), [entries]);

  const visibleEntries = useMemo(() => {
    const needle = search.trim().toLowerCase();

    return entries
      .filter((entry) => {
        if (statusFilter === 'open' && !OPEN_SCREENING_STATUSES.includes(entry.screening.status)) {
          return false;
        }
        if (
          statusFilter === 'completed' &&
          OPEN_SCREENING_STATUSES.includes(entry.screening.status)
        ) {
          return false;
        }
        if (
          statusFilter !== 'all' &&
          statusFilter !== 'open' &&
          statusFilter !== 'completed' &&
          entry.screening.status !== statusFilter
        ) {
          return false;
        }

        if (positionFilter && entry.job?.jobId !== positionFilter) return false;
        if (aiEvaluationFilter && entry.aiEvaluationStatus !== aiEvaluationFilter) return false;
        if (hrDecisionFilter && entry.hrDecision !== hrDecisionFilter) return false;

        if (!needle) return true;
        return (
          entry.candidate.fullName.toLowerCase().includes(needle) ||
          entry.application.applicationId.toLowerCase().includes(needle) ||
          (entry.job?.title || '').toLowerCase().includes(needle)
        );
      })
      .sort((a, b) => {
        const aRank = ranks.get(a.application.applicationId) || 9999;
        const bRank = ranks.get(b.application.applicationId) || 9999;
        if (aRank !== bRank) return aRank - bRank;
        const aScore = Number.isFinite(Number(a.screening?.score))
          ? Number(a.screening.score)
          : -1;
        const bScore = Number.isFinite(Number(b.screening?.score))
          ? Number(b.screening.score)
          : -1;
        if (bScore !== aScore) return bScore - aScore;
        return String(a.application.applicationId).localeCompare(
          String(b.application.applicationId)
        );
      });
  }, [entries, statusFilter, search, positionFilter, aiEvaluationFilter, hrDecisionFilter, ranks]);

  /**
   * Position-wise ranks to display. Unscored applications have no rank.
   */
  const ranksByPosition = useMemo(() => {
    const map = new Map();
    entries.forEach((entry) => {
      map.set(entry.application.applicationId, ranks.get(entry.application.applicationId) || null);
    });
    return map;
  }, [entries, ranks]);

  const counts = useMemo(
    () => ({
      total: entries.length,
      awaitingAi: entries.filter((entry) => entry.aiEvaluationStatus === 'pending').length,
      aiCompleted: entries.filter((entry) => entry.aiEvaluationStatus === 'completed').length,
      awaitingDecision: entries.filter(
        (entry) =>
          entry.hrDecision === 'awaiting_decision' &&
          OPEN_SCREENING_STATUSES.includes(entry.screening.status)
      ).length,
      passed: entries.filter((entry) => entry.hrDecision === 'passed').length,
      onHold: entries.filter((entry) => entry.application.status === 'on_hold').length,
      rejected: entries.filter((entry) => entry.hrDecision === 'rejected').length,
      open: entries.filter((entry) => OPEN_SCREENING_STATUSES.includes(entry.screening.status))
        .length,
      completed: entries.filter(
        (entry) => !OPEN_SCREENING_STATUSES.includes(entry.screening.status)
      ).length,
      all: entries.length,
    }),
    [entries]
  );

  const resetFilters = useCallback(() => {
    setSearch('');
    setPositionFilter('');
    setAiEvaluationFilter('');
    setHrDecisionFilter('');
    setStatusFilter('open');
  }, []);

  const activeFilterCount = useMemo(
    () =>
      [search, positionFilter, aiEvaluationFilter, hrDecisionFilter].filter(
        (value) => value && String(value).trim()
      ).length,
    [search, positionFilter, aiEvaluationFilter, hrDecisionFilter]
  );

  const positions = useMemo(() => {
    const byId = new Map();
    entries.forEach((entry) => {
      if (entry.job && !byId.has(entry.job.jobId)) {
        byId.set(entry.job.jobId, { value: entry.job.jobId, label: entry.job.title });
      }
    });
    return [...byId.values()].sort((a, b) => a.label.localeCompare(b.label));
  }, [entries]);

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
    positionFilter,
    setPositionFilter,
    aiEvaluationFilter,
    setAiEvaluationFilter,
    hrDecisionFilter,
    setHrDecisionFilter,
    resetFilters,
    activeFilterCount,
    positions,
    ranksByPosition,
    loading,
    error,
    actions,
    runAction,
    canShortlist: (application) => application.status === APPLICATION_STATUS.UNDER_SCREENING,
  };
}

export default useScreeningQueue;
