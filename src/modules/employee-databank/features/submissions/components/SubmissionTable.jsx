import { FileText } from 'lucide-react';
import DataTable from '../../../../../shared/components/DataTable.jsx';
import Badge from '../../../../../shared/components/Badge.jsx';
import EmptyState from '../../../components/EmptyState.jsx';
import SubmissionActions from './SubmissionActions.jsx';
import {
  CV_STATUS_META,
  SUBMISSION_STATUS_META,
} from '../../../constants/employeeStatus.js';
import { formatDateTime } from '../../../utils/formatDate.js';
import { getInitials } from '../../../utils/formatEmployeeData.js';

export default function SubmissionTable({
  submissions,
  loading,
  onView,
  onValidate,
  onReject,
  validatingId,
  rejectingId,
}) {
  const columns = [
    {
      key: 'employee',
      header: 'Employee',
      render: (submission) => (
        <div className="cell-user">
          <div className="avatar">
            {submission.data?.profilePhoto ? (
              <img src={submission.data.profilePhoto} alt="" />
            ) : (
              getInitials(submission.employeeName)
            )}
          </div>
          <div className="cell-user__text">
            <div className="cell-user__name">{submission.employeeName}</div>
            <div className="cell-user__sub">{submission.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'submittedAt',
      header: 'Submission Date',
      render: (submission) => formatDateTime(submission.submittedAt),
    },
    {
      key: 'completion',
      header: 'Profile Completion',
      render: (submission) => (
        <div className="mini-progress">
          <div className="mini-progress__track">
            <div
              className="mini-progress__bar"
              style={{ width: `${submission.profileCompletion}%` }}
            />
          </div>
          <span>{submission.profileCompletion}%</span>
        </div>
      ),
    },
    {
      key: 'cv',
      header: 'CV Status',
      render: (submission) => {
        const meta = submission.cvStatus === 'provided' ? CV_STATUS_META.provided : CV_STATUS_META.missing;
        return <Badge variant={meta.variant}>{meta.label}</Badge>;
      },
    },
    {
      key: 'status',
      header: 'Submission Status',
      render: (submission) => {
        const meta = SUBMISSION_STATUS_META[submission.status] || SUBMISSION_STATUS_META.pending;
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
      render: (submission) => (
        <div className="cell-actions">
          <SubmissionActions
            submission={submission}
            onView={onView}
            onValidate={onValidate}
            onReject={onReject}
            validating={validatingId === submission.id}
            rejecting={rejectingId === submission.id}
            compact
          />
        </div>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={submissions}
      loading={loading}
      ariaLabel="Employee self-service submissions"
      footer={
        <>
          <span>
            Showing <strong>{submissions.length}</strong> submission
            {submissions.length === 1 ? '' : 's'}
          </span>
          <span className="cell-muted">Validate to create the current employee record</span>
        </>
      }
      empty={
        <EmptyState
          icon={FileText}
          title="No submissions match this view"
          description="Employee self-service submissions will appear here after they complete their profile."
        />
      }
    />
  );
}
