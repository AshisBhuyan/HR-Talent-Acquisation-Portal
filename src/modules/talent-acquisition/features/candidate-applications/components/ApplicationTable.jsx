import {
  CalendarPlus,
  ClipboardCheck,
  Eye,
  FileSearch,
  MessageSquarePlus,
  MoveRight,
  PauseCircle,
  PlayCircle,
  XCircle,
} from 'lucide-react';
import DataTable from '../../../../../shared/components/DataTable.jsx';
import CandidateStatusBadge from '../../../components/CandidateStatusBadge.jsx';
import EmptyState from '../../../components/EmptyState.jsx';
import { getInitials, formatExperienceYears } from '../../../utils/formatCandidateData.js';
import {
  APPLICATION_STATUS,
  canTransitionApplication,
} from '../../../constants/applicationStatus.js';

const MIN_WIDTH = 1480;

function ProfileButton({ name, onActivate, ariaLabel }) {
  return (
    <button
      type="button"
      className="ta-link cell-user__name"
      onClick={onActivate}
      aria-label={ariaLabel}
    >
      {name}
    </button>
  );
}

/**
 * Candidate application table. Every application is listed; the actions are
 * limited to the state of the application and the workflow rules.
 */
export default function ApplicationTable({
  rows,
  loading,
  pagination,
  onOpenProfile,
  onViewDetails,
  onPreviewCv,
  onMoveToScreening,
  onViewScreening,
  onScheduleInterview,
  onHold,
  onResume,
  onAddRemark,
  onReject,
  onChangePage,
}) {
  const columns = [
    {
      key: 'candidate',
      header: 'Candidate Name',
      render: (row) => (
        <div className="cell-user">
          <div className="avatar">{getInitials(row.candidateName)}</div>
          <div className="cell-user__text">
            <ProfileButton
              name={row.candidateName}
              onActivate={() => onOpenProfile(row)}
              ariaLabel={`Open the profile of ${row.candidateName}`}
            />
          </div>
        </div>
      ),
    },
    {
      key: 'candidateId',
      header: 'Candidate ID',
      render: (row) => <span className="cell-strong">{row.candidateId}</span>,
    },
    {
      key: 'applicationId',
      header: 'Application ID',
      render: (row) => <span className="cell-strong">{row.applicationId}</span>,
    },
    {
      key: 'candidateEmail',
      header: 'Email',
      render: (row) => row.candidateEmail || '—',
    },
    {
      key: 'candidatePhone',
      header: 'Phone',
      render: (row) => row.candidatePhone || '—',
    },
    {
      key: 'jobTitle',
      header: 'Position',
      render: (row) => (
        <div>
          <div>{row.jobTitle}</div>
          <div className="cell-muted">{row.jobDepartment}</div>
        </div>
      ),
    },
    {
      key: 'experience',
      header: 'Experience',
      render: (row) => formatExperienceYears(row.candidateExperienceYears),
    },
    {
      key: 'candidateLocation',
      header: 'Location',
      render: (row) => row.candidateLocation || '—',
    },
    {
      key: 'status',
      header: 'Application Status',
      render: (row) => <CandidateStatusBadge status={row.status} />,
    },

    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) => {
        const onHold = row.status === APPLICATION_STATUS.ON_HOLD;
        const isApplied = row.status === APPLICATION_STATUS.APPLIED;
        const isUnderScreening = row.status === APPLICATION_STATUS.UNDER_SCREENING;
        const isShortlisted = row.status === APPLICATION_STATUS.SHORTLISTED;
        const canHold = canTransitionApplication(row.status, APPLICATION_STATUS.ON_HOLD);
        const canReject = canTransitionApplication(row.status, APPLICATION_STATUS.REJECTED);

        return (
          <div className="cell-actions">
            <button
              type="button"
              className="btn btn--ghost btn--icon"
              onClick={() => onViewDetails(row)}
              aria-label={`View details of the application of ${row.candidateName}`}
              title="View details"
            >
              <Eye size={16} />
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--icon"
              onClick={() => onPreviewCv(row)}
              aria-label={`Preview CV of ${row.candidateName}`}
              title="Preview CV"
            >
              <FileSearch size={16} />
            </button>
            {!['rejected', 'selected'].includes(row.status) && (
              <button
                type="button"
                className="btn btn--ghost btn--icon"
                onClick={() => onAddRemark(row)}
                aria-label={`Add a remark to the application of ${row.candidateName}`}
                title="Add HR remark"
              >
                <MessageSquarePlus size={16} />
              </button>
            )}
            {isApplied && (
              <button
                type="button"
                className="btn btn--ghost btn--icon"
                onClick={() => onMoveToScreening(row)}
                aria-label={`Move ${row.candidateName} to screening`}
                title="Move to screening"
              >
                <MoveRight size={16} />
              </button>
            )}
            {isUnderScreening && (
              <button
                type="button"
                className="btn btn--ghost btn--icon"
                onClick={() => onViewScreening(row)}
                aria-label={`Open the screening queue for ${row.candidateName}`}
                title="View screening"
              >
                <ClipboardCheck size={16} />
              </button>
            )}
            {isShortlisted && (
              <button
                type="button"
                className="btn btn--ghost btn--icon"
                onClick={() => onScheduleInterview(row)}
                aria-label={`Schedule an interview for ${row.candidateName}`}
                title="Schedule interview"
              >
                <CalendarPlus size={16} />
              </button>
            )}
            {canHold && (
              <button
                type="button"
                className="btn btn--ghost btn--icon"
                onClick={() => onHold(row)}
                aria-label={`Put ${row.candidateName} on hold`}
                title="Put on hold"
              >
                <PauseCircle size={16} />
              </button>
            )}
            {onHold && (
              <button
                type="button"
                className="btn btn--ghost btn--icon"
                onClick={() => onResume(row)}
                aria-label={`Resume the application of ${row.candidateName}`}
                title="Resume application"
              >
                <PlayCircle size={16} />
              </button>
            )}
            {canReject && (
              <button
                type="button"
                className="btn btn--danger-ghost btn--icon"
                onClick={() => onReject(row)}
                aria-label={`Reject application of ${row.candidateName}`}
                title="Reject application"
              >
                <XCircle size={16} />
              </button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      keyField="applicationId"
      loading={loading}
      minWidth={MIN_WIDTH}
      ariaLabel="Candidate applications"
      footer={
        <>
          <span>
            Showing <strong>{pagination.from}</strong>–<strong>{pagination.to}</strong> of{' '}
            <strong>{pagination.total}</strong> application
            {pagination.total === 1 ? '' : 's'}
          </span>
          <span className="cell-muted">Applied date · newest first</span>
          <div className="ta-pagination">
            <button
              type="button"
              className="btn btn--outline btn--sm"
              onClick={() => onChangePage(pagination.page - 1)}
              disabled={pagination.page <= 1}
            >
              Previous
            </button>
            <span className="ta-pagination__status">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              type="button"
              className="btn btn--outline btn--sm"
              onClick={() => onChangePage(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
            >
              Next
            </button>
          </div>
        </>
      }
      empty={
        <EmptyState
          icon={FileSearch}
          title="No applications match your filters"
          description="Adjust the search terms or clear the filters to see every application received through the Career Portal."
        />
      }
    />
  );
}
