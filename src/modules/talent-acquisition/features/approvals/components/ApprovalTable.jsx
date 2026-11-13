import { Eye, ShieldCheck } from 'lucide-react';
import DataTable from '../../../../../shared/components/DataTable.jsx';
import CandidateStatusBadge from '../../../components/CandidateStatusBadge.jsx';
import EmptyState from '../../../components/EmptyState.jsx';
import { formatDate } from '../../../utils/formatDate.js';
import { getInitials } from '../../../utils/formatCandidateData.js';

/**
 * Admin approval table with the approval audit information.
 */
export default function ApprovalTable({ rows, loading, onReview }) {
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
      render: (row) => (
        <div>
          <div>{row.job.title}</div>
          <div className="cell-muted">{row.job.department}</div>
        </div>
      ),
    },
    {
      key: 'recommendation',
      header: 'HR recommendation',
      render: (row) => (
        <div>
          <div>{row.approval.hrRecommendation === 'selected' ? 'Recommended' : 'On hold'}</div>
          <div className="cell-muted">{row.approval.hrRemarks || '—'}</div>
        </div>
      ),
    },
    {
      key: 'interviews',
      header: 'Interview summary',
      render: (row) => {
        const rated = row.interviews.filter((interview) => interview.feedback);
        if (rated.length === 0) return <span className="cell-muted">No feedback</span>;
        const average =
          rated.reduce((total, interview) => total + interview.feedback.overallRating, 0) /
          rated.length;
        return (
          <div>
            <span className="cell-strong">{average.toFixed(1)}/5</span>
            <div className="cell-muted">
              {rated.length} of {row.interviews.length} rounds evaluated
            </div>
          </div>
        );
      },
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
      key: 'submittedAt',
      header: 'Submitted on',
      render: (row) => formatDate(row.approval.submittedAt),
    },
    {
      key: 'status',
      header: 'Approval',
      render: (row) => <CandidateStatusBadge status={row.approval.status} kind="approval" />,
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
            aria-label={`Review approval of ${row.candidate.fullName}`}
            title="Review approval"
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
      ariaLabel="Admin approvals"
      empty={
        <EmptyState
          icon={ShieldCheck}
          title="No approval records in this view"
          description="Hiring recommendations submitted by HR appear here for the administrator to decide."
        />
      }
    />
  );
}
