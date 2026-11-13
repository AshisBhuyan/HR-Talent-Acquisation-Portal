import { useState } from 'react';
import { RefreshCw, Search, Trash2 } from 'lucide-react';
import PageHeader from '../../../shared/components/PageHeader.jsx';
import Button from '../../../shared/components/Button.jsx';
import ConfirmDialog from '../../../shared/components/ConfirmDialog.jsx';
import { useToast } from '../../../shared/components/Toast.jsx';
import { Select } from '../../../shared/components/Input.jsx';
import JoiningTable from '../features/joining-onboarding/components/JoiningTable.jsx';
import JoiningSummaryCards from '../features/joining-onboarding/components/JoiningSummaryCards.jsx';
import JoiningDetailModal from '../features/joining-onboarding/components/JoiningDetailModal.jsx';
import EmployeeConversionAction from '../features/joining-onboarding/components/EmployeeConversionAction.jsx';
import DocumentPreviewModal from '../features/candidate-documents/components/DocumentPreviewModal.jsx';
import OfferLetterModal from '../features/offers/components/OfferLetterModal.jsx';
import useJoining from '../features/joining-onboarding/hooks/useJoining.js';
import candidateDocumentService from '../features/candidate-documents/services/candidateDocumentService.js';
import { useTalentAcquisition } from '../context/TalentAcquisitionContext.jsx';
import { JOINING_STATUS_OPTIONS, HANDOVER_STATUS_OPTIONS } from '../constants/joiningStatus.js';
import '../styles/joiningOnboarding.css';

const VERIFICATION_OPTIONS = [
  { value: 'all_verified', label: 'All verified' },
  { value: 'pending', label: 'Verification pending' },
  { value: 'issues', label: 'Resubmission required' },
];

export default function JoiningOnboardingPage() {
  const toast = useToast();
  const { candidates, jobs } = useTalentAcquisition();
  const {
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
  } = useJoining();

  const [detailEntry, setDetailEntry] = useState(null);
  const [offerEntry, setOfferEntry] = useState(null);
  const [conversionEntry, setConversionEntry] = useState(null);
  const [startEntry, setStartEntry] = useState(null);
  const [markJoinedEntry, setMarkJoinedEntry] = useState(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(null);

  const jobById = (jobId) => jobs.find((job) => job.jobId === jobId);
  const candidateById = (candidateId) =>
    candidates.find((candidate) => candidate.candidateId === candidateId);

  const run = async (fn) => {
    setBusy(true);
    try {
      return await fn();
    } finally {
      setBusy(false);
    }
  };

  const handleStartJoining = () =>
    run(async () => {
      if (!startEntry) return;
      try {
        await runAction(actions.startJoining, startEntry.offer.offerId);
        toast.success(`Joining started for ${startEntry.candidate.fullName}.`);
        setStartEntry(null);
      } catch (actionError) {
        toast.error(actionError.message);
      }
    });

  const handleMarkJoined = () =>
    run(async () => {
      if (!markJoinedEntry) return;
      try {
        await runAction(actions.markJoined, markJoinedEntry.joining.joiningId);
        toast.success(
          `${markJoinedEntry.candidate.fullName} has been marked as joined. The handover can now be prepared.`
        );
        setMarkJoinedEntry(null);
        setDetailEntry(null);
      } catch (actionError) {
        const missing = actionError.fieldErrors?.missing;
        toast.error(
          missing
            ? `Cannot mark as joined: ${missing}`
            : actionError.message
        );
      }
    });

  const handlePrepareHandover = (entry) =>
    run(async () => {
      try {
        await runAction(actions.prepareEmployeeHandover, entry.joining.joiningId);
        toast.success('The employee handover payload was prepared for review.');
      } catch (actionError) {
        toast.error(actionError.message);
      }
    });

  const handleImport = (entry) =>
    run(async () => {
      try {
        await runAction(actions.importEmployeeToDatabank, entry.joining.joiningId);
        toast.success(
          'The employee record was created in the Employee Databank. The handover is marked as imported.'
        );
        setConversionEntry(null);
      } catch (actionError) {
        toast.error(actionError.message);
      }
    });

  const handleVerify = (entry, documentId, verified) =>
    run(async () => {
      try {
        await runAction(actions.verifyJoiningDocument, entry.joining.joiningId, documentId, {
          verified,
          remarks: verified ? 'Verified by HR.' : 'Rejected by HR.',
        });
        toast.success(verified ? 'The document was verified.' : 'The document was rejected.');
      } catch (actionError) {
        toast.error(actionError.message);
      }
    });

  const handleReject = (entry, documentId, reason) =>
    run(async () => {
      try {
        await runAction(actions.requestResubmission, entry.joining.joiningId, documentId, {
          remarks: reason,
        });
        toast.success('A resubmission request was recorded.');
      } catch (actionError) {
        toast.error(actionError.message);
      }
    });

  const handleAddDocument = (entry) =>
    run(async () => {
      const fileName = window.prompt('Enter the file name of the submitted document');
      if (!fileName) return;
      const type = window.prompt(
        'Document type (identity, address, photograph, degree, marksheets, bank, emergency_contact, employment_details)'
      );
      if (!type) return;
      try {
        await runAction(actions.addJoiningDocument, entry.joining.joiningId, {
          type,
          fileName,
          mimeType: 'application/pdf',
          sizeBytes: 0,
        });
        toast.success('The document was recorded.');
      } catch (actionError) {
        toast.error(actionError.message);
      }
    });

  const handleChecklist = (entry, key, status, remarks) =>
    run(async () => {
      try {
        await runAction(
          actions.setJoiningChecklistItem,
          entry.joining.joiningId,
          key,
          status,
          remarks
        );
        toast.success('Checklist item updated.');
      } catch (actionError) {
        toast.error(actionError.message);
      }
    });

  const handleUpdateStatus = (entry, status) =>
    run(async () => {
      try {
        await runAction(actions.updateJoiningStatus, entry.joining.joiningId, status);
        toast.success('The joining status was updated.');
      } catch (actionError) {
        toast.error(actionError.message);
      }
    });

  const handlePreviewDocument = (document) => {
    if (!detailEntry) return;
    const url = candidateDocumentService.getPreviewUrl(document, {
      candidate: candidateById(detailEntry.candidate.candidateId),
      job: jobById(detailEntry.application.jobId),
    });
    setPreview({ document, url, candidate: candidateById(detailEntry.candidate.candidateId) });
  };

  const handleDownloadDocument = (document) => {
    if (!detailEntry) return;
    try {
      candidateDocumentService.downloadDocument(document, {
        candidate: candidateById(detailEntry.candidate.candidateId),
        job: jobById(detailEntry.application.jobId),
      });
      toast.success('Document download started.');
    } catch (downloadError) {
      toast.error(downloadError.message);
    }
  };

  const summaryCards = summary;

  return (
    <div className="page">
      <PageHeader
        eyebrow="Ecometrix · Talent Acquisition"
        title="Joining & Onboarding"
        subtitle="Track the joining progress of accepted offers, verify documents, mark candidates as joined and hand their records over to the Employee Databank."
        actions={
          <Button variant="outline" icon={RefreshCw} onClick={() => window.location.reload()}>
            Refresh data
          </Button>
        }
      />

      {error && (
        <div className="notice notice--error" role="alert">
          <div className="notice__body">{error}</div>
        </div>
      )}

      <JoiningSummaryCards summary={summaryCards} />

      <section className="ta-applications-toolbar" aria-label="Joining filters">
        <div className="ta-applications-toolbar__row">
          <div className="search-box ta-applications-toolbar__search">
            <span className="search-box__icon">
              <Search size={16} aria-hidden="true" />
            </span>
            <input
              type="search"
              className="input"
              value={filters.search}
              onChange={(event) => updateFilter('search', event.target.value)}
              placeholder="Search candidate name, candidate ID or application ID..."
              aria-label="Search joining candidates"
            />
          </div>

          <Select
            aria-label="Filter by position"
            value={filters.jobId}
            onChange={(event) => updateFilter('jobId', event.target.value)}
            placeholder="All positions"
            options={positions}
          />
          <Select
            aria-label="Filter by joining status"
            value={filters.status}
            onChange={(event) => updateFilter('status', event.target.value)}
            placeholder="All joining statuses"
            options={JOINING_STATUS_OPTIONS}
          />
          <Select
            aria-label="Filter by verification status"
            value={filters.verification}
            onChange={(event) => updateFilter('verification', event.target.value)}
            placeholder="All verification states"
            options={VERIFICATION_OPTIONS}
          />
          <Select
            aria-label="Filter by handover status"
            value={filters.handover}
            onChange={(event) => updateFilter('handover', event.target.value)}
            placeholder="All handover states"
            options={HANDOVER_STATUS_OPTIONS}
          />
          <label className="ta-inline-field">
            <span className="ta-inline-field__label">From</span>
            <input
              type="date"
              className="input"
              value={filters.dateFrom}
              onChange={(event) => updateFilter('dateFrom', event.target.value)}
              aria-label="Joining date from"
            />
          </label>
          <label className="ta-inline-field">
            <span className="ta-inline-field__label">To</span>
            <input
              type="date"
              className="input"
              value={filters.dateTo}
              onChange={(event) => updateFilter('dateTo', event.target.value)}
              aria-label="Joining date to"
            />
          </label>
        </div>

        <div className="ta-applications-toolbar__meta">
          <span className="filters-summary">
            {visibleEntries.length} joining record{visibleEntries.length === 1 ? '' : 's'}
          </span>
          <div className="ta-applications-toolbar__spacer" />
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" icon={Trash2} onClick={resetFilters}>
              Clear filters ({activeFilterCount})
            </Button>
          )}
        </div>
      </section>

      {offersAwaitingJoining.length > 0 && (
        <section className="card">
          <div className="card__header">
            <div>
              <div className="card__title">Accepted offers without a joining record</div>
              <div className="card__subtitle">Open the joining checklist for these candidates</div>
            </div>
          </div>
          <div className="card__body">
            <ul className="ta-list">
              {offersAwaitingJoining.map((entry) => (
                <li className="ta-list__item" key={entry.offer.offerId}>
                  <div className="ta-list__body">
                    <div className="ta-list__title">{entry.candidate.fullName}</div>
                    <div className="ta-list__meta">
                      {entry.offer.designation} · joining {entry.offer.joiningDate?.slice(0, 10)}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setStartEntry(entry)}
                    disabled={busy}
                  >
                    Start joining
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <JoiningTable
        rows={visibleEntries}
        loading={loading}
        onView={setDetailEntry}
        onViewOffer={setOfferEntry}
        onMarkJoined={setMarkJoinedEntry}
        onOpenHandover={setConversionEntry}
      />

      {importHistory.length > 0 && (
        <section className="card">
          <div className="card__header">
            <div>
              <div className="card__title">Employee import history</div>
              <div className="card__subtitle">Handover attempts recorded for this company account</div>
            </div>
          </div>
          <div className="card__body">
            <ul className="ta-import-history">
              {importHistory.map((item) => (
                <li className="ta-import-history__item" key={item.handoverId}>
                  <div className="ta-import-history__main">
                    <div className="ta-import-history__title">
                      {item.candidateName} · {item.handoverId}
                    </div>
                    <div className="ta-import-history__meta">
                      Prepared {item.preparedAt?.slice(0, 10)}
                      {item.importedAt ? ` · imported ${item.importedAt.slice(0, 10)}` : ''}
                      {item.employeeId && ` · employee ${item.employeeId}`}
                    </div>
                    {item.status === 'import_failed' && item.error && (
                      <div className="field__error">{item.error}</div>
                    )}
                  </div>
                  <div className="ta-import-history__side">
                    <span className={`badge badge--${item.status === 'imported' ? 'green' : item.status === 'import_failed' ? 'red' : item.status === 'ready_for_review' ? 'blue' : 'orange'}`}>
                      {item.status.replace(/_/g, ' ')}
                    </span>
                    {item.status === 'import_failed' && (
                      <button
                        type="button"
                        className="btn btn--outline btn--sm"
                        onClick={() => {
                          const entry = visibleEntries.find(
                            (candidate) => candidate.joining.joiningId === item.joiningId
                          );
                          if (entry) setConversionEntry(entry);
                        }}
                      >
                        Retry import
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <JoiningDetailModal
        open={Boolean(detailEntry)}
        entry={detailEntry}
        loading={busy}
        onClose={() => setDetailEntry(null)}
        onAddDocument={handleAddDocument}
        onVerify={handleVerify}
        onReject={handleReject}
        onSetChecklistStatus={handleChecklist}
        onUpdateStatus={handleUpdateStatus}
        onMarkJoined={setMarkJoinedEntry}
        onOpenConversion={setConversionEntry}
        onPreview={handlePreviewDocument}
        onDownload={handleDownloadDocument}
      />

      <EmployeeConversionAction
        open={Boolean(conversionEntry)}
        entry={conversionEntry}
        loading={busy}
        onClose={() => setConversionEntry(null)}
        onPrepare={handlePrepareHandover}
        onImport={handleImport}
      />

      {offerEntry && (
        <OfferLetterModal
          open
          entry={{
            offer: offerEntry.offer,
            candidate: offerEntry.candidate,
            job: jobById(offerEntry.application.jobId),
          }}
          onClose={() => setOfferEntry(null)}
        />
      )}

      <DocumentPreviewModal
        document={preview?.document}
        url={preview?.url}
        open={Boolean(preview)}
        onClose={() => setPreview(null)}
        onDownload={handleDownloadDocument}
      />

      <ConfirmDialog
        open={Boolean(startEntry)}
        title="Start joining"
        confirmLabel="Start joining"
        variant="primary"
        message={
          startEntry
            ? `A joining checklist will be opened for ${startEntry.candidate.fullName}. Mandatory documents must be verified before they can be marked as joined.`
            : 'A joining checklist will be opened.'
        }
        onClose={() => setStartEntry(null)}
        onConfirm={handleStartJoining}
        loading={busy}
      />

      <ConfirmDialog
        open={Boolean(markJoinedEntry)}
        title="Mark candidate as joined"
        confirmLabel="Mark as joined"
        variant="primary"
        message={
          markJoinedEntry
            ? `${markJoinedEntry.candidate.fullName} will be marked as joined. The Employee Databank handover can then be prepared and imported.`
            : 'The candidate will be marked as joined.'
        }
        onClose={() => setMarkJoinedEntry(null)}
        onConfirm={handleMarkJoined}
        loading={busy}
      />
    </div>
  );
}
