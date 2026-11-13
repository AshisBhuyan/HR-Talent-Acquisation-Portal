import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Search, UserCheck } from 'lucide-react';
import PageHeader from '../../../shared/components/PageHeader.jsx';
import Button from '../../../shared/components/Button.jsx';
import { useToast } from '../../../shared/components/Toast.jsx';
import ShortlistTable from '../features/shortlisting/components/ShortlistTable.jsx';
import ShortlistPendingTable from '../features/shortlisting/components/ShortlistPendingTable.jsx';
import ShortlistActionModal from '../features/shortlisting/components/ShortlistActionModal.jsx';
import useShortlisting from '../features/shortlisting/hooks/useShortlisting.js';
import { ROUTES } from '../../../app/routeConfig.js';
import '../styles/shortlisting.css';

export default function ShortlistingPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const {
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
  } = useShortlisting();

  const [action, setAction] = useState(null);
  const [busy, setBusy] = useState(false);

  const handleShortlist = async (entry) => {
    setBusy(true);
    try {
      await runAction(actions.shortlistCandidate, entry.application.applicationId, {
        remarks: 'Shortlisted after the CV screening',
      });
      toast.success(`${entry.candidate.fullName} was shortlisted.`);
    } catch (actionError) {
      toast.error(actionError.message);
    } finally {
      setBusy(false);
    }
  };

  const handleConfirm = async (remarks) => {    if (!action) return;
    setBusy(true);
    try {
      if (action.mode === 'reject') {
        await runAction(actions.rejectShortlist, action.row.application.applicationId, { remarks });
        toast.success(`${action.row.candidate.fullName} was rejected.`);
      } else {
        await runAction(actions.holdShortlist, action.row.application.applicationId, { remarks });
        toast.success(`${action.row.candidate.fullName} was put on hold.`);
      }
      setAction(null);
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
        title="Shortlisting"
        subtitle="Candidates that completed the CV screening. Shortlist them, keep them on hold or close their application before the interview stage."
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
            aria-label="Search the shortlist"
          />
        </div>

        <div className="filters">
          <button
            type="button"
            className={`ta-filter-chip ${statusFilter === 'shortlisted' ? 'active' : ''}`}
            onClick={() => setStatusFilter('shortlisted')}
          >
            Shortlisted <span className="ta-filter-chip__count">{counts.shortlisted}</span>
          </button>
          <button
            type="button"
            className={`ta-filter-chip ${statusFilter === 'on_hold' ? 'active' : ''}`}
            onClick={() => setStatusFilter('on_hold')}
          >
            On hold <span className="ta-filter-chip__count">{counts.on_hold}</span>
          </button>
          <button
            type="button"
            className={`ta-filter-chip ${statusFilter === 'rejected' ? 'active' : ''}`}
            onClick={() => setStatusFilter('rejected')}
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

      {awaitingShortlist.length > 0 && (
        <section className="card">
          <div className="card__header">
            <div>
              <div className="card__title">Awaiting a shortlisting decision</div>
              <div className="card__subtitle">
                Candidates that passed the CV screening and still need a shortlisting decision
              </div>
            </div>
          </div>
          <div className="card__body">
            <ShortlistPendingTable
              rows={awaitingShortlist}
              loading={loading}
              onShortlist={handleShortlist}
              onViewCandidate={(row) =>
                navigate(`${ROUTES.TALENT_APPLICATIONS}/${row.application.applicationId}`)
              }
              onViewScreening={() => navigate(ROUTES.TALENT_SCREENING)}
            />
          </div>
        </section>
      )}

      <ShortlistTable
        rows={visibleEntries}
        loading={loading}
        onHold={(row) => setAction({ mode: 'hold', row })}
        onReject={(row) => setAction({ mode: 'reject', row })}
      />

      {visibleEntries.length === 0 && !loading && (
        <p className="visually-hidden">
          <UserCheck size={14} aria-hidden="true" /> No shortlisted candidate matches the filters.
        </p>
      )}

      <ShortlistActionModal
        open={Boolean(action)}
        mode={action?.mode}
        row={action?.row}
        loading={busy}
        onClose={() => setAction(null)}
        onConfirm={handleConfirm}
      />
    </div>
  );
}
