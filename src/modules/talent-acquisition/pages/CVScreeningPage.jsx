import { useState } from 'react';
import {
  Bot,
  CheckCircle2,
  Inbox,
  ListFilter,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  UsersRound,
} from 'lucide-react';
import PageHeader from '../../../shared/components/PageHeader.jsx';
import Button from '../../../shared/components/Button.jsx';
import { Select } from '../../../shared/components/Input.jsx';
import { useToast } from '../../../shared/components/Toast.jsx';
import ScreeningTable from '../features/cv-screening/components/ScreeningTable.jsx';
import ScreeningReviewModal from '../features/cv-screening/components/ScreeningReviewModal.jsx';
import useScreeningQueue from '../features/cv-screening/hooks/useScreeningQueue.js';
import {
  SCREENING_STATUS_OPTIONS,
  SCREENING_STATUS,
} from '../constants/screeningStatus.js';
import '../styles/cvScreening.css';

const AI_EVALUATION_OPTIONS = [
  { value: '', label: 'All AI evaluation states' },
  { value: 'pending', label: 'Awaiting AI Result' },
  { value: 'processing', label: 'Processing' },
  { value: 'completed', label: 'AI Completed' },
];

const HR_DECISION_OPTIONS = [
  { value: '', label: 'All HR decisions' },
  { value: 'awaiting_decision', label: 'Awaiting Review' },
  { value: 'passed', label: 'Passed' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'rejected', label: 'Rejected' },
];

export default function CVScreeningPage() {
  const toast = useToast();
  const {
    visibleEntries,
    counts,
    statusFilter,
    setStatusFilter,
    search,
    setSearch,
    positionFilter,
    setPositionFilter,
    positions,
    aiEvaluationFilter,
    setAiEvaluationFilter,
    hrDecisionFilter,
    setHrDecisionFilter,
    resetFilters,
    activeFilterCount,
    ranksByPosition,
    loading,
    error,
    actions,
    runAction,
  } = useScreeningQueue();

  const [reviewEntry, setReviewEntry] = useState(null);
  const [busy, setBusy] = useState(false);

  const statsCards = [
    {
      key: 'total',
      label: 'Total in Screening',
      value: counts.total,
      meta: 'Explicitly transferred by HR',
      icon: Inbox,
      variant: 'blue',
    },
    {
      key: 'awaiting-ai',
      label: 'Awaiting AI Evaluation',
      value: counts.awaitingAi,
      meta: 'No AI result received yet',
      icon: Bot,
      variant: 'orange',
    },
    {
      key: 'ai-completed',
      label: 'AI Evaluation Completed',
      value: counts.aiCompleted,
      meta: 'Awaiting HR decision',
      icon: ShieldCheck,
      variant: 'purple',
    },
    {
      key: 'awaiting-decision',
      label: 'Awaiting HR Decision',
      value: counts.awaitingDecision,
      meta: 'AI ranks shown, decision pending',
      icon: UsersRound,
      variant: 'orange',
    },
    {
      key: 'passed',
      label: 'Passed',
      value: counts.passed,
      meta: 'Moved to shortlisting decision',
      icon: CheckCircle2,
      variant: 'green',
    },
    {
      key: 'on-hold',
      label: 'On Hold',
      value: counts.onHold,
      meta: 'Application paused',
      icon: UserCheck,
      variant: 'grey',
    },
    {
      key: 'rejected',
      label: 'Rejected',
      value: counts.rejected,
      meta: 'Application closed',
      icon: Trash2,
      variant: 'red',
    },
  ];

  const handleSaveDecision = async (payload) => {
    if (!reviewEntry) return;
    setBusy(true);
    try {
      await runAction(actions.saveScreeningDecision, reviewEntry.application.applicationId, payload);
      toast.success(`Screening decision saved for ${reviewEntry.candidate.fullName}.`);
      setReviewEntry(null);
    } catch (actionError) {
      toast.error(actionError.message);
    } finally {
      setBusy(false);
    }
  };

  const handlePassed = async () => {
    if (!reviewEntry) return;
    setBusy(true);
    try {
      await runAction(actions.saveScreeningDecision, reviewEntry.application.applicationId, {
        status: SCREENING_STATUS.PASSED,
        score: reviewEntry.screening.score,
        hrRemarks: reviewEntry.screening.hrRemarks || '',
      });
      toast.success(
        `${reviewEntry.candidate.fullName} passed the screening and is awaiting the shortlisting decision.`
      );
      setReviewEntry(null);
    } catch (actionError) {
      toast.error(actionError.message);
    } finally {
      setBusy(false);
    }
  };

  const handleHold = async (reason) => {
    if (!reviewEntry) return;
    setBusy(true);
    try {
      await runAction(actions.holdApplication, reviewEntry.application.applicationId, {
        remarks: reason || 'Application placed on hold by HR',
      });
      toast.success(`${reviewEntry.candidate.fullName} was put on hold.`);
      setReviewEntry(null);
    } catch (actionError) {
      toast.error(actionError.message);
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async (reason) => {
    if (!reviewEntry) return;
    setBusy(true);
    try {
      await runAction(
        actions.failScreening,
        reviewEntry.application.applicationId,
        {
          remarks: reason || 'Candidate did not meet the screening criteria',
        }
      );
      toast.success(`${reviewEntry.candidate.fullName} was rejected at screening.`);
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
        title="CV Screening"
        subtitle="Review candidate CVs, evaluate job requirement matching, and record HR screening decisions."
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

      <div className="stats-grid ta-stats-grid ta-screening-stats" aria-label="Screening statistics">
        {statsCards.map((card) => {
          const Icon = card.icon;
          return (
            <div className={`stat-card stat-card--${card.variant}`} key={card.key}>
              <div className={`stat-card__icon stat-card__icon--${card.variant}`}>
                <Icon size={20} aria-hidden="true" />
              </div>
              <div className="stat-card__content">
                <div className="stat-card__label">{card.label}</div>
                <div className="stat-card__value">{card.value}</div>
                <div className="stat-card__meta">{card.meta}</div>
              </div>
            </div>
          );
        })}
      </div>

      <section className="ta-applications-toolbar" aria-label="Screening filters">
        <div className="ta-applications-toolbar__row">
          <div className="search-box ta-applications-toolbar__search">
            <span className="search-box__icon">
              <Search size={16} aria-hidden="true" />
            </span>
            <input
              type="search"
              className="input"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search candidate name, application ID or position"
              aria-label="Search the screening queue"
            />
          </div>

          <Select
            aria-label="Filter by position"
            value={positionFilter}
            onChange={(event) => setPositionFilter(event.target.value)}
            placeholder="All positions"
            options={positions}
          />
          <Select
            aria-label="Filter by screening status"
            value={[SCREENING_STATUS.PENDING, SCREENING_STATUS.IN_PROGRESS, SCREENING_STATUS.COMPLETED, SCREENING_STATUS.PASSED, SCREENING_STATUS.FAILED].includes(statusFilter) ? statusFilter : ''}
            onChange={(event) => setStatusFilter(event.target.value === '' ? 'all' : event.target.value)}
            placeholder="All screening statuses"
            options={SCREENING_STATUS_OPTIONS}
          />
          <Select
            aria-label="Filter by AI evaluation status"
            value={aiEvaluationFilter}
            onChange={(event) => setAiEvaluationFilter(event.target.value)}
            options={AI_EVALUATION_OPTIONS}
          />
          <Select
            aria-label="Filter by HR decision"
            value={hrDecisionFilter}
            onChange={(event) => setHrDecisionFilter(event.target.value)}
            options={HR_DECISION_OPTIONS}
          />
        </div>

        <div className="ta-applications-toolbar__meta">
          <div className="filters">
            <button
              type="button"
              className={`ta-filter-chip ${statusFilter === 'open' ? 'active' : ''}`}
              onClick={() => setStatusFilter('open')}
            >
              Open <span className="ta-filter-chip__count">{counts.open}</span>
            </button>
            <button
              type="button"
              className={`ta-filter-chip ${statusFilter === 'completed' ? 'active' : ''}`}
              onClick={() => setStatusFilter('completed')}
            >
              Decided <span className="ta-filter-chip__count">{counts.completed}</span>
            </button>
            <button
              type="button"
              className={`ta-filter-chip ${statusFilter === 'all' ? 'active' : ''}`}
              onClick={() => setStatusFilter('all')}
            >
              All <span className="ta-filter-chip__count">{counts.all}</span>
            </button>
          </div>
          <div className="ta-applications-toolbar__spacer" />
          <span className="filters-summary">
            <ListFilter size={13} aria-hidden="true" /> {visibleEntries.length} matching candidate
            {visibleEntries.length === 1 ? '' : 's'}
          </span>
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" icon={Trash2} onClick={resetFilters}>
              Clear filters ({activeFilterCount})
            </Button>
          )}
        </div>
      </section>

      <ScreeningTable
        rows={visibleEntries}
        loading={loading}
        ranksByPosition={ranksByPosition}
        positions={positions}
        onReview={setReviewEntry}
      />

      <ScreeningReviewModal
        entry={reviewEntry}
        open={Boolean(reviewEntry)}
        loading={busy}
        onClose={() => setReviewEntry(null)}
        onSaveDecision={handleSaveDecision}
        onPassed={handlePassed}
        onHold={handleHold}
        onReject={handleReject}
      />
    </div>
  );
}
