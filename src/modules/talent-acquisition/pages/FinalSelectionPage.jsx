import { useState } from 'react';
import { RefreshCw, Search } from 'lucide-react';
import PageHeader from '../../../shared/components/PageHeader.jsx';
import Button from '../../../shared/components/Button.jsx';
import { useToast } from '../../../shared/components/Toast.jsx';
import SelectionTable from '../features/final-selection/components/SelectionTable.jsx';
import SelectionDecisionModal from '../features/final-selection/components/SelectionDecisionModal.jsx';
import useFinalSelection from '../features/final-selection/hooks/useFinalSelection.js';
import '../styles/finalSelection.css';

export default function FinalSelectionPage() {
  const toast = useToast();
  const {
    visibleEntries,
    counts,
    search,
    setSearch,
    loading,
    error,
    actions,
    runAction,
  } = useFinalSelection();

  const [reviewEntry, setReviewEntry] = useState(null);
  const [busy, setBusy] = useState(false);

  const handleDecide = async (decision, remarks) => {
    if (!reviewEntry) return;
    setBusy(true);
    try {
      await runAction(
        actions.recordSelectionDecision,
        reviewEntry.application.applicationId,
        { decision, remarks }
      );
      toast.success(`Decision recorded for ${reviewEntry.candidate.fullName}.`);
      setReviewEntry(null);
    } catch (actionError) {
      toast.error(actionError.message);
    } finally {
      setBusy(false);
    }
  };

  const handleSubmitForApproval = async (entry) => {
    setBusy(true);
    try {
      await runAction(actions.submitForApproval, entry.application.applicationId, {
        remarks: entry.selection?.remarks || '',
      });
      toast.success(
        `${entry.candidate.fullName} was submitted to the admin approval stage.`
      );
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
        title="Final Selection"
        subtitle="HR evaluation of the candidates that completed their interview rounds. Record the hiring recommendation and submit it for admin approval."
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

      <div className="ta-interview-summary">
        <div className="ta-interview-summary__item">
          <span className="ta-interview-summary__label">Awaiting decision</span>
          <span className="ta-interview-summary__value">{counts.pending}</span>
        </div>
        <div className="ta-interview-summary__item">
          <span className="ta-interview-summary__label">Submitted for approval</span>
          <span className="ta-interview-summary__value">{counts.submitted}</span>
        </div>
        <div className="ta-interview-summary__item">
          <span className="ta-interview-summary__label">Candidates in scope</span>
          <span className="ta-interview-summary__value">{counts.all}</span>
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
            aria-label="Search the final selection list"
          />
        </div>
      </div>

      <SelectionTable
        rows={visibleEntries}
        loading={loading}
        onReview={setReviewEntry}
        onSubmitForApproval={handleSubmitForApproval}
      />

      <SelectionDecisionModal
        open={Boolean(reviewEntry)}
        entry={reviewEntry}
        loading={busy}
        onClose={() => setReviewEntry(null)}
        onDecide={handleDecide}
        onSubmitForApproval={handleSubmitForApproval}
      />
    </div>
  );
}
