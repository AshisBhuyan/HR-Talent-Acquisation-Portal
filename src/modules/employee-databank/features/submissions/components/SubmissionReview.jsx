import { CalendarClock, CheckCircle2, Mail, XCircle } from 'lucide-react';
import Modal from '../../../../../shared/components/Modal.jsx';
import Badge from '../../../../../shared/components/Badge.jsx';
import Button from '../../../../../shared/components/Button.jsx';
import EmployeeDetails from '../../employees/components/EmployeeDetails.jsx';
import CVFileInfo from '../../cv-management/components/CVFileInfo.jsx';
import SubmissionActions from './SubmissionActions.jsx';
import {
  SUBMISSION_STATUS,
  SUBMISSION_STATUS_META,
} from '../../../constants/employeeStatus.js';
import { formatDateTime } from '../../../utils/formatDate.js';
import { getInitials } from '../../../utils/formatEmployeeData.js';

export default function SubmissionReview({
  open,
  submission,
  onClose,
  onValidate,
  onReject,
  validating = false,
  rejecting = false,
}) {
  if (!submission) return null;

  const data = submission.data || {};
  const meta = SUBMISSION_STATUS_META[submission.status] || SUBMISSION_STATUS_META.pending;
  const isPending = submission.status === SUBMISSION_STATUS.PENDING;
  const isValidated = submission.status === SUBMISSION_STATUS.VALIDATED;
  const isRejected = submission.status === SUBMISSION_STATUS.REJECTED;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Review Submission"
      subtitle={`${submission.employeeName} · ${submission.email}`}
      size="xl"
      footer={
        <>
          <span className="modal__footer-note">
            Validation creates or updates one employee record only.
          </span>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {isPending && (
            <SubmissionActions
              submission={submission}
              onValidate={onValidate}
              onReject={onReject}
              validating={validating}
              rejecting={rejecting}
              showView={false}
            />
          )}
        </>
      }
    >
      <div className="submission-summary">
        <div className="avatar avatar--lg">
          {data.profilePhoto ? <img src={data.profilePhoto} alt="" /> : getInitials(submission.employeeName)}
        </div>
        <div className="submission-summary__identity">
          <h3 className="submission-summary__name">{submission.employeeName}</h3>
          <div className="submission-summary__meta">
            <span>
              <Mail size={13} aria-hidden="true" />
              {submission.email}
            </span>
            <span>
              <CalendarClock size={13} aria-hidden="true" />
              Submitted {formatDateTime(submission.submittedAt)}
            </span>
          </div>
          <div className="submission-summary__badges">
            <Badge variant={meta.variant} dot>
              {meta.label}
            </Badge>
            <Badge variant={submission.cvStatus === 'provided' ? 'green' : 'grey'}>
              {submission.cvStatus === 'provided' ? 'CV attached' : 'No CV'}
            </Badge>
          </div>
        </div>
        <div className="submission-summary__completion">
          <div className="submission-summary__completion-value">
            {submission.profileCompletion}%
          </div>
          <div className="submission-summary__completion-label">Profile completion</div>
          <div className="mini-progress">
            <div className="mini-progress__track">
              <div
                className="mini-progress__bar"
                style={{ width: `${submission.profileCompletion}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {isValidated && (
        <div className="notice notice--success" style={{ marginTop: '1rem' }}>
          <span className="notice__icon">
            <CheckCircle2 size={18} aria-hidden="true" />
          </span>
          <div className="notice__body">
            <div className="notice__title">Submission validated</div>
            Validated {formatDateTime(submission.validatedAt)}. The employee record is available in
            Current Employees. Re-validating is disabled to prevent duplicates.
          </div>
        </div>
      )}

      {isRejected && (
        <div className="notice notice--error" style={{ marginTop: '1rem' }}>
          <span className="notice__icon">
            <XCircle size={18} aria-hidden="true" />
          </span>
          <div className="notice__body">
            <div className="notice__title">Submission rejected</div>
            Rejected {formatDateTime(submission.rejectedAt)}. The invitation has been reopened so
            the employee can correct and resubmit their profile.
            {submission.rejectionReason ? (
              <div style={{ marginTop: '0.35rem' }}>
                <strong>Reason:</strong> {submission.rejectionReason}
              </div>
            ) : null}
          </div>
        </div>
      )}

      <div className="card" style={{ marginTop: '1rem' }}>
        <div className="card__body">
          <EmployeeDetails employee={data} />
        </div>
      </div>

      <div className="card" style={{ marginTop: '1rem' }}>
        <div className="card__header">
          <div>
            <div className="card__title">Submitted CV</div>
            <div className="card__subtitle">Preview and download the document attached to this submission.</div>
          </div>
        </div>
        <div className="card__body">
          {data.cv ? (
            <CVFileInfo cv={data.cv} showReplace={false} showRemove={false} />
          ) : (
            <div className="notice notice--warning">
              <span className="notice__icon">
                <CalendarClock size={18} aria-hidden="true" />
              </span>
              <div className="notice__body">
                No CV was attached to this submission. Consider requesting one before validating.
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
