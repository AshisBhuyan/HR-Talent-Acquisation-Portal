import { CheckCircle2, Eye, Send } from 'lucide-react';
import DataTable from '../../../../../shared/components/DataTable.jsx';
import Badge from '../../../../../shared/components/Badge.jsx';
import CandidateStatusBadge from '../../../components/CandidateStatusBadge.jsx';
import EmptyState from '../../../components/EmptyState.jsx';
import { getSelectionStatusMeta } from '../../../constants/selectionStatus.js';
import { formatDate } from '../../../utils/formatDate.js';
import { getInitials } from '../../../utils/formatCandidateData.js';

/**
 * Final selection table. It shows the interview outcome and the HR decision
 * for the candidates that completed the interview stage.
 */
export default function SelectionTable({ rows, loading, onReview, onSubmitForApproval }) {
  const columns = [
    {
      key: 'candidate',
      header: 'Candidate',
      render: (row) => (
        <div className="cell-user">
          <div className="avatar">{getInitials(row.candidate.fullName)}</div>
          <div className="cell-user__text">
            <div className="cell-user__name">{row.candidate.fullName}</div>
            <div className="cell-user__sub">{row.application.applicationId}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'position',
      header: 'Position',
      render: (row) => row.job.title,
    },
    {
      key: 'interviews',
      header: 'Interviews',
      render: (row) => (
        <span>
          {row.interviews.length} round{row.interviews.length === 1 ? '' : 's'}
        </span>
      ),
    },
    {
      key: 'rating',
      header: 'Avg rating',
      render: (row) =>
        row.averageRating ? (
          <span className="cell-strong">{row.averageRating}/5</span>
        ) : (
          <span className="cell-muted">Not rated</span>
        ),
    },
    {
      key: 'screening',
      header: 'Screening',
      render: (row) =>
        Number.isFinite(Number(row.screening?.score)) ? (
          <span className="cell-strong">{row.screening.score}%</span>
        ) : (
          <span className="cell-muted">Not scored</span>
        ),
    },
    {
      key: 'decision',
      header: 'HR decision',
      render: (row) => {
        if (!row.selection) {
          return <Badge variant="grey">Not decided</Badge>;
        }
        const meta = getSelectionStatusMeta(row.selection.decision);
        return (
          <Badge variant={meta.variant} dot>
            {meta.label}
          </Badge>
        );
      },
    },
    {
      key: 'approval',
      header: 'Approval',
      render: (row) =>
        row.approval ? (
          <CandidateStatusBadge status={row.approval.status} kind="approval" />
        ) : (
          <span className="cell-muted">Not submitted</span>
        ),
    },
    {
      key: 'decidedAt',
      header: 'Decided on',
      render: (row) => formatDate(row.selection?.decidedAt),
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
            aria-label={`Review evaluation of ${row.candidate.fullName}`}
            title="Review evaluation"
          >
            <Eye size={16} />
          </button>
          {row.selection?.decision === 'selected' && !row.selection?.submittedForApproval && (
            <button
              type="button"
              className="btn btn--ghost btn--icon"
              onClick={() => onSubmitForApproval(row)}
              aria-label={`Submit ${row.candidate.fullName} for approval`}
              title="Submit for admin approval"
            >
              <Send size={16} />
            </button>
          )}
          {row.selection?.submittedForApproval && (
            <CheckCircle2 size={16} className="ta-icon-success" aria-hidden="true" />
          )}
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
      ariaLabel="Final selection candidates"
      empty={
        <EmptyState
          icon={CheckCircle2}
          title="No candidates in the final selection stage"
          description="Candidates appear here once their interview rounds are completed."
        />
      }
    />
  );
}
