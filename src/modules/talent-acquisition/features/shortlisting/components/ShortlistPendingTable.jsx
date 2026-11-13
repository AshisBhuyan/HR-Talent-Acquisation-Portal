import { Eye, UserCheck, UserRound } from 'lucide-react';
import DataTable from '../../../../../shared/components/DataTable.jsx';
import EmptyState from '../../../components/EmptyState.jsx';
import { formatDate } from '../../../utils/formatDate.js';
import { getInitials } from '../../../utils/formatCandidateData.js';

/**
 * Candidates that passed the CV screening and wait for a shortlisting
 * decision.
 */
export default function ShortlistPendingTable({
  rows,
  loading,
  onShortlist,
  onViewCandidate,
  onViewScreening,
}) {
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
      key: 'experience',
      header: 'Experience',
      render: (row) => `${row.candidate.totalExperienceYears ?? 0} yrs`,
    },
    {
      key: 'aiRank',
      header: 'AI Rank',
      align: 'right',
      render: (row) =>
        row.screening?.aiRank ? (
          <span className="cell-strong">#{row.screening.aiRank}</span>
        ) : (
          <span className="cell-muted">—</span>
        ),
    },
    {
      key: 'score',
      header: 'AI Score',
      align: 'right',
      render: (row) =>
        Number.isFinite(Number(row.screening?.score)) ? (
          <span className="cell-strong">{row.screening.score}%</span>
        ) : (
          <span className="cell-muted">Awaiting AI Result</span>
        ),
    },
    {
      key: 'screening',
      header: 'Screening result',
      render: (row) => (
        <div>
          <div>{String(row.screening?.status || 'passed').replace(/_/g, ' ')}</div>
          <div className="cell-muted">{row.screening?.hrRemarks || '—'}</div>
        </div>
      ),
    },
    {
      key: 'completed',
      header: 'Screening completed',
      render: (row) => formatDate(row.screening?.reviewedAt || row.screening?.updatedAt),
    },
    {
      key: 'applied',
      header: 'Applied',
      render: (row) => formatDate(row.application.appliedDate),
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
              onClick={() => onViewCandidate(row)}
              aria-label={`View candidate ${row.candidate.fullName}`}
              title="View candidate profile"
            >
              <UserRound size={16} />
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--icon"
              onClick={() => onViewScreening(row)}
              aria-label={`View screening results of ${row.candidate.fullName}`}
              title="View screening results"
            >
              <Eye size={16} />
            </button>
            <button
            type="button"
            className="btn btn--outline btn--sm"
            onClick={() => onShortlist(row)}
            aria-label={`Shortlist ${row.candidate.fullName}`}
          >
            <UserCheck size={14} aria-hidden="true" /> Shortlist
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
      ariaLabel="Candidates awaiting shortlisting"
      empty={
        <EmptyState
          icon={UserCheck}
          title="No candidate is waiting for a shortlisting decision"
          description="Candidates that pass the CV screening appear here for the shortlisting decision."
        />
      }
    />
  );
}
