import { CalendarPlus, PauseCircle, UserCheck, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DataTable from '../../../../../shared/components/DataTable.jsx';
import Badge from '../../../../../shared/components/Badge.jsx';
import EmptyState from '../../../components/EmptyState.jsx';
import { getShortlistStatusMeta } from '../services/shortlistingService.js';
import { formatDate } from '../../../utils/formatDate.js';
import { getInitials } from '../../../utils/formatCandidateData.js';
import { ROUTES } from '../../../../../app/routeConfig.js';

/**
 * Shortlist table with the shortlisting actions.
 */
export default function ShortlistTable({ rows, loading, onHold, onReject }) {
  const navigate = useNavigate();

  const columns = [
    {
      key: 'candidate',
      header: 'Candidate',
      render: (row) => (
        <div className="cell-user">
          <div className="avatar">{getInitials(row.candidate.fullName)}</div>
          <div className="cell-user__text">
            <div className="cell-user__name">{row.candidate.fullName}</div>
            <div className="cell-user__sub">{row.candidate.candidateId}</div>
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
          <div className="cell-muted">{row.application.applicationId}</div>
        </div>
      ),
    },
    {
      key: 'screening',
      header: 'Screening result',
      render: (row) =>
        Number.isFinite(Number(row.screening?.score)) ? (
          <span className="cell-strong">{row.screening.score}%</span>
        ) : (
          <span className="cell-muted">Not scored</span>
        ),
    },
    {
      key: 'remarks',
      header: 'HR remarks',
      render: (row) => row.shortlisting.remarks || <span className="cell-muted">—</span>,
    },
    {
      key: 'shortlistedAt',
      header: 'Shortlisted on',
      render: (row) => formatDate(row.shortlisting.shortlistedAt),
    },
    {
      key: 'interviewStatus',
      header: 'Interview',
      render: (row) => (
        <Badge
          variant={
            row.interviewStatus === 'scheduled'
              ? 'blue'
              : row.interviewStatus === 'completed'
                ? 'green'
                : 'grey'
          }
        >
          {row.interviewStatus === 'scheduled'
            ? 'Scheduled'
            : row.interviewStatus === 'completed'
              ? 'Completed'
              : row.interviewStatus}
        </Badge>
      ),
    },
    {
      key: 'status',
      header: 'Shortlist',
      render: (row) => {
        const meta = getShortlistStatusMeta(row.shortlisting.status);
        return (
          <Badge variant={meta.variant} dot>
            {meta.label}
          </Badge>
        );
      },
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
            onClick={() => navigate(ROUTES.TALENT_INTERVIEWS)}
            aria-label={`Schedule an interview for ${row.candidate.fullName}`}
            title="Schedule interview"
          >
            <CalendarPlus size={16} />
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--icon"
            onClick={() => onHold(row)}
            aria-label={`Put ${row.candidate.fullName} on hold`}
            title="Put on hold"
          >
            <PauseCircle size={16} />
          </button>
          <button
            type="button"
            className="btn btn--danger-ghost btn--icon"
            onClick={() => onReject(row)}
            aria-label={`Reject ${row.candidate.fullName}`}
            title="Reject candidate"
          >
            <XCircle size={16} />
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
      ariaLabel="Shortlisted candidates"
      empty={
        <EmptyState
          icon={UserCheck}
          title="No shortlist records in this view"
          description="Candidates appear here once their CV screening is completed and they are shortlisted."
        />
      }
    />
  );
}
