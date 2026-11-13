import { useState } from 'react';
import { RefreshCw, Search, ShieldCheck } from 'lucide-react';
import PageHeader from '../../../shared/components/PageHeader.jsx';
import Button from '../../../shared/components/Button.jsx';
import { useToast } from '../../../shared/components/Toast.jsx';
import ApprovalTable from '../features/approvals/components/ApprovalTable.jsx';
import ApprovalDecisionModal from '../features/approvals/components/ApprovalDecisionModal.jsx';
import useApprovals from '../features/approvals/hooks/useApprovals.js';
import { APPROVAL_STATUS } from '../constants/approvalStatus.js';
import '../styles/approvals.css';

export default function ApprovalManagementPage() {
  const toast = useToast();
  const {
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
  } = useApprovals();

  const [reviewEntry, setReviewEntry] = useState(null);
  const [busy, setBusy] = useState(false);

  const handleDecide = async (status, remarks) => {
    if (!reviewEntry) return;
    setBusy(true);
    try {
      await runAction(actions.decideApproval, reviewEntry.approval.approvalId, {
        status,
        remarks,
      });
      toast.success(`The approval for ${reviewEntry.candidate.fullName} was recorded.`);
      setReviewEntry(null);
    } catch (actionError) {
      toast.error(actionError.message);
    } finally {
      setBusy(false);
    }
  };

  const handleResubmit = async (entry) => {
    setBusy(true);
    try {
      await runAction(actions.resubmitApproval, entry.application.applicationId, {
        remarks: 'Recommendation resubmitted for approval.',
      });
      toast.success('The recommendation was resubmitted for approval.');
      setReviewEntry(null);
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
        title="Admin Approval"
        subtitle="Hiring recommendations submitted by HR. Approve, reject or request a clarification for every recommendation and keep the approval history for audit."
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

      <div className="notice notice--info">
        <span className="notice__icon">
          <ShieldCheck size={18} aria-hidden="true" />
        </span>
        <div className="notice__body">
          <div className="notice__title">Authorisation note</div>
          The approval actions are enabled for the authenticated HR administrator. A
          production release must enforce the approval permission on the backend before any
          offer can be issued.
        </div>
      </div>

      <div className="ta-interview-summary">
        <div className="ta-interview-summary__item">
          <span className="ta-interview-summary__label">Pending approval</span>
          <span className="ta-interview-summary__value">{counts.pending}</span>
        </div>
        <div className="ta-interview-summary__item">
          <span className="ta-interview-summary__label">Approved</span>
          <span className="ta-interview-summary__value">{counts.approved}</span>
        </div>
        <div className="ta-interview-summary__item">
          <span className="ta-interview-summary__label">Rejected</span>
          <span className="ta-interview-summary__value">{counts.rejected}</span>
        </div>
        <div className="ta-interview-summary__item">
          <span className="ta-interview-summary__label">Clarification requested</span>
          <span className="ta-interview-summary__value">{counts.clarification}</span>
        </div>
      </div>

      <div className="page-toolbar">
        <div className="search-box">
          <span className="search-box__icon">
            <Search size={16} aria-hidden="true" />
          </span>
          <input
            type="search"
            className="input"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by candidate, application ID or position"
            aria-label="Search the approval queue"
          />
        </div>

        <div className="filters">
          <button
            type="button"
            className={`ta-filter-chip ${statusFilter === APPROVAL_STATUS.PENDING ? 'active' : ''}`}
            onClick={() => setStatusFilter(APPROVAL_STATUS.PENDING)}
          >
            Pending <span className="ta-filter-chip__count">{counts.pending}</span>
          </button>
          <button
            type="button"
            className={`ta-filter-chip ${statusFilter === APPROVAL_STATUS.APPROVED ? 'active' : ''}`}
            onClick={() => setStatusFilter(APPROVAL_STATUS.APPROVED)}
          >
            Approved <span className="ta-filter-chip__count">{counts.approved}</span>
          </button>
          <button
            type="button"
            className={`ta-filter-chip ${statusFilter === APPROVAL_STATUS.REJECTED ? 'active' : ''}`}
            onClick={() => setStatusFilter(APPROVAL_STATUS.REJECTED)}
          >
            Rejected <span className="ta-filter-chip__count">{counts.rejected}</span>
          </button>
          <button
            type="button"
            className={`ta-filter-chip ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            All <span className="ta-filter-chip__count">{counts.all}</span>
          </button>
        </div>
      </div>

      <ApprovalTable rows={visibleEntries} loading={loading} onReview={setReviewEntry} />

      <ApprovalDecisionModal
        open={Boolean(reviewEntry)}
        entry={reviewEntry}
        loading={busy}
        onClose={() => setReviewEntry(null)}
        onDecide={handleDecide}
        onResubmit={handleResubmit}
      />
    </div>
  );
}
