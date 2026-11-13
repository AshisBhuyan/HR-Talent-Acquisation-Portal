import { CalendarClock, ClipboardList, Mail, Pencil, RotateCcw, XCircle } from 'lucide-react';
import DataTable from '../../../../../shared/components/DataTable.jsx';
import Badge from '../../../../../shared/components/Badge.jsx';
import EmptyState from '../../../components/EmptyState.jsx';
import { formatDateTime, formatRelativeDay } from '../../../utils/formatDate.js';
import { getInitials } from '../../../utils/formatCandidateData.js';
import { getRoundLabel } from '../../../constants/interviewStatus.js';

/**
 * Interview records table with the schedule, edit and feedback actions.
 */
export default function InterviewTable({
  rows,
  loading,
  onEdit,
  onReschedule,
  onCancel,
  onFeedback,
  onInvite,
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
            <div className="cell-user__sub">{row.job.title}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'round',
      header: 'Round',
      render: (row) => getRoundLabel(row.interview.round),
    },
    {
      key: 'interviewer',
      header: 'Interviewer',
      render: (row) => row.interview.interviewer,
    },
    {
      key: 'scheduledAt',
      header: 'Scheduled',
      render: (row) => (
        <div>
          <div>{formatDateTime(row.interview.scheduledAt)}</div>
          <div className="cell-muted">{formatRelativeDay(row.interview.scheduledAt)}</div>
        </div>
      ),
    },
    {
      key: 'mode',
      header: 'Mode',
      render: (row) => (
        <div>
          <Badge variant={row.interview.mode === 'online' ? 'blue' : 'grey'}>
            {row.interview.mode === 'online' ? 'Online' : 'Offline'}
          </Badge>
          {row.interview.mode === 'offline' && row.interview.location && (
            <div className="cell-muted">{row.interview.location}</div>
          )}
        </div>
      ),
    },
    {
      key: 'feedback',
      header: 'Feedback',
      render: (row) =>
        row.interview.feedback ? (
          <div>
            <span className="cell-strong">
              {row.interview.feedback.overallRating}/5
            </span>
            <div className="cell-muted">
              {row.interview.feedback.recommendation.replace(/_/g, ' ')}
            </div>
          </div>
        ) : (
          <span className="cell-muted">Not recorded</span>
        ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <div className="cell-actions">
          {row.interview.status !== 'cancelled' && onInvite && (
            <button
              type="button"
              className="btn btn--ghost btn--icon"
              onClick={() => onInvite(row)}
              aria-label={`Send interview invitation to ${row.candidate.fullName}`}
              title="Send Interview Invitation"
            >
              <Mail size={16} />
            </button>
          )}
          {row.interview.status !== 'completed' && row.interview.status !== 'cancelled' && (
            <>
              <button
                type="button"
                className="btn btn--ghost btn--icon"
                onClick={() => onEdit(row)}
                aria-label={`Edit interview of ${row.candidate.fullName}`}
                title="Edit interview"
              >
                <Pencil size={16} />
              </button>
              <button
                type="button"
                className="btn btn--ghost btn--icon"
                onClick={() => onReschedule(row)}
                aria-label={`Reschedule interview of ${row.candidate.fullName}`}
                title="Reschedule interview"
              >
                <RotateCcw size={16} />
              </button>
            </>
          )}
          {row.interview.status !== 'completed' && row.interview.status !== 'cancelled' && (
            <button
              type="button"
                className="btn btn--danger-ghost btn--icon"
              onClick={() => onCancel(row)}
              aria-label={`Cancel interview of ${row.candidate.fullName}`}
              title="Cancel interview"
            >
              <XCircle size={16} />
            </button>
          )}
          {row.interview.status !== 'cancelled' && (
            <button
              type="button"
              className="btn btn--ghost btn--icon"
              onClick={() => onFeedback(row)}
              aria-label={`Record feedback for ${row.candidate.fullName}`}
              title="Record feedback"
            >
              <ClipboardList size={16} />
            </button>
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
      ariaLabel="Interview records"
      empty={
        <EmptyState
          icon={CalendarClock}
          title="No interviews in this view"
          description="Schedule an interview from the shortlisted candidates to build the interview calendar."
        />
      }
    />
  );
}
