import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import PageHeader from '../../../shared/components/PageHeader.jsx';
import Button from '../../../shared/components/Button.jsx';
import { Select } from '../../../shared/components/Input.jsx';
import { useToast } from '../../../shared/components/Toast.jsx';
import { ROUTES } from '../../../app/routeConfig.js';
import ApplicationFilters from '../features/candidate-applications/components/ApplicationFilters.jsx';
import ApplicationTable from '../features/candidate-applications/components/ApplicationTable.jsx';
import ApplicationDetailModal from '../features/candidate-applications/components/ApplicationDetailModal.jsx';
import RejectApplicationModal from '../features/candidate-applications/components/RejectApplicationModal.jsx';
import RemarkModal from '../features/candidate-applications/components/RemarkModal.jsx';
import MoveToScreeningModal from '../features/candidate-applications/components/MoveToScreeningModal.jsx';

import DocumentPreviewModal from '../features/candidate-documents/components/DocumentPreviewModal.jsx';
import useCandidateApplications from '../features/candidate-applications/hooks/useCandidateApplications.js';
import { useTalentAcquisition } from '../context/TalentAcquisitionContext.jsx';
import candidateDocumentService from '../features/candidate-documents/services/candidateDocumentService.js';
import { APPLICATION_SORT_OPTIONS } from '../utils/candidateFilters.js';
import '../styles/candidateApplications.css';

export default function CandidateApplicationsPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const { candidates, jobs } = useTalentAcquisition();
  const {
    pageData,
    filteredRows,
    filters,
    sort,
    positions,
    loading,
    error,
    activeFilterCount,
    setSort,
    setPage,
    updateFilter,
    resetFilters,
    runAction,
    actions,
  } = useCandidateApplications();

  const [detailRow, setDetailRow] = useState(null);
  const [rejectRow, setRejectRow] = useState(null);
  const [remarkRow, setRemarkRow] = useState(null);
  const [screenRow, setScreenRow] = useState(null);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);

  const candidateById = (candidateId) =>
    candidates.find((candidate) => candidate.candidateId === candidateId);

  const jobById = (jobId) => jobs.find((job) => job.jobId === jobId);

  const profilePath = (applicationId) =>
    `${ROUTES.TALENT_APPLICATIONS}/${applicationId}`;

  const handleOpenProfile = (row) => {
    navigate(profilePath(row.applicationId));
  };

  const openScreeningConfirmation = (row) => setScreenRow(row);

  const handleViewScreening = () => {
    navigate(ROUTES.TALENT_SCREENING);
  };

  const handleScheduleInterview = () => {
    navigate(ROUTES.TALENT_INTERVIEWS);
  };

  const handlePreviewCv = (row) => {
    const candidate = candidateById(row.candidateId);
    const cv = (candidate?.documents || []).find((document) => document.type === 'cv');
    if (!cv) {
      toast.warning('No CV has been submitted for this candidate.');
      return;
    }

    const url = candidateDocumentService.getPreviewUrl(cv, {
      candidate,
      job: jobById(row.jobId),
    });

    setPreview({ document: cv, url, candidate, job: jobById(row.jobId) });
  };

  const handleDownload = (document) => {
    if (!preview) return;
    try {
      candidateDocumentService.downloadDocument(document, {
        candidate: preview.candidate,
        job: preview.job,
      });
      toast.success('Document download started.');
    } catch (downloadError) {
      toast.error(downloadError.message);
    }
  };

  const handleMoveToScreening = async (remarks) => {
    const row = screenRow;
    if (!row) return;
    setBusy(true);
    try {
      await runAction(actions.moveToScreening, row.applicationId, { remarks });
      toast.success(`${row.candidateName} moved to CV screening.`);
      setDetailRow(null);
      setScreenRow(null);
    } catch (actionError) {
      toast.error(actionError.message);
    } finally {
      setBusy(false);
    }
  };

  const handleAddRemark = async (remarks) => {
    if (!remarkRow) return;
    setBusy(true);
    try {
      await runAction(actions.addRemark, remarkRow.applicationId, { remarks });
      toast.success(`A remark was recorded for ${remarkRow.candidateName}.`);
      setRemarkRow(null);
    } catch (actionError) {
      toast.error(actionError.message);
    } finally {
      setBusy(false);
    }
  };

  const handleHold = async (row, remarks) => {
    setBusy(true);
    try {
      await runAction(actions.holdApplication, row.applicationId, {
        remarks: remarks || 'Candidate placed on hold due to pending review.',
      });
      toast.success(`${row.candidateName}'s application was put on hold.`);
    } catch (actionError) {
      toast.error(actionError.message);
    } finally {
      setBusy(false);
    }
  };

  const handleResume = async (row) => {
    setBusy(true);
    try {
      await runAction(actions.resumeApplication, row.applicationId, {
        remarks: 'Application resumed by HR',
      });
      toast.success(`${row.candidateName}'s application was resumed.`);
    } catch (actionError) {
      toast.error(actionError.message);
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async (remarks) => {
    if (!rejectRow) return;
    setBusy(true);
    try {
      await runAction(actions.rejectApplication, rejectRow.applicationId, { remarks });
      toast.success(`${rejectRow.candidateName}'s application was rejected.`);
      setRejectRow(null);
      setDetailRow(null);
    } catch (actionError) {
      toast.error(actionError.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <PageHeader
        eyebrow="Ecometrix · Talent Acquisition"
        title="Candidate Applications"
        subtitle="All applications received from the Career Portal. Search, filter and progress the candidates that match an open position."
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

      <ApplicationFilters
        filters={filters}
        positions={positions}
        activeFilterCount={activeFilterCount}
        totalCount={filteredRows.length}
        onChange={updateFilter}
        onReset={resetFilters}
      />

      <div className="ta-toolbar-row">
        <span className="filters-summary">
          All Applications · {filteredRows.length} shown
        </span>
        <div className="page-toolbar__spacer" />
        <Select
          aria-label="Sort applications"
          value={sort}
          onChange={(event) => setSort(event.target.value)}
          placeholder="Sort"
          options={APPLICATION_SORT_OPTIONS}
        />
      </div>

      <ApplicationTable
        rows={pageData.items}
        loading={loading}
        pagination={pageData}
        onOpenProfile={handleOpenProfile}
        onViewDetails={setDetailRow}
        onPreviewCv={handlePreviewCv}
        onMoveToScreening={openScreeningConfirmation}
        onViewScreening={handleViewScreening}
        onScheduleInterview={handleScheduleInterview}
        onHold={handleHold}
        onResume={handleResume}
        onAddRemark={setRemarkRow}
        onReject={setRejectRow}
        onChangePage={setPage}
      />

      <ApplicationDetailModal
        row={detailRow}
        open={Boolean(detailRow)}
        onClose={() => setDetailRow(null)}
        onMoveToScreening={openScreeningConfirmation}
        onViewScreening={handleViewScreening}
        onScheduleInterview={handleScheduleInterview}
        onHold={handleHold}
        onResume={handleResume}
        onAddRemark={setRemarkRow}
        onReject={setRejectRow}
        onPreviewCv={handlePreviewCv}
        onOpenProfile={handleOpenProfile}
      />

      <MoveToScreeningModal
        open={Boolean(screenRow)}
        row={screenRow}
        loading={busy}
        onClose={() => setScreenRow(null)}
        onConfirm={handleMoveToScreening}
      />

      <RemarkModal
        open={Boolean(remarkRow)}
        row={remarkRow}
        loading={busy}
        onClose={() => setRemarkRow(null)}
        onConfirm={handleAddRemark}
      />

      <RejectApplicationModal
        row={rejectRow}
        open={Boolean(rejectRow)}
        loading={busy}
        onClose={() => setRejectRow(null)}
        onConfirm={handleReject}
      />

      <DocumentPreviewModal
        document={preview?.document}
        url={preview?.url}
        open={Boolean(preview)}
        onClose={() => setPreview(null)}
        onDownload={handleDownload}
      />
    </div>
  );
}
