import { useCallback, useMemo, useState } from 'react';
import { useTalentAcquisition } from '../../../context/TalentAcquisitionContext.jsx';
import { buildApplicationRow } from '../../../utils/formatCandidateData.js';
import { OFFER_STATUS } from '../../../constants/offerStatus.js';

/**
 * Offer management hook.
 */
export function useOffers() {
  const {
    applications,
    candidates,
    jobs,
    offers,
    approvals,
    loading,
    error,
    actions,
    refresh,
  } = useTalentAcquisition();
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  const entries = useMemo(
    () =>
      offers
        .map((offer) => {
          const application = applications.find(
            (item) => item.applicationId === offer.applicationId
          );
          if (!application) return null;

          const candidate = candidates.find(
            (item) => item.candidateId === offer.candidateId
          );
          const job = jobs.find((item) => item.jobId === offer.jobId);
          const approval = approvals.find(
            (item) => item.applicationId === offer.applicationId
          );

          return {
            rowKey: `ofr-${offer.offerId}`,
            offer,
            approval,
            application: buildApplicationRow(application, { candidate, job }),
            candidate,
            job,
          };
        })
        .filter(Boolean),
    [offers, applications, candidates, jobs, approvals]
  );

  const visibleEntries = useMemo(() => {
    const needle = search.trim().toLowerCase();

    return entries.filter((entry) => {
      if (statusFilter !== 'all' && entry.offer.status !== statusFilter) return false;
      if (!needle) return true;
      return (
        entry.candidate.fullName.toLowerCase().includes(needle) ||
        entry.offer.designation.toLowerCase().includes(needle) ||
        entry.offer.offerId.toLowerCase().includes(needle)
      );
    });
  }, [entries, statusFilter, search]);

  const counts = useMemo(
    () => ({
      all: entries.length,
      draft: entries.filter((item) => item.offer.status === OFFER_STATUS.DRAFT).length,
      sent: entries.filter((item) => item.offer.status === OFFER_STATUS.SENT).length,
      accepted: entries.filter((item) => item.offer.status === OFFER_STATUS.ACCEPTED).length,
      declined: entries.filter((item) => item.offer.status === OFFER_STATUS.DECLINED).length,
    }),
    [entries]
  );

  /**
   * Applications that may receive an offer: the hiring recommendation has to
   * be approved and no offer may exist yet.
   */
  const eligibleApplications = useMemo(
    () =>
      applications
        .filter((application) => {
          const approval = approvals.find(
            (item) => item.applicationId === application.applicationId
          );
          const offer = offers.find(
            (item) => item.applicationId === application.applicationId
          );
          return approval?.status === 'approved' && !offer && application.status === 'approval';
        })
        .map((application) => ({
          application,
          candidate: candidates.find((item) => item.candidateId === application.candidateId),
          job: jobs.find((item) => item.jobId === application.jobId),
        }))
        .filter((entry) => entry.candidate && entry.job),
    [applications, approvals, offers, candidates, jobs]
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
    eligibleApplications,
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

export default useOffers;
