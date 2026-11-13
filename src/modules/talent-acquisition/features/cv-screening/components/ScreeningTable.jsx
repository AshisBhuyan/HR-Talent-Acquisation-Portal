import { ClipboardCheck, Eye, PauseCircle } from 'lucide-react';
import DataTable from '../../../../../shared/components/DataTable.jsx';
import Badge from '../../../../../shared/components/Badge.jsx';
import CandidateStatusBadge from '../../../components/CandidateStatusBadge.jsx';
import EmptyState from '../../../components/EmptyState.jsx';
import { getInitials, formatExperienceYears } from '../../../utils/formatCandidateData.js';
import { SCREENING_STATUS_META } from '../../../constants/screeningStatus.js';

const AI_EVALUATION_META = {
  pending: { label: 'Awaiting AI Result', variant: 'grey' },
  processing: { label: 'Processing', variant: 'orange' },
  completed: { label: 'AI Completed', variant: 'green' },
};

const HR_DECISION_META = {
  awaiting_decision: { label: 'Awaiting Review', variant: 'orange' },
  passed: { label: 'Passed', variant: 'green' },
  on_hold: { label: 'On Hold', variant: 'grey' },
  rejected: { label: 'Rejected', variant: 'red' },
};

function renderAiEvaluation(status) {
  const meta = AI_EVALUATION_META[status] || AI_EVALUATION_META.pending;
  return (
    <Badge variant={meta.variant} dot>
      {meta.label}
    </Badge>
  );
}

function renderHrDecision(decision) {
  const meta = HR_DECISION_META[decision] || HR_DECISION_META.awaiting_decision;
  return (
    <Badge variant={meta.variant} dot>
      {meta.label}
    </Badge>
  );
}

/**
 * Screening queue table. Candidates are ranked by AI matching score within
 * their job position; unscored candidates are left unranked.
 */
export default function ScreeningTable({ rows, loading, ranksByPosition, positions, onReview }) {
  const columns = [
    {
      key: 'rank',
      header: 'Rank',
      align: 'right',
      render: (row) => {
        const rank = ranksByPosition?.get(row.application.applicationId);
        return Number.isFinite(rank) ? (
          <span className="cell-strong">#{rank}</span>
        ) : (
          <span className="cell-muted">—</span>
        );
      },
    },
    {
      key: 'candidate',
      header: 'Candidate',
      render: (row) => (
        <div className="cell-user">
          <div className="avatar">{getInitials(row.candidate.fullName)}</div>
          <div className="cell-user__text">
            <button
              type="button"
              className="ta-link cell-user__name"
              onClick={() => onReview(row)}
              aria-label={`Open screening workspace for ${row.candidate.fullName}`}
            >
              {row.candidate.fullName}
            </button>
            <div className="cell-user__sub">{row.candidate.candidateId}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'applicationId',
      header: 'Application ID',
      render: (row) => <span className="cell-strong">{row.application.applicationId}</span>,
    },
    {
      key: 'position',
      header: 'Position',
      render: (row) => (
        <div>
          <div>{row.job?.title || 'Unknown'}</div>
          <div className="cell-muted">{row.job?.department || ''}</div>
        </div>
      ),
    },
    {
      key: 'experience',
      header: 'Experience',
      render: (row) => formatExperienceYears(row.candidate.totalExperienceYears),
    },
    {
      key: 'score',
      header: 'Match Score',
      align: 'right',
      render: (row) =>
        Number.isFinite(Number(row.screening?.score)) ? (
          <span className="cell-strong">{row.screening.score}%</span>
        ) : (
          <span className="cell-muted">Awaiting AI Result</span>
        ),
    },
    {
      key: 'aiEvaluation',
      header: 'AI Evaluation',
      render: (row) => renderAiEvaluation(row.aiEvaluationStatus),
    },
    {
      key: 'hrDecision',
      header: 'HR Decision',
      render: (row) => renderHrDecision(row.hrDecision),
    },
    {
      key: 'applicationStatus',
      header: 'Application',
      render: (row) => <CandidateStatusBadge status={row.application.status} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <div className="cell-actions">
          <button
            type="button"
            className="btn btn--ghost btn--icon"
            onClick={() => onReview(row)}
            aria-label={`Open screening workspace for ${row.candidate.fullName}`}
            title="Open screening workspace"
          >
            <Eye size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      keyField="rowKey"
      loading={loading}
      minWidth={1520}
      ariaLabel="CV screening queue"
      empty={
        <EmptyState
          icon={ClipboardCheck}
          title="No candidate in the screening queue"
          description="Applications appear here when HR clicks Move to Screening on a candidate profile."
        />
      }
    />
  );
}
