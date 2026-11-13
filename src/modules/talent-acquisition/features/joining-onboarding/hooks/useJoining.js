import { useCallback, useMemo, useState } from 'react';
import { useTalentAcquisition } from '../../../context/TalentAcquisitionContext.jsx';
import {
  JOINING_STATUS,
  HANDOVER_STATUS,
  createDefaultChecklist,
} from '../../../constants/joiningStatus.js';
import { OFFER_STATUS } from '../../../constants/offerStatus.js';

const DEFAULT_FILTERS = {
  search: '',
  jobId: '',
  status: '',
  verification: '',
  handover: '',
  dateFrom: '',
  dateTo: '',
};

/**
 * Joining and onboarding hook. It builds the enriched joining entries and the
 * summary metrics shown on the page, together with the filters.
 */
export function useJoining() {
  const {
    applications,
    candidates,
    jobs,
    offers,
    joinings,
    loading,
    error,
    actions,
    refresh,
  } = useTalentAcquisition();
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  /**
   * Positions seen in the joining records.
   */
  const positions = useMemo(() => {
    const byJob = new Map();
    joinings.forEach((joining) => {
      const application = applications.find(
        (item) => item.applicationId === joining.applicationId
      );
      if (!application) return;
      const job = jobs.find((item) => item.jobId === application.jobId);
      if (job && !byJob.has(job.jobId)) {
        byJob.set(job.jobId, { value: job.jobId, label: job.title });
      }
    });
    return [...byJob.values()].sort((a, b) => a.label.localeCompare(b.label));
  }, [joinings, applications, jobs]);

  const enrichedEntries = useMemo(
    () =>
      joinings
        .map((joining) => {
          const application = applications.find(
            (item) => item.applicationId === joining.applicationId
          );
          if (!application) return null;

          const candidate = candidates.find(
            (item) => item.candidateId === application.candidateId
          );
          if (!candidate) return null;

          const job = jobs.find((item) => item.jobId === application.jobId);
          const offer = offers.find((item) => item.offerId === joining.offerId);

          const documents = Array.isArray(joining.documents) ? joining.documents : [];
          const checklist = createDefaultChecklist(joining.checklist);

          const documentsVerified = documents.filter((item) => item.status === 'verified').length;
          const documentsTotal = documents.length;
          const mandatoryVerified = checklist.filter(
            (item) => item.mandatory && item.status === 'verified'
          ).length;
          const mandatoryTotal = checklist.filter((item) => item.mandatory).length;
          const checklistPercent = checklist.length
            ? Math.round(
                (checklist.filter((item) =>
                  ['verified', 'not_applicable'].includes(item.status)
                ).length /
                  checklist.length) *
                  100
              )
            : 0;

          // Aggregate document verification status for filtering.
          let verification = 'all_verified';
          if (documents.some((item) => item.status === 'resubmission_required')) {
            verification = 'issues';
          } else if (
            documents.some((item) =>
              ['pending', 'submitted', 'under_verification'].includes(item.status)
            )
          ) {
            verification = 'pending';
          }

          const handoverStatus = joining.handover?.status || HANDOVER_STATUS.NOT_READY;

          return {
            rowKey: `jng-${joining.joiningId}`,
            joining,
            offer,
            application,
            candidate,
            job,
            checklist,
            checklistPercent,
            checklistCompleted: checklist.filter((item) =>
              ['verified', 'not_applicable'].includes(item.status)
            ).length,
            checklistTotal: checklist.length,
            mandatoryVerified,
            mandatoryTotal,
            documents,
            documentsVerified,
            documentsTotal,
            documentsPending: documentsTotal - documentsVerified,
            verification,
            handoverStatus,
            handover: joining.handover || null,
          };
        })
        .filter(Boolean),
    [joinings, applications, candidates, jobs, offers]
  );

  const visibleEntries = useMemo(() => {
    const needle = filters.search.trim().toLowerCase();

    return enrichedEntries.filter((entry) => {
      if (needle) {
        const matches =
          entry.candidate.fullName.toLowerCase().includes(needle) ||
          entry.candidate.candidateId.toLowerCase().includes(needle) ||
          entry.application.applicationId.toLowerCase().includes(needle);
        if (!matches) return false;
      }

      if (filters.jobId && entry.application.jobId !== filters.jobId) return false;
      if (filters.status && entry.joining.status !== filters.status) return false;
      if (filters.verification && entry.verification !== filters.verification) return false;
      if (filters.handover && entry.handoverStatus !== filters.handover) return false;

      if (filters.dateFrom) {
        const date = new Date(entry.joining.joiningDate || 0).getTime();
        const from = new Date(`${filters.dateFrom}T00:00:00`).getTime();
        if (!Number.isFinite(date) || date < from) return false;
      }

      if (filters.dateTo) {
        const date = new Date(entry.joining.joiningDate || 0).getTime();
        const to = new Date(`${filters.dateTo}T23:59:59`).getTime();
        if (!Number.isFinite(date) || date > to) return false;
      }

      return true;
    });
  }, [enrichedEntries, filters]);

  const summary = useMemo(() => {
    const count = (predicate) => enrichedEntries.filter(predicate).length;

    return {
      total: enrichedEntries.length,
      pendingDocuments: count(
        (entry) =>
          entry.joining.status !== JOINING_STATUS.JOINED &&
          (entry.documentsPending > 0 ||
            entry.mandatoryVerified < entry.mandatoryTotal)
      ),
      verificationInProgress: count(
        (entry) =>
          entry.joining.status === JOINING_STATUS.VERIFICATION_IN_PROGRESS ||
          entry.verification === 'issues'
      ),
      readyToJoin: count((entry) => entry.joining.status === JOINING_STATUS.READY_TO_JOIN),
      joined: count((entry) => entry.joining.status === JOINING_STATUS.JOINED),
      pendingHandover: count(
        (entry) =>
          entry.joining.status === JOINING_STATUS.JOINED &&
          entry.handoverStatus !== HANDOVER_STATUS.IMPORTED
      ),
      imported: count((entry) => entry.handoverStatus === HANDOVER_STATUS.IMPORTED),
    };
  }, [enrichedEntries]);

  const updateFilter = useCallback((key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  const activeFilterCount = useMemo(
    () =>
      ['search', 'jobId', 'status', 'verification', 'handover', 'dateFrom', 'dateTo'].filter(
        (key) => filters[key]
      ).length,
    [filters]
  );

  /**
   * Accepted offers that do not have a joining record yet.
   */
  const offersAwaitingJoining = useMemo(
    () =>
      offers
        .filter(
          (offer) =>
            offer.status === OFFER_STATUS.ACCEPTED &&
            !joinings.some((joining) => joining.offerId === offer.offerId)
        )
        .map((offer) => ({
          offer,
          candidate: candidates.find((item) => item.candidateId === offer.candidateId),
        }))
        .filter((entry) => entry.candidate),
    [offers, joinings, candidates]
  );

  const importHistory = useMemo(
    () =>
      enrichedEntries
        .filter((entry) => entry.handover)
        .map((entry) => ({
          joiningId: entry.joining.joiningId,
          applicationId: entry.application.applicationId,
          candidateId: entry.candidate.candidateId,
          candidateName: entry.candidate.fullName,
          designation: entry.handover?.designation || '',
          handoverId: entry.handover?.handoverId || '',
          preparedAt: entry.handover?.preparedAt || '',
          importedAt: entry.handover?.importedAt || null,
          status: entry.handover?.status || HANDOVER_STATUS.NOT_READY,
          error: entry.handover?.error || '',
          employeeRef: entry.handover?.employeeRef || '',
          employeeId: entry.handover?.employeeId || '',
        }))
        .sort(
          (a, b) =>
            new Date(b.preparedAt || 0).getTime() - new Date(a.preparedAt || 0).getTime()
        ),
    [enrichedEntries]
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
    entries: enrichedEntries,
    visibleEntries,
    summary,
    positions,
    filters,
    updateFilter,
    resetFilters,
    activeFilterCount,
    offersAwaitingJoining,
    importHistory,
    loading,
    error,
    actions,
    runAction,
  };
}

export default useJoining;
